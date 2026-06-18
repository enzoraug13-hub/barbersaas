using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using MediatR;

namespace BarberSaaS.Application.Products.Commands;

// Retorna o novo estoque, ou null se o produto não existe (controller -> 404).
public record AdjustStockCommand(Guid Id, int Quantity, string? Reason) : IRequest<int?>;

public class AdjustStockHandler : IRequestHandler<AdjustStockCommand, int?>
{
    private readonly IProductRepository _products;
    private readonly IStockMovementRepository _stock;
    private readonly ICurrentUser _user;

    public AdjustStockHandler(IProductRepository products, IStockMovementRepository stock, ICurrentUser user)
    {
        _products = products; _stock = stock; _user = user;
    }

    public async Task<int?> Handle(AdjustStockCommand request, CancellationToken ct)
    {
        var product = await _products.GetByIdAsync(request.Id, ct);
        if (product is null) return null;

        var prev = product.StockQuantity;
        product.StockQuantity = Math.Max(0, product.StockQuantity + request.Quantity);
        await _products.UpdateAsync(product, ct);

        await _stock.AddAsync(new StockMovement
        {
            ProductId     = product.Id,
            Type          = request.Quantity >= 0 ? StockMovementType.Entry : StockMovementType.Exit,
            Quantity      = Math.Abs(request.Quantity),
            PreviousStock = prev,
            NewStock      = product.StockQuantity,
            UserId        = _user.Id,
            Reason        = request.Reason,
        }, ct);

        return product.StockQuantity;
    }
}
