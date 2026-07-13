using BarberSaaS.Application.Auth.Commands;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>
/// Criação ADMINISTRATIVA de conta (venda ao vivo pelo super admin): sem trial,
/// sem validação de CPF/CNPJ, sem fluxo de confirmação de e-mail — a senha
/// provisória é definida pelo super admin e entregue por fora.
/// </summary>
public record CreateTenantAccountCommand(
    string BusinessName,
    string OwnerEmail,
    string ProvisionalPassword,
    string? OwnerName = null) : IRequest<CreateTenantAccountResult>;

public record CreateTenantAccountResult(Guid TenantId, string Slug, string OwnerEmail);

public class CreateTenantAccountValidator : AbstractValidator<CreateTenantAccountCommand>
{
    public CreateTenantAccountValidator()
    {
        RuleFor(x => x.BusinessName).NotEmpty().WithMessage("Informe o nome da barbearia.").MaximumLength(150);
        RuleFor(x => x.OwnerEmail).NotEmpty().EmailAddress().WithMessage("E-mail inválido.");
        RuleFor(x => x.ProvisionalPassword)
            .NotEmpty().MinimumLength(8).WithMessage("A senha provisória deve ter no mínimo 8 caracteres.");
        RuleFor(x => x.OwnerName).MaximumLength(150);
    }
}

public class CreateTenantAccountHandler : IRequestHandler<CreateTenantAccountCommand, CreateTenantAccountResult>
{
    private readonly ISuperAdminRepository _superAdmin;
    private readonly ITenantRepository _tenants;
    private readonly IPlanRepository _plans;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<CreateTenantAccountHandler> _logger;

    public CreateTenantAccountHandler(ISuperAdminRepository superAdmin, ITenantRepository tenants,
        IPlanRepository plans, IPasswordHasher hasher, ILogger<CreateTenantAccountHandler> logger)
    {
        _superAdmin = superAdmin; _tenants = tenants; _plans = plans; _hasher = hasher; _logger = logger;
    }

    public async Task<CreateTenantAccountResult> Handle(CreateTenantAccountCommand request, CancellationToken ct)
    {
        // Criação administrativa: aqui erro claro é melhor que resposta neutra —
        // quem chama é o super admin, não um anônimo (anti-enumeração não se aplica).
        if (await _superAdmin.EmailExistsAsync(request.OwnerEmail, ct))
            throw new Domain.Exceptions.DomainException("Já existe uma conta com este e-mail.");

        var slug = RegisterTenantHandler.GenerateSlug(request.BusinessName);
        if (await _tenants.SlugExistsAsync(slug, ct))
            slug = $"{slug}-{Guid.NewGuid().ToString()[..4]}";

        // Plano profissional com assinatura ativa (não trial): a cobrança é combinada
        // ao vivo; o controle financeiro real vem nos próximos blocos.
        var plan = await _plans.GetBySlugAsync("profissional", ct)
            ?? await _plans.GetBySlugAsync("gratuito", ct)
            ?? throw new Domain.Exceptions.DomainException("Nenhum plano encontrado no banco.");

        var tenant = new Tenant { Name = request.BusinessName, Slug = slug, Status = TenantStatus.Active };
        tenant.Settings = new TenantSettings
        {
            TenantId     = tenant.Id,
            BusinessName = request.BusinessName,
            PublicSlug   = slug
        };
        tenant.Subscription = new Subscription
        {
            TenantId           = tenant.Id,
            PlanId             = plan.Id,
            Status             = SubscriptionStatus.Active,
            CurrentPeriodStart = DateOnly.FromDateTime(DateTime.UtcNow),
            CurrentPeriodEnd   = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30))
        };

        var owner = new User
        {
            TenantId      = tenant.Id,
            Name          = string.IsNullOrWhiteSpace(request.OwnerName) ? request.BusinessName : request.OwnerName!,
            Email         = request.OwnerEmail,
            PasswordHash  = _hasher.Hash(request.ProvisionalPassword),
            Role          = UserRole.Owner,
            IsActive      = true,
            EmailVerified = true // conta criada pelo super admin: sem fluxo de confirmação
        };

        await _superAdmin.AddTenantWithOwnerAsync(tenant, owner, ct);

        _logger.LogInformation("SUPER ADMIN: tenant {TenantId} ({Slug}) criado para {Email}",
            tenant.Id, slug, request.OwnerEmail);

        return new CreateTenantAccountResult(tenant.Id, slug, owner.Email);
    }
}
