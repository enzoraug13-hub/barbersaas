using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Products.Commands;

public record DeleteProductCommand(Guid Id) : IRequest<bool>;

public class DeleteProductHandler : IRequestHandler<DeleteProductCommand, bool>
{
    private readonly IProductRepository _products;

    public DeleteProductHandler(IProductRepository products) => _products = products;

    public async Task<bool> Handle(DeleteProductCommand request, CancellationToken ct)
    {
        var product = await _products.GetByIdAsync(request.Id, ct);
        if (product is null) return false;
        product.IsDeleted = true;
        await _products.UpdateAsync(product, ct);
        return true;
    }
}
