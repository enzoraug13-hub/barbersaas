using BarberSaaS.Application.Common;
using BarberSaaS.Application.Common.Interfaces;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.ClientAuth.Commands;

public record VerifyClientOtpCommand(string TenantSlug, string Phone, string Code) : IRequest<ClientAuthResult>;

public record ClientAuthResult(string AccessToken, DateTime ExpiresAt, ClientProfileDto Client, bool ProfileComplete);
public record ClientProfileDto(Guid Id, string Name, string Phone, string? Cpf, string? Email, int LoyaltyPoints, int TotalVisits);

public class VerifyClientOtpValidator : AbstractValidator<VerifyClientOtpCommand>
{
    public VerifyClientOtpValidator()
    {
        RuleFor(x => x.TenantSlug).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty();
        RuleFor(x => x.Code).NotEmpty().Length(6);
    }
}

// Valida contra o IOtpChallengeService (não contra Client.OtpCode — o Client
// pode nem existir ainda). Cliente existente: segue igual a hoje. Telefone
// novo: NÃO cria Client aqui — o token usa um Guid determinístico
// (telefone+tenant) como "sub", e o Client só é criado de fato no
// UpdateMyProfileCommand, quando o nome é preenchido.
public class VerifyClientOtpHandler : IRequestHandler<VerifyClientOtpCommand, ClientAuthResult>
{
    private readonly ITenantRepository _tenants;
    private readonly IClientRepository _clients;
    private readonly IJwtService _jwt;
    private readonly IPasswordHasher _hasher;
    private readonly IOtpChallengeService _challenges;

    public VerifyClientOtpHandler(ITenantRepository tenants, IClientRepository clients, IJwtService jwt,
        IPasswordHasher hasher, IOtpChallengeService challenges)
    {
        _tenants = tenants; _clients = clients; _jwt = jwt; _hasher = hasher; _challenges = challenges;
    }

    public async Task<ClientAuthResult> Handle(VerifyClientOtpCommand request, CancellationToken ct)
    {
        var tenant = await _tenants.GetBySlugAsync(request.TenantSlug, ct)
            ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Barbearia não encontrada.");

        var challenge = await _challenges.GetAsync(tenant.Id, request.Phone, ct)
            ?? throw new UnauthorizedAccessException("Código expirado. Solicite um novo.");

        bool ok;
        try { ok = _hasher.Verify(request.Code, challenge.CodeHash); }
        catch { ok = false; }
        if (!ok)
            throw new UnauthorizedAccessException("Código inválido.");

        await _challenges.RemoveAsync(tenant.Id, request.Phone, ct);

        // Cliente já existe no banco — caminho idêntico ao de antes.
        if (challenge.ExistingClientId is { } existingId)
        {
            var client = await _clients.GetByIdAsync(existingId, ct)
                ?? throw new UnauthorizedAccessException("Código inválido.");

            // Recheca o bloqueio aqui: pode ter sido bloqueado entre o
            // request-otp e este verify (código já enviado, mas não deve logar).
            if (client.IsBlocked)
                throw new BarberSaaS.Domain.Exceptions.ClientBlockedException();

            var displayName = string.IsNullOrWhiteSpace(client.Name) ? "Cliente" : client.Name;
            var tokens = _jwt.GenerateTokens(client.Id, client.Email ?? "", displayName, "client", tenant.Id, client.PhoneNumber);
            var profileComplete = !string.IsNullOrWhiteSpace(client.Name) && !string.IsNullOrWhiteSpace(client.Cpf);

            return new ClientAuthResult(tokens.AccessToken, tokens.ExpiresAt,
                new ClientProfileDto(client.Id, client.Name, client.PhoneNumber, client.Cpf, client.Email, client.LoyaltyPoints, client.TotalVisits),
                profileComplete);
        }

        // Telefone novo — sem Client no banco ainda. O Id é determinístico
        // (mesma seed sempre) pra sobreviver a "validar OTP e fechar o app":
        // se voltar depois com o mesmo telefone, cai no mesmo Id, e quando o
        // nome for preenchido (UpdateMyProfileCommand) o Client nasce com
        // esse Id, sem duplicar nem perder o histórico do token já emitido.
        var newId = DeterministicGuid.ForClientPhone(tenant.Id, request.Phone);
        var newTokens = _jwt.GenerateTokens(newId, "", "Cliente", "client", tenant.Id, request.Phone);

        return new ClientAuthResult(newTokens.AccessToken, newTokens.ExpiresAt,
            new ClientProfileDto(newId, "", request.Phone, null, null, 0, 0),
            ProfileComplete: false);
    }
}
