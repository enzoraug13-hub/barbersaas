using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Products.Commands;

public record UpdateProductCommand(
    Guid Id, string Name, string? Description, decimal SalePrice, decimal CostPrice,
    int MinStockAlert, string? Sku, Guid CategoryId) : IRequest<bool>;

public class UpdateProductHandler : IRequestHandler<UpdateProductCommand, bool>
{
    private readonly IProductRepository _products;

    public UpdateProductHandler(IProductRepository products) => _products = products;

    public async Task<bool> Handle(UpdateProductCommand request, CancellationToken ct)
    {
        var product = await _products.GetByIdAsync(request.Id, ct);
        if (product is null) return false;

        product.Name          = request.Name;
        product.Description   = request.Description;
        product.SalePrice     = request.SalePrice;
        product.CostPrice     = request.CostPrice;
        product.MinStockAlert = request.MinStockAlert;
        product.Sku           = request.Sku;
        if (request.CategoryId != Guid.Empty) product.CategoryId = request.CategoryId;

        await _products.UpdateAsync(product, ct);
        return true;
    }
}
