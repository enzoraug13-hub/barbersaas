using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;

namespace BarberSaaS.Application.Loyalty.Queries;

public record GetLoyaltyRedemptionsQuery(LoyaltyRedemptionStatus? Status = null) : IRequest<IReadOnlyList<RedemptionDto>>;

public record RedemptionDto(
    Guid Id, Guid ClientId, string ClientName, string ClientPhone,
    string RewardName, int CostPaid, LoyaltyRedemptionStatus Status,
    DateTime RequestedAt, DateTime? ResolvedAt);

public class GetLoyaltyRedemptionsHandler : IRequestHandler<GetLoyaltyRedemptionsQuery, IReadOnlyList<RedemptionDto>>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly ICurrentTenant _tenant;

    public GetLoyaltyRedemptionsHandler(ILoyaltyRepository loyalty, ICurrentTenant tenant)
    {
        _loyalty = loyalty; _tenant = tenant;
    }

    public async Task<IReadOnlyList<RedemptionDto>> Handle(GetLoyaltyRedemptionsQuery request, CancellationToken ct)
    {
        var list = await _loyalty.ListRedemptionsAsync(_tenant.Id, request.Status, ct);
        return list.Select(r => new RedemptionDto(
            r.Id, r.ClientId, r.Client?.Name ?? "Cliente", r.Client?.PhoneNumber ?? "",
            r.RewardName, r.CostPaid, r.Status, r.CreatedAt, r.ResolvedAt)).ToList();
    }
}
