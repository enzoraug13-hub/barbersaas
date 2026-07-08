using BarberSaaS.Application.Common;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.Auth.Commands;

/// <param name="PersonType">"PF" (CPF) ou "PJ" (CNPJ).</param>
/// <param name="Document">CPF ou CNPJ — aceita com ou sem máscara.</param>
public record RegisterTenantCommand(
    string BusinessName,
    string OwnerName,
    string Email,
    string Password,
    string Phone,
    string PersonType,
    string Document) : IRequest<RegisterTenantResult>;

// Quando RequiresEmailConfirmation=true os tokens vêm nulos: a conta fica pendente
// até o usuário clicar no link enviado por e-mail (sem auto-login).
public record RegisterTenantResult(
    Guid TenantId, string Slug, string? AccessToken, string? RefreshToken, UserDto User,
    bool RequiresEmailConfirmation = false);

public class RegisterTenantValidator : AbstractValidator<RegisterTenantCommand>
{
    public RegisterTenantValidator()
    {
        RuleFor(x => x.BusinessName).NotEmpty().WithMessage("Informe o nome da barbearia.").MaximumLength(200);
        RuleFor(x => x.OwnerName).NotEmpty().WithMessage("Informe o seu nome.").MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().WithMessage("Informe o e-mail.").EmailAddress().WithMessage("E-mail inválido.");
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Informe a senha.")
            .MinimumLength(8).WithMessage("A senha deve ter no mínimo 8 caracteres.");
        RuleFor(x => x.Phone).NotEmpty().WithMessage("Informe o WhatsApp.");
        RuleFor(x => x.PersonType)
            .Must(t => t is "PF" or "PJ").WithMessage("Escolha Pessoa Física ou Pessoa Jurídica.");
        RuleFor(x => x.Document)
            .NotEmpty().WithMessage("Informe o CPF ou CNPJ.");
        RuleFor(x => x.Document)
            .Must(BrDocuments.IsValidCpf).WithMessage("CPF inválido. Confira os números digitados.")
            .When(x => x.PersonType == "PF");
        RuleFor(x => x.Document)
            .Must(BrDocuments.IsValidCnpj).WithMessage("CNPJ inválido. Confira os números digitados.")
            .When(x => x.PersonType == "PJ");
    }
}

public class RegisterTenantHandler : IRequestHandler<RegisterTenantCommand, RegisterTenantResult>
{
    private readonly ITenantRepository _tenants;
    private readonly IUserRepository _users;
    private readonly IPlanRepository _plans;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtService _jwt;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IAuthOptions _authOptions;
    private readonly IEmailService _email;
    private readonly ICnpjLookupService _cnpjLookup;
    private readonly ILogger<RegisterTenantHandler> _logger;

    public RegisterTenantHandler(
        ITenantRepository tenants, IUserRepository users, IPlanRepository plans,
        IPasswordHasher hasher, IJwtService jwt, IRefreshTokenRepository refreshTokens,
        IAuthOptions authOptions, IEmailService email, ICnpjLookupService cnpjLookup,
        ILogger<RegisterTenantHandler> logger)
    {
        _tenants = tenants; _users = users; _plans = plans;
        _hasher = hasher; _jwt = jwt; _refreshTokens = refreshTokens;
        _authOptions = authOptions; _email = email; _cnpjLookup = cnpjLookup; _logger = logger;
    }

    public async Task<RegisterTenantResult> Handle(RegisterTenantCommand request, CancellationToken ct)
    {
        var document = BrDocuments.OnlyDigits(request.Document);

        // PJ: confirma na Receita. Só bloqueia CNPJ inexistente (404) ou BAIXADO;
        // situação irregular/suspensa passa. Falha da API (null) = fail-open, só loga.
        string? legalName = null;
        if (request.PersonType == "PJ")
        {
            var lookup = await _cnpjLookup.LookupAsync(document, ct);
            if (lookup is null)
            {
                _logger.LogWarning("Cadastro PJ seguiu sem validação online do CNPJ {Cnpj} (BrasilAPI indisponível)", document);
            }
            else if (!lookup.Found)
            {
                throw new BarberSaaS.Domain.Exceptions.DomainException("CNPJ não encontrado na Receita Federal. Confira os números digitados.");
            }
            else if (string.Equals(lookup.Situacao, "BAIXADA", StringComparison.OrdinalIgnoreCase))
            {
                throw new BarberSaaS.Domain.Exceptions.DomainException("Este CNPJ consta como baixado (encerrado) na Receita Federal.");
            }
            else
            {
                legalName = lookup.RazaoSocial;
            }
        }

        var slug = GenerateSlug(request.BusinessName);
        var slugExists = await _tenants.SlugExistsAsync(slug, ct);
        if (slugExists) slug = $"{slug}-{Guid.NewGuid().ToString()[..4]}";

        // Resposta neutra quando o e-mail já tem conta (mesmo padrão do resend-confirmation):
        // devolve o shape de "cadastro pendente de confirmação" — indistinguível de um
        // cadastro real — em vez de anunciar "este e-mail já está cadastrado", que permitia
        // enumerar quais e-mails têm conta. O dono verdadeiro recebe um e-mail avisando
        // (se foi ele mesmo tentando de novo, entende na hora; se foi um terceiro, fica sabendo).
        var emailExists = await _users.EmailExistsAsync(request.Email, ct);
        if (emailExists)
        {
            // BCrypt é o custo dominante do caminho real — roda o hash mesmo sem usar
            // pra não entregar a existência da conta pelo tempo de resposta.
            _hasher.Hash(request.Password);
            _logger.LogInformation("Registro com e-mail já cadastrado: {Email} — resposta neutra enviada", request.Email);
            try
            {
                await _email.SendAsync(request.Email,
                    AccountExistsEmail.Subject,
                    AccountExistsEmail.BuildHtml(_authOptions.FrontendUrl), ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Falha ao enviar aviso de conta existente para {Email}", request.Email);
            }

            var ghostTenantId = Guid.NewGuid();
            return new RegisterTenantResult(ghostTenantId, slug, null, null,
                new UserDto(Guid.NewGuid(), request.OwnerName, request.Email, "owner", ghostTenantId),
                RequiresEmailConfirmation: true);
        }

        var freePlan = await _plans.GetBySlugAsync("gratuito", ct)
            ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Plano gratuito não encontrado.");

        var tenant = new Tenant { Name = request.BusinessName, Slug = slug };
        var settings = new TenantSettings
        {
            TenantId     = tenant.Id,
            BusinessName = request.BusinessName,
            Phone        = request.Phone,
            PublicSlug   = slug,
            PersonType   = request.PersonType,
            Document     = document,
            LegalName    = legalName
        };
        tenant.Settings = settings;

        var trialEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14));
        var subscription = new Subscription
        {
            TenantId           = tenant.Id,
            PlanId             = freePlan.Id,
            Status             = SubscriptionStatus.Trial,
            CurrentPeriodStart = DateOnly.FromDateTime(DateTime.UtcNow),
            CurrentPeriodEnd   = trialEnd,
            TrialEndsAt        = trialEnd
        };
        tenant.Subscription = subscription;

        var requireConfirmation = _authOptions.RequireEmailConfirmation;

        var owner = new User
        {
            TenantId     = tenant.Id,
            Name         = request.OwnerName,
            Email        = request.Email,
            PasswordHash = _hasher.Hash(request.Password),
            Role         = UserRole.Owner,
            IsActive     = true,
            // Com a flag ligada a conta nasce pendente e só ativa pelo link do e-mail.
            EmailVerified = !requireConfirmation,
            EmailVerifyToken = requireConfirmation ? GenerateVerifyToken() : null
        };

        await _tenants.AddAsync(tenant, ct);
        await _users.AddAsync(owner, ct);

        var userDto = new UserDto(owner.Id, owner.Name, owner.Email, "owner", tenant.Id);

        if (requireConfirmation)
        {
            // Falha no envio não desfaz o cadastro — o usuário pode pedir reenvio depois.
            try
            {
                var link = $"{_authOptions.FrontendUrl}/confirmar-email?token={owner.EmailVerifyToken}";
                await _email.SendAsync(owner.Email,
                    ConfirmationEmail.Subject,
                    ConfirmationEmail.BuildHtml(owner.Name, request.BusinessName, link), ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Falha ao enviar e-mail de confirmação para {Email}", owner.Email);
            }

            return new RegisterTenantResult(tenant.Id, slug, null, null, userDto, RequiresEmailConfirmation: true);
        }

        var tokens = _jwt.GenerateTokens(owner.Id, owner.Email, owner.Name, "owner", tenant.Id);
        await _refreshTokens.AddAsync(new RefreshToken
        {
            UserId    = owner.Id,
            TenantId  = tenant.Id,
            TokenHash = LoginCommandHandler.HashToken(tokens.RefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        }, ct);

        return new RegisterTenantResult(tenant.Id, slug, tokens.AccessToken, tokens.RefreshToken, userDto);
    }

    internal static string GenerateVerifyToken()
    {
        var bytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(32);
        return Convert.ToHexString(bytes).ToLower();
    }

    private static string GenerateSlug(string name) =>
        System.Text.RegularExpressions.Regex.Replace(
            name.ToLower().Normalize(System.Text.NormalizationForm.FormD),
            @"[^a-z0-9\s-]", "").Trim().Replace(" ", "-");
}

/// <summary>
/// E-mail enviado ao dono real quando alguém tenta se cadastrar com um e-mail que já
/// tem conta — parte da resposta neutra anti-enumeração do registro.
/// </summary>
public static class AccountExistsEmail
{
    public const string Subject = "Você já tem uma conta — Trimly";

    public static string BuildHtml(string frontendUrl) => $@"<!doctype html>
<html lang=""pt-BR"">
<body style=""margin:0;padding:32px 16px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;"">
  <div style=""max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;"">
    <h1 style=""font-size:20px;margin:0 0 16px;"">Trimly</h1>
    <p style=""font-size:15px;line-height:1.6;margin:0 0 8px;"">Olá!</p>
    <p style=""font-size:15px;line-height:1.6;margin:0 0 24px;"">Recebemos uma tentativa de cadastro no <b>Trimly</b> com este e-mail — mas ele <b>já tem uma conta</b>. Se foi você, é só entrar normalmente:</p>
    <p style=""text-align:center;margin:0 0 24px;"">
      <a href=""{frontendUrl}/login"" style=""display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:bold;"">Entrar na minha conta</a>
    </p>
    <p style=""font-size:12px;color:#a1a1aa;margin:0;"">Se não foi você, nenhuma ação é necessária — sua conta continua protegida e nada foi alterado.</p>
  </div>
</body>
</html>";
}
