using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.ClientAuth.Commands;

public record RequestRegisterOtpCommand(string TenantSlug, string Phone, string Name, string? Cpf) : IRequest<RequestOtpResult>;

public class RequestRegisterOtpValidator : AbstractValidator<RequestRegisterOtpCommand>
{
    public RequestRegisterOtpValidator()
    {
        RuleFor(x => x.TenantSlug).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty().Matches(@"^\+[1-9]\d{7,14}$")
            .WithMessage("Telefone inválido. Use o formato internacional: +5511999999999");
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Cpf!).Matches(@"^\d{11}$").WithMessage("CPF inválido. Informe os 11 dígitos, sem pontuação.")
            .When(x => !string.IsNullOrWhiteSpace(x.Cpf));
    }
}

public class RequestRegisterOtpHandler : IRequestHandler<RequestRegisterOtpCommand, RequestOtpResult>
{
    private readonly ITenantRepository _tenants;
    private readonly IClientRepository _clients;
    private readonly ISmsService _sms;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<RequestRegisterOtpHandler> _logger;

    public RequestRegisterOtpHandler(ITenantRepository tenants, IClientRepository clients, ISmsService sms, IPasswordHasher hasher, ILogger<RequestRegisterOtpHandler> logger)
    {
        _tenants = tenants; _clients = clients; _sms = sms; _hasher = hasher; _logger = logger;
    }

    public async Task<RequestOtpResult> Handle(RequestRegisterOtpCommand request, CancellationToken ct)
    {
        var tenant = await _tenants.GetBySlugAsync(request.TenantSlug, ct)
            ?? throw new TenantNotFoundException(request.TenantSlug);

        if (await _clients.PhoneExistsAsync(request.Phone, tenant.Id, ct))
            throw new DomainException("Telefone já cadastrado. Faça login.");

        var client = new Domain.Entities.Client
        {
            TenantId    = tenant.Id,
            PhoneNumber = request.Phone,
            Name        = request.Name.Trim(),
            Cpf         = string.IsNullOrWhiteSpace(request.Cpf) ? null : request.Cpf,
        };
        await _clients.AddAsync(client, ct);

        var code = Random.Shared.Next(100000, 1000000).ToString();
        client.OtpCode      = _hasher.Hash(code);
        client.OtpExpiresAt = DateTime.UtcNow.AddMinutes(5);
        await _clients.UpdateAsync(client, ct);

        var business = tenant.Settings?.BusinessName ?? "Barbearia";
        await _sms.SendAsync(request.Phone, $"{business}: seu código de acesso é {code}. Válido por 5 minutos.", ct);

        _logger.LogInformation("OTP de cadastro gerado para novo cliente {ClientId} (tenant {TenantId})", client.Id, tenant.Id);

        return new RequestOtpResult(true, _sms.IsConfigured ? null : code);
    }
}
