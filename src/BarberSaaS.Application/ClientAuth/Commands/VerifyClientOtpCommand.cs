using BarberSaaS.Application.Common.Interfaces;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.ClientAuth.Commands;

public record VerifyClientOtpCommand(string TenantSlug, string Phone, string Code, string? Name) : IRequest<ClientAuthResult>;

public record ClientAuthResult(string AccessToken, DateTime ExpiresAt, ClientProfileDto Client);
public record ClientProfileDto(Guid Id, string Name, string Phone, string? Email, int LoyaltyPoints, int TotalVisits);

public class VerifyClientOtpValidator : AbstractValidator<VerifyClientOtpCommand>
{
    public VerifyClientOtpValidator()
    {
        RuleFor(x => x.TenantSlug).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty();
        RuleFor(x => x.Code).NotEmpty().Length(6);
    }
}

public class VerifyClientOtpHandler : IRequestHandler<VerifyClientOtpCommand, ClientAuthResult>
{
    private readonly ITenantRepository _tenants;
    private readonly IClientRepository _clients;
    private readonly IJwtService _jwt;
    private readonly IPasswordHasher _hasher;

    public VerifyClientOtpHandler(ITenantRepository tenants, IClientRepository clients, IJwtService jwt, IPasswordHasher hasher)
    {
        _tenants = tenants; _clients = clients; _jwt = jwt; _hasher = hasher;
    }

    public async Task<ClientAuthResult> Handle(VerifyClientOtpCommand request, CancellationToken ct)
    {
        var tenant = await _tenants.GetBySlugAsync(request.TenantSlug, ct)
            ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Barbearia não encontrada.");

        var client = await _clients.GetByPhoneAsync(request.Phone, tenant.Id, ct)
            ?? throw new UnauthorizedAccessException("Código inválido.");

        if (client.OtpCode == null || client.OtpExpiresAt == null || client.OtpExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Código expirado. Solicite um novo.");

        // OtpCode está hasheado; compara via verificação. Try/catch protege contra
        // hashes legados em formato antigo (tratados como código inválido).
        bool ok;
        try { ok = _hasher.Verify(request.Code, client.OtpCode); }
        catch { ok = false; }
        if (!ok)
            throw new UnauthorizedAccessException("Código inválido.");

        // Consome o OTP e marca verificado.
        client.OtpCode      = null;
        client.OtpExpiresAt = null;
        client.IsVerified   = true;
        if (!string.IsNullOrWhiteSpace(request.Name)) client.Name = request.Name.Trim();
        await _clients.UpdateAsync(client, ct);

        // Token do cliente: role="client", sub=clientId, tenant_id=tenant.Id (sem refresh token — ver AI_HANDOFF).
        var displayName = string.IsNullOrWhiteSpace(client.Name) ? "Cliente" : client.Name;
        var tokens = _jwt.GenerateTokens(client.Id, client.Email ?? "", displayName, "client", tenant.Id);

        return new ClientAuthResult(tokens.AccessToken, tokens.ExpiresAt,
            new ClientProfileDto(client.Id, client.Name, client.PhoneNumber, client.Email, client.LoyaltyPoints, client.TotalVisits));
    }
}
