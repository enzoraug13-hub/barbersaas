using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Loyalty.Commands;

/// <summary>Cria (Id null) ou edita (Id preenchido) uma recompensa do catálogo.</summary>
public record SaveLoyaltyRewardCommand(
    Guid? Id, string Name, string? Description, LoyaltyRewardType Type,
    Guid? ServiceId, Guid? ProductId, int Cost, bool IsActive) : IRequest<Guid>;

public class SaveLoyaltyRewardValidator : AbstractValidator<SaveLoyaltyRewardCommand>
{
    public SaveLoyaltyRewardValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Cost).GreaterThan(0).WithMessage("O custo deve ser de pelo menos 1.");
        RuleFor(x => x.ServiceId).NotNull().When(x => x.Type == LoyaltyRewardType.Service)
            .WithMessage("Escolha o serviço da recompensa.");
        RuleFor(x => x.ProductId).NotNull().When(x => x.Type == LoyaltyRewardType.Product)
            .WithMessage("Escolha o produto da recompensa.");
    }
}

public class SaveLoyaltyRewardHandler : IRequestHandler<SaveLoyaltyRewardCommand, Guid>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly IServiceRepository _services;
    private readonly IProductRepository _products;
    private readonly ICurrentTenant _tenant;

    public SaveLoyaltyRewardHandler(ILoyaltyRepository loyalty, IServiceRepository services,
        IProductRepository products, ICurrentTenant tenant)
    {
        _loyalty = loyalty; _services = services; _products = products; _tenant = tenant;
    }

    public async Task<Guid> Handle(SaveLoyaltyRewardCommand request, CancellationToken ct)
    {
        // O vínculo tem que apontar pra algo do PRÓPRIO tenant (os repositórios já
        // aplicam o filtro global — item de outro tenant volta null).
        Guid? serviceId = null, productId = null;
        if (request.Type == LoyaltyRewardType.Service)
        {
            _ = await _services.GetByIdAsync(request.ServiceId!.Value, ct)
                ?? throw new EntityNotFoundException("Serviço", request.ServiceId.Value);
            serviceId = request.ServiceId;
        }
        else
        {
            _ = await _products.GetByIdAsync(request.ProductId!.Value, ct)
                ?? throw new EntityNotFoundException("Produto", request.ProductId.Value);
            productId = request.ProductId;
        }

        LoyaltyReward reward;
        if (request.Id is { } id)
        {
            reward = await _loyalty.GetRewardAsync(id, ct)
                ?? throw new EntityNotFoundException("Recompensa", id);
        }
        else
        {
            reward = new LoyaltyReward { TenantId = _tenant.Id };
        }

        reward.Name        = request.Name.Trim();
        reward.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        reward.Type        = request.Type;
        reward.ServiceId   = serviceId;
        reward.ProductId   = productId;
        reward.Cost        = request.Cost;
        reward.IsActive    = request.IsActive;

        if (request.Id is null)
            await _loyalty.AddRewardAsync(reward, ct);
        else
            await _loyalty.UpdateRewardAsync(reward, ct);

        return reward.Id;
    }
}
