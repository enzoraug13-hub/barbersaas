using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.ClientAuth.Commands;

public record RequestLoginOtpCommand(string TenantSlug, string Phone) : IRequest<RequestOtpResult>;

// DevCode só vem preenchido quando NÃO há provedor de SMS real configurado (dev/testes).
public record RequestOtpResult(bool Sent, string? DevCode);

public class RequestLoginOtpValidator : AbstractValidator<RequestLoginOtpCommand>
{
    public RequestLoginOtpValidator()
    {
        RuleFor(x => x.TenantSlug).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty().Matches(@"^\+[1-9]\d{7,14}$")
            .WithMessage("Telefone inválido. Use o formato internacional: +5511999999999");
    }
}

public class RequestLoginOtpHandler : IRequestHandler<RequestLoginOtpCommand, RequestOtpResult>
{
    private readonly ITenantRepository _tenants;
    private readonly IClientRepository _clients;
    private readonly ISmsService _sms;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<RequestLoginOtpHandler> _logger;

    public RequestLoginOtpHandler(ITenantRepository tenants, IClientRepository clients, ISmsService sms, IPasswordHasher hasher, ILogger<RequestLoginOtpHandler> logger)
    {
        _tenants = tenants; _clients = clients; _sms = sms; _hasher = hasher; _logger = logger;
    }

    public async Task<RequestOtpResult> Handle(RequestLoginOtpCommand request, CancellationToken ct)
    {
        var tenant = await _tenants.GetBySlugAsync(request.TenantSlug, ct)
            ?? throw new TenantNotFoundException(request.TenantSlug);

        var client = await _clients.GetByPhoneAsync(request.Phone, tenant.Id, ct)
            ?? throw new DomainException("Conta não encontrada. Crie uma conta abaixo.");

        if (client.IsBlocked)
            throw new ClientBlockedException();

        var code = Random.Shared.Next(100000, 1000000).ToString();
        // Guarda apenas o HASH do código. Se o banco vazar, os códigos ativos não
        // ficam expostos. O texto puro só vai pelo SMS (e como devCode em dev).
        client.OtpCode      = _hasher.Hash(code);
        client.OtpExpiresAt = DateTime.UtcNow.AddMinutes(5);
        await _clients.UpdateAsync(client, ct);

        var business = tenant.Settings?.BusinessName ?? "Barbearia";
        await _sms.SendAsync(request.Phone, $"{business}: seu código de acesso é {code}. Válido por 5 minutos.", ct);

        _logger.LogInformation("OTP de login gerado para cliente {ClientId} (tenant {TenantId})", client.Id, tenant.Id);

        return new RequestOtpResult(true, _sms.IsConfigured ? null : code);
    }
}
