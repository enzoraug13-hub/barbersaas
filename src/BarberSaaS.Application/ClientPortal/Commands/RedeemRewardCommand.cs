using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Exceptions;
using MediatR;

namespace BarberSaaS.Application.ClientPortal.Commands;

/// <summary>
/// Cliente resgata uma recompensa sozinho: valida programa ligado + recompensa ativa +
/// saldo suficiente, debita a wallet (com transação de extrato) e cria a
/// LoyaltyRedemption Pending — que aparece no sino e na aba Fidelidade do dono.
/// RewardName/CostPaid são snapshots: reprecificação posterior não muda o histórico.
/// </summary>
public record RedeemRewardCommand(Guid RewardId) : IRequest<Guid>;

public class RedeemRewardHandler : IRequestHandler<RedeemRewardCommand, Guid>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly IClientRepository _clients;
    private readonly ICurrentTenant _tenant;
    private readonly ICurrentUser _user;

    public RedeemRewardHandler(ILoyaltyRepository loyalty, IClientRepository clients,
        ICurrentTenant tenant, ICurrentUser user)
    {
        _loyalty = loyalty; _clients = clients; _tenant = tenant; _user = user;
    }

    public async Task<Guid> Handle(RedeemRewardCommand request, CancellationToken ct)
    {
        var program = await _loyalty.GetProgramAsync(_tenant.Id, ct);
        if (program is null || !program.IsEnabled)
            throw new DomainException("O programa de fidelidade não está ativo.");

        // Cliente precisa existir de verdade (perfil completo) — o Guid determinístico
        // pré-cadastro não tem como ter saldo, mas a FK do resgate exige a linha.
        _ = await _clients.GetByIdAsync(_user.Id, ct)
            ?? throw new DomainException("Complete seu cadastro antes de resgatar.");

        var reward = await _loyalty.GetRewardAsync(request.RewardId, ct);
        if (reward is null || !reward.IsActive)
            throw new DomainException("Recompensa indisponível.");

        var wallet = await _loyalty.GetOrCreateWalletAsync(_tenant.Id, _user.Id, ct);
        if (wallet.TotalPoints < reward.Cost)
            throw new DomainException("Saldo insuficiente para este resgate.");

        var redemption = new LoyaltyRedemption
        {
            TenantId   = _tenant.Id,
            ClientId   = _user.Id,
            RewardId   = reward.Id,
            RewardName = reward.Name,
            CostPaid   = reward.Cost,
        };
        await _loyalty.RedeemAsync(wallet, redemption, ct);
        return redemption.Id;
    }
}
