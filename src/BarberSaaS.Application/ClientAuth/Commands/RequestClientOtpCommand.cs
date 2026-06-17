using BarberSaaS.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.ClientAuth.Commands;

public record RequestClientOtpCommand(string TenantSlug, string Phone) : IRequest<RequestClientOtpResult>;

// DevCode só vem preenchido quando NÃO há provedor de SMS real configurado (dev/testes).
public record RequestClientOtpResult(bool Sent, string? DevCode);

public class RequestClientOtpValidator : AbstractValidator<RequestClientOtpCommand>
{
    public RequestClientOtpValidator()
    {
        RuleFor(x => x.TenantSlug).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty().Matches(@"^\+[1-9]\d{7,14}$")
            .WithMessage("Telefone inválido. Use o formato internacional: +5511999999999");
    }
}

public class RequestClientOtpHandler : IRequestHandler<RequestClientOtpCommand, RequestClientOtpResult>
{
    private readonly ITenantRepository _tenants;
    private readonly IClientRepository _clients;
    private readonly ISmsService _sms;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<RequestClientOtpHandler> _logger;

    public RequestClientOtpHandler(ITenantRepository tenants, IClientRepository clients, ISmsService sms, IPasswordHasher hasher, ILogger<RequestClientOtpHandler> logger)
    {
        _tenants = tenants; _clients = clients; _sms = sms; _hasher = hasher; _logger = logger;
    }

    public async Task<RequestClientOtpResult> Handle(RequestClientOtpCommand request, CancellationToken ct)
    {
        var tenant = await _tenants.GetBySlugAsync(request.TenantSlug, ct)
            ?? throw new BarberSaaS.Domain.Exceptions.DomainException("Barbearia não encontrada.");

        // Find-or-create: evita enumeração de telefones (sempre "envia") e permite cadastro por telefone.
        var client = await _clients.GetByPhoneAsync(request.Phone, tenant.Id, ct);
        if (client == null)
        {
            client = new Domain.Entities.Client { TenantId = tenant.Id, PhoneNumber = request.Phone, Name = "" };
            await _clients.AddAsync(client, ct);
        }

        if (client.IsBlocked)
            throw new BarberSaaS.Domain.Exceptions.DomainException("Cadastro bloqueado. Procure a barbearia.");

        var code = Random.Shared.Next(100000, 1000000).ToString();
        // Guarda apenas o HASH do código. Se o banco vazar, os códigos ativos não
        // ficam expostos. O texto puro só vai pelo SMS (e como devCode em dev).
        client.OtpCode      = _hasher.Hash(code);
        client.OtpExpiresAt = DateTime.UtcNow.AddMinutes(5);
        await _clients.UpdateAsync(client, ct);

        var business = tenant.Settings?.BusinessName ?? "Barbearia";
        await _sms.SendAsync(request.Phone, $"{business}: seu código de acesso é {code}. Válido por 5 minutos.", ct);

        _logger.LogInformation("OTP gerado para cliente {ClientId} (tenant {TenantId})", client.Id, tenant.Id);

        // Sem provedor real configurado, devolve o código para permitir o fluxo em dev/testes.
        return new RequestClientOtpResult(true, _sms.IsConfigured ? null : code);
    }
}
