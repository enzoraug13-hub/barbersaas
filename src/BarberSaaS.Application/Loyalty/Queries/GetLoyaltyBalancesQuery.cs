using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Loyalty.Queries;

/// <summary>Saldo de fidelidade por cliente (aba Fidelidade do dono).</summary>
public record GetLoyaltyBalancesQuery : IRequest<IReadOnlyList<ClientBalanceRow>>;

public class GetLoyaltyBalancesHandler : IRequestHandler<GetLoyaltyBalancesQuery, IReadOnlyList<ClientBalanceRow>>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly ICurrentTenant _tenant;

    public GetLoyaltyBalancesHandler(ILoyaltyRepository loyalty, ICurrentTenant tenant)
    {
        _loyalty = loyalty; _tenant = tenant;
    }

    public async Task<IReadOnlyList<ClientBalanceRow>> Handle(GetLoyaltyBalancesQuery request, CancellationToken ct)
        => await _loyalty.ListBalancesAsync(_tenant.Id, ct);
}
