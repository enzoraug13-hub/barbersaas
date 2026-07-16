using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;

namespace BarberSaaS.Application.Loyalty.Queries;

// Tenant sem linha em LoyaltyPrograms = programa desligado (default seguro).
public record GetLoyaltyProgramQuery : IRequest<LoyaltyProgramDto>;

public record LoyaltyProgramDto(bool IsEnabled, LoyaltyMode Mode, decimal PointsPerReal);

public class GetLoyaltyProgramHandler : IRequestHandler<GetLoyaltyProgramQuery, LoyaltyProgramDto>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly ICurrentTenant _tenant;

    public GetLoyaltyProgramHandler(ILoyaltyRepository loyalty, ICurrentTenant tenant)
    {
        _loyalty = loyalty; _tenant = tenant;
    }

    public async Task<LoyaltyProgramDto> Handle(GetLoyaltyProgramQuery request, CancellationToken ct)
    {
        var p = await _loyalty.GetProgramAsync(_tenant.Id, ct);
        return p is null
            ? new LoyaltyProgramDto(false, LoyaltyMode.Points, 1.0m)
            : new LoyaltyProgramDto(p.IsEnabled, p.Mode, p.PointsPerReal);
    }
}
