using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Products.Commands;
using BarberSaaS.Application.Products.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<ProductDto>>.Ok(await _mediator.Send(new GetProductsQuery(), ct)));

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(await _mediator.Send(new GetCategoriesQuery(), ct)));

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryCommand command, CancellationToken ct)
        => Ok(ApiResponse<CategoryDto>.Ok(await _mediator.Send(command, ct)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductCommand command, CancellationToken ct)
        => Ok(ApiResponse<ProductDto>.Ok(await _mediator.Send(command, ct)));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest req, CancellationToken ct)
    {
        var ok = await _mediator.Send(new UpdateProductCommand(
            id, req.Name, req.Description, req.SalePrice, req.CostPrice, req.MinStockAlert, req.Sku, req.CategoryId), ct);
        return ok ? Ok(ApiResponse<bool>.Ok(true)) : NotFound();
    }

    [HttpPatch("{id:guid}/stock")]
    public async Task<IActionResult> AdjustStock(Guid id, [FromBody] AdjustStockRequest req, CancellationToken ct)
    {
        var newStock = await _mediator.Send(new AdjustStockCommand(id, req.Quantity, req.Reason), ct);
        return newStock is null ? NotFound() : Ok(ApiResponse<object>.Ok(new { StockQuantity = newStock.Value }));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var ok = await _mediator.Send(new DeleteProductCommand(id), ct);
        return ok ? Ok(ApiResponse<bool>.Ok(true)) : NotFound();
    }
}

public record UpdateProductRequest(string Name, string? Description, decimal SalePrice, decimal CostPrice, int MinStockAlert, string? Sku, Guid CategoryId);
public record AdjustStockRequest(int Quantity, string? Reason);
