using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;

namespace BarberSaaS.Application.Loyalty.Queries;

public record GetLoyaltyRewardsQuery(bool OnlyActive = false) : IRequest<IReadOnlyList<LoyaltyRewardDto>>;

public record LoyaltyRewardDto(
    Guid Id, string Name, string? Description, LoyaltyRewardType Type,
    Guid? ServiceId, Guid? ProductId, string? LinkedName, int Cost, bool IsActive);

public class GetLoyaltyRewardsHandler : IRequestHandler<GetLoyaltyRewardsQuery, IReadOnlyList<LoyaltyRewardDto>>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly ICurrentTenant _tenant;

    public GetLoyaltyRewardsHandler(ILoyaltyRepository loyalty, ICurrentTenant tenant)
    {
        _loyalty = loyalty; _tenant = tenant;
    }

    public async Task<IReadOnlyList<LoyaltyRewardDto>> Handle(GetLoyaltyRewardsQuery request, CancellationToken ct)
    {
        var rewards = await _loyalty.ListRewardsAsync(_tenant.Id, request.OnlyActive, ct);
        return rewards.Select(r => new LoyaltyRewardDto(
            r.Id, r.Name, r.Description, r.Type, r.ServiceId, r.ProductId,
            r.Type == LoyaltyRewardType.Service ? r.Service?.Name : r.Product?.Name,
            r.Cost, r.IsActive)).ToList();
    }
}
