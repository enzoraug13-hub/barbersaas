using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Products.Queries;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Products.Commands;

public record CreateProductCommand(
    string Name, string? Description, decimal SalePrice, decimal CostPrice,
    int InitialStock, int MinStockAlert, string? Sku, Guid CategoryId) : IRequest<ProductDto>;

public class CreateProductValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.SalePrice).GreaterThanOrEqualTo(0);
    }
}

public class CreateProductHandler : IRequestHandler<CreateProductCommand, ProductDto>
{
    private readonly IProductRepository _products;
    private readonly IProductCategoryRepository _categories;
    private readonly IStockMovementRepository _stock;
    private readonly ICurrentUser _user;

    public CreateProductHandler(IProductRepository products, IProductCategoryRepository categories,
        IStockMovementRepository stock, ICurrentUser user)
    {
        _products = products; _categories = categories; _stock = stock; _user = user;
    }

    public async Task<ProductDto> Handle(CreateProductCommand request, CancellationToken ct)
    {
        var categoryId = request.CategoryId;
        if (categoryId == Guid.Empty)
        {
            var def = (await _categories.FindAsync(c => c.Name == "Geral", ct)).FirstOrDefault();
            if (def is null)
            {
                def = new ProductCategory { Name = "Geral" };
                await _categories.AddAsync(def, ct);
            }
            categoryId = def.Id;
        }

        var product = new Product
        {
            CategoryId    = categoryId,
            Name          = request.Name,
            Description   = request.Description,
            SalePrice     = request.SalePrice,
            CostPrice     = request.CostPrice,
            StockQuantity = request.InitialStock,
            MinStockAlert = request.MinStockAlert,
            Sku           = request.Sku,
            IsActive      = true,
        };
        await _products.AddAsync(product, ct);

        if (request.InitialStock > 0)
        {
            await _stock.AddAsync(new StockMovement
            {
                ProductId     = product.Id,
                Type          = StockMovementType.Entry,
                Quantity      = request.InitialStock,
                PreviousStock = 0,
                NewStock      = request.InitialStock,
                UserId        = _user.Id,
                Reason        = "Estoque inicial",
            }, ct);
        }

        return ProductDto.From(product);
    }
}
