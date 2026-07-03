using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.Auth.Commands;

public record RegisterTenantCommand(
    string BusinessName,
    string OwnerName,
    string Email,
    string Password,
    string Phone) : IRequest<RegisterTenantResult>;

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
    private readonly ILogger<RegisterTenantHandler> _logger;

    public RegisterTenantHandler(
        ITenantRepository tenants, IUserRepository users, IPlanRepository plans,
        IPasswordHasher hasher, IJwtService jwt, IRefreshTokenRepository refreshTokens,
        IAuthOptions authOptions, IEmailService email, ILogger<RegisterTenantHandler> logger)
    {
        _tenants = tenants; _users = users; _plans = plans;
        _hasher = hasher; _jwt = jwt; _refreshTokens = refreshTokens;
        _authOptions = authOptions; _email = email; _logger = logger;
    }

    public async Task<RegisterTenantResult> Handle(RegisterTenantCommand request, CancellationToken ct)
    {
        var slug = GenerateSlug(request.BusinessName);
        var slugExists = await _tenants.SlugExistsAsync(slug, ct);
        if (slugExists) slug = $"{slug}-{Guid.NewGuid().ToString()[..4]}";

        var emailExists = await _users.EmailExistsAsync(request.Email, ct);
        if (emailExists) throw new BarberSaaS.Domain.Exceptions.DomainException("Este e-mail já está cadastrado.");

        var freePlan = await _plans.GetBySlugAsync("gratuito", ct)
            ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Plano gratuito não encontrado.");

        var tenant = new Tenant { Name = request.BusinessName, Slug = slug };
        var settings = new TenantSettings
        {
            TenantId     = tenant.Id,
            BusinessName = request.BusinessName,
            Phone        = request.Phone,
            PublicSlug   = slug
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
