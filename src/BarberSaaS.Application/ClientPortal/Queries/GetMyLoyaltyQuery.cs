using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;

namespace BarberSaaS.Application.ClientPortal.Queries;

/// <summary>
/// Tudo que a área do cliente precisa sobre fidelidade numa chamada só: programa
/// (ligado? modo?), saldo, catálogo ativo e meus resgates. Programa desligado ou
/// inexistente → Enabled=false e o front esconde a seção inteira.
/// </summary>
public record GetMyLoyaltyQuery : IRequest<MyLoyaltyDto>;

public record MyLoyaltyDto(
    bool Enabled, LoyaltyMode Mode, int Balance, int TotalVisits,
    IReadOnlyList<MyLoyaltyRewardDto> Rewards,
    IReadOnlyList<MyRedemptionDto> Redemptions);

public record MyLoyaltyRewardDto(Guid Id, string Name, string? Description, LoyaltyRewardType Type, int Cost);
public record MyRedemptionDto(Guid Id, string RewardName, int CostPaid, LoyaltyRedemptionStatus Status, DateTime RequestedAt);

public class GetMyLoyaltyHandler : IRequestHandler<GetMyLoyaltyQuery, MyLoyaltyDto>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly ICurrentTenant _tenant;
    private readonly ICurrentUser _user;

    public GetMyLoyaltyHandler(ILoyaltyRepository loyalty, ICurrentTenant tenant, ICurrentUser user)
    {
        _loyalty = loyalty; _tenant = tenant; _user = user;
    }

    public async Task<MyLoyaltyDto> Handle(GetMyLoyaltyQuery request, CancellationToken ct)
    {
        var program = await _loyalty.GetProgramAsync(_tenant.Id, ct);
        if (program is null || !program.IsEnabled)
            return new MyLoyaltyDto(false, LoyaltyMode.Points, 0, 0, [], []);

        var wallet  = await _loyalty.GetWalletAsync(_user.Id, ct);
        var visits  = await _loyalty.CountCompletedVisitsAsync(_user.Id, ct);
        var rewards = await _loyalty.ListRewardsAsync(_tenant.Id, onlyActive: true, ct);
        var mine    = await _loyalty.ListRedemptionsByClientAsync(_user.Id, ct);

        return new MyLoyaltyDto(
            true, program.Mode, wallet?.TotalPoints ?? 0, visits,
            rewards.Select(r => new MyLoyaltyRewardDto(r.Id, r.Name, r.Description, r.Type, r.Cost)).ToList(),
            mine.Select(r => new MyRedemptionDto(r.Id, r.RewardName, r.CostPaid, r.Status, r.CreatedAt)).ToList());
    }
}
