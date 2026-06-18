using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using MediatR;

namespace BarberSaaS.Application.Products.Queries;

public record GetProductsQuery : IRequest<IReadOnlyList<ProductDto>>;

public record ProductDto(
    Guid Id, string Name, string? Description, decimal SalePrice, decimal CostPrice,
    int StockQuantity, int MinStockAlert, string? Sku, bool IsActive,
    Guid CategoryId, string CategoryName, bool IsLowStock)
{
    public static ProductDto From(Product p) => new(
        p.Id, p.Name, p.Description, p.SalePrice, p.CostPrice,
        p.StockQuantity, p.MinStockAlert, p.Sku, p.IsActive,
        p.CategoryId, p.Category?.Name ?? "Geral", p.StockQuantity <= p.MinStockAlert);
}

public class GetProductsHandler : IRequestHandler<GetProductsQuery, IReadOnlyList<ProductDto>>
{
    private readonly IProductRepository _products;
    private readonly ICurrentTenant _tenant;

    public GetProductsHandler(IProductRepository products, ICurrentTenant tenant)
    {
        _products = products; _tenant = tenant;
    }

    public async Task<IReadOnlyList<ProductDto>> Handle(GetProductsQuery request, CancellationToken ct)
    {
        var products = await _products.GetActiveByTenantAsync(_tenant.Id, ct);
        return products.OrderBy(p => p.Name).Select(ProductDto.From).ToList();
    }
}
