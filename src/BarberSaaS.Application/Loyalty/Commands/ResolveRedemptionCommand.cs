using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Domain.Exceptions;
using MediatR;

namespace BarberSaaS.Application.Loyalty.Commands;

/// <summary>
/// Dono resolve um resgate pendente: Deliver=true marca Entregue; Deliver=false
/// cancela e DEVOLVE os pontos (transação Credit de estorno — extrato íntegro).
/// </summary>
public record ResolveRedemptionCommand(Guid RedemptionId, bool Deliver) : IRequest<bool>;

public class ResolveRedemptionHandler : IRequestHandler<ResolveRedemptionCommand, bool>
{
    private readonly ILoyaltyRepository _loyalty;

    public ResolveRedemptionHandler(ILoyaltyRepository loyalty) => _loyalty = loyalty;

    public async Task<bool> Handle(ResolveRedemptionCommand request, CancellationToken ct)
    {
        var redemption = await _loyalty.GetRedemptionAsync(request.RedemptionId, ct)
            ?? throw new EntityNotFoundException("Resgate", request.RedemptionId);

        if (redemption.Status != LoyaltyRedemptionStatus.Pending)
            throw new DomainException("Este resgate já foi resolvido.");

        if (request.Deliver)
        {
            await _loyalty.MarkDeliveredAsync(redemption, ct);
            return true;
        }

        var wallet = await _loyalty.GetWalletAsync(redemption.ClientId, ct)
            ?? throw new DomainException("Carteira do cliente não encontrada.");
        await _loyalty.CancelRedemptionAsync(wallet, redemption, ct);
        return true;
    }
}
