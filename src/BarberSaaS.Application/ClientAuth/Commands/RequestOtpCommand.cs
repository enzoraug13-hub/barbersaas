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

// Find (NUNCA create) por telefone: a tela única de telefone não distingue
// login/cadastro, mas o Client só nasce no banco quando o nome é preenchido
// (UpdateMyProfileCommand) — telefone+código ficam no IOtpChallengeService
// (Redis/memória, TTL 5min) até lá, pra não sujar a tabela com "clientes
// fantasma" sem nome.
public class RequestOtpHandler : IRequestHandler<RequestOtpCommand, RequestOtpResult>
{
    private readonly ITenantRepository _tenants;
    private readonly IClientRepository _clients;
    private readonly ISmsService _sms;
    private readonly IPasswordHasher _hasher;
    private readonly IOtpChallengeService _challenges;
    private readonly ILogger<RequestOtpHandler> _logger;

    public RequestOtpHandler(ITenantRepository tenants, IClientRepository clients, ISmsService sms,
        IPasswordHasher hasher, IOtpChallengeService challenges, ILogger<RequestOtpHandler> logger)
    {
        _tenants = tenants; _clients = clients; _sms = sms; _hasher = hasher; _challenges = challenges; _logger = logger;
    }

    public async Task<RequestOtpResult> Handle(RequestOtpCommand request, CancellationToken ct)
    {
        var tenant = await _tenants.GetBySlugAsync(request.TenantSlug, ct)
            ?? throw new TenantNotFoundException(request.TenantSlug);

        // Só leitura — nunca cria Client aqui.
        var existingClient = await _clients.GetByPhoneAsync(request.Phone, tenant.Id, ct);
        if (existingClient?.IsBlocked == true)
            throw new ClientBlockedException();

        var code = Random.Shared.Next(100000, 1000000).ToString();
        await _challenges.SetAsync(tenant.Id, request.Phone, _hasher.Hash(code), existingClient?.Id, ct);

        var business = tenant.Settings?.BusinessName ?? "Barbearia";
        await _sms.SendAsync(request.Phone, $"{business}: seu código de acesso é {code}. Válido por 5 minutos.", ct);

        _logger.LogInformation("OTP gerado para telefone {Phone} (tenant {TenantId}, cliente existente: {ExistingClientId})",
            request.Phone, tenant.Id, existingClient?.Id);

        return new RequestOtpResult(true, _sms.IsConfigured ? null : code);
    }
}
