using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.ClientAuth.Commands;

public record RequestOtpCommand(string TenantSlug, string Phone) : IRequest<RequestOtpResult>;

public record RequestOtpResult(bool Sent, string? DevCode);

public class RequestOtpValidator : AbstractValidator<RequestOtpCommand>
{
    public RequestOtpValidator()
    {
        RuleFor(x => x.TenantSlug).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty().Matches(@"^\+[1-9]\d{7,14}$")
            .WithMessage("Telefone inválido. Use o formato internacional: +5511999999999");
    }
}

// Find-or-create por telefone: a tela única de telefone não distingue
// login/cadastro — quem decide se é conta nova é o backend.
public class RequestOtpHandler : IRequestHandler<RequestOtpCommand, RequestOtpResult>
{
    private readonly ITenantRepository _tenants;
    private readonly IClientRepository _clients;
    private readonly ISmsService _sms;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<RequestOtpHandler> _logger;

    public RequestOtpHandler(ITenantRepository tenants, IClientRepository clients, ISmsService sms, IPasswordHasher hasher, ILogger<RequestOtpHandler> logger)
    {
        _tenants = tenants; _clients = clients; _sms = sms; _hasher = hasher; _logger = logger;
    }

    public async Task<RequestOtpResult> Handle(RequestOtpCommand request, CancellationToken ct)
    {
        var tenant = await _tenants.GetBySlugAsync(request.TenantSlug, ct)
            ?? throw new TenantNotFoundException(request.TenantSlug);

        var client = await _clients.GetByPhoneAsync(request.Phone, tenant.Id, ct);
        if (client == null)
        {
            client = new Domain.Entities.Client { TenantId = tenant.Id, PhoneNumber = request.Phone, Name = "" };
            await _clients.AddAsync(client, ct);
        }

        if (client.IsBlocked)
            throw new ClientBlockedException();

        var code = Random.Shared.Next(100000, 1000000).ToString();
        client.OtpCode      = _hasher.Hash(code);
        client.OtpExpiresAt = DateTime.UtcNow.AddMinutes(5);
        await _clients.UpdateAsync(client, ct);

        var business = tenant.Settings?.BusinessName ?? "Barbearia";
        await _sms.SendAsync(request.Phone, $"{business}: seu código de acesso é {code}. Válido por 5 minutos.", ct);

        _logger.LogInformation("OTP gerado para cliente {ClientId} (tenant {TenantId})", client.Id, tenant.Id);

        return new RequestOtpResult(true, _sms.IsConfigured ? null : code);
    }
}
