using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentTenant _tenant;
    private readonly ICurrentUser _user;

    public ProductsController(AppDbContext db, ICurrentTenant tenant, ICurrentUser user)
    {
        _db = db; _tenant = tenant; _user = user;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var products = await _db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Where(p => !p.IsDeleted && p.IsActive)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

        return Ok(ApiResponse<object>.Ok(products.Select(MapProduct)));
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var categories = await _db.ProductCategories
            .AsNoTracking()
            .Where(c => !c.IsDeleted && c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        return Ok(ApiResponse<object>.Ok(categories.Select(c => new { c.Id, c.Name })));
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest req, CancellationToken ct)
    {
        var category = new ProductCategory { Name = req.Name };
        _db.ProductCategories.Add(category);
        await _db.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { category.Id, category.Name }));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest req, CancellationToken ct)
    {
        var categoryId = req.CategoryId;
        if (categoryId == Guid.Empty)
        {
            var def = await _db.ProductCategories
                .FirstOrDefaultAsync(c => c.Name == "Geral" && !c.IsDeleted, ct);
            if (def == null)
            {
                def = new ProductCategory { Name = "Geral" };
                _db.ProductCategories.Add(def);
                await _db.SaveChangesAsync(ct);
            }
            categoryId = def.Id;
        }

        var product = new Product
        {
            CategoryId    = categoryId,
            Name          = req.Name,
            Description   = req.Description,
            SalePrice     = req.SalePrice,
            CostPrice     = req.CostPrice,
            StockQuantity = req.InitialStock,
            MinStockAlert = req.MinStockAlert,
            Sku           = req.Sku,
            IsActive      = true,
        };
        _db.Products.Add(product);
        await _db.SaveChangesAsync(ct);

        if (req.InitialStock > 0)
        {
            _db.StockMovements.Add(new StockMovement
            {
                ProductId     = product.Id,
                Type          = StockMovementType.Entry,
                Quantity      = req.InitialStock,
                PreviousStock = 0,
                NewStock      = req.InitialStock,
                UserId        = _user.Id,
                Reason        = "Estoque inicial",
            });
            await _db.SaveChangesAsync(ct);
        }

        return Ok(ApiResponse<object>.Ok(MapProduct(product)));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest req, CancellationToken ct)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, ct);
        if (product == null) return NotFound();

        product.Name          = req.Name;
        product.Description   = req.Description;
        product.SalePrice     = req.SalePrice;
        product.CostPrice     = req.CostPrice;
        product.MinStockAlert = req.MinStockAlert;
        product.Sku           = req.Sku;
        if (req.CategoryId != Guid.Empty) product.CategoryId = req.CategoryId;

        await _db.SaveChangesAsync(ct);
        return Ok(ApiResponse<bool>.Ok(true));
    }

    [HttpPatch("{id:guid}/stock")]
    public async Task<IActionResult> AdjustStock(Guid id, [FromBody] AdjustStockRequest req, CancellationToken ct)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, ct);
        if (product == null) return NotFound();

        var prev = product.StockQuantity;
        product.StockQuantity = Math.Max(0, product.StockQuantity + req.Quantity);

        _db.StockMovements.Add(new StockMovement
        {
            ProductId     = product.Id,
            Type          = req.Quantity >= 0 ? StockMovementType.Entry : StockMovementType.Exit,
            Quantity      = Math.Abs(req.Quantity),
            PreviousStock = prev,
            NewStock      = product.StockQuantity,
            UserId        = _user.Id,
            Reason        = req.Reason,
        });

        await _db.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { product.StockQuantity }));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, ct);
        if (product == null) return NotFound();
        product.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return Ok(ApiResponse<bool>.Ok(true));
    }

    private static object MapProduct(Product p) => new
    {
        p.Id, p.Name, p.Description, p.SalePrice, p.CostPrice,
        p.StockQuantity, p.MinStockAlert, p.Sku, p.IsActive,
        p.CategoryId,
        CategoryName = p.Category?.Name ?? "Geral",
        IsLowStock   = p.StockQuantity <= p.MinStockAlert,
    };
}

public record CreateCategoryRequest(string Name);
public record CreateProductRequest(string Name, string? Description, decimal SalePrice, decimal CostPrice, int InitialStock, int MinStockAlert, string? Sku, Guid CategoryId);
public record UpdateProductRequest(string Name, string? Description, decimal SalePrice, decimal CostPrice, int MinStockAlert, string? Sku, Guid CategoryId);
public record AdjustStockRequest(int Quantity, string? Reason);
