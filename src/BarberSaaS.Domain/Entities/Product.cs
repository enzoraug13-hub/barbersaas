using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

public class ProductCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Product : BaseEntity
{
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Sku { get; set; }
    public string? BarCode { get; set; }
    public string? ImageUrl { get; set; }
    public decimal SalePrice { get; set; }
    public decimal CostPrice { get; set; } = 0;
    public int StockQuantity { get; set; } = 0;
    public int MinStockAlert { get; set; } = 5;
    public bool IsActive { get; set; } = true;

    public ProductCategory? Category { get; set; }
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
}

public class StockMovement : BaseEntity
{
    public Guid ProductId { get; set; }
    public StockMovementType Type { get; set; }
    public int Quantity { get; set; }
    public int PreviousStock { get; set; }
    public int NewStock { get; set; }
    public decimal? UnitCost { get; set; }
    public string? Reason { get; set; }
    public Guid? SaleId { get; set; }
    public Guid UserId { get; set; }

    public Product? Product { get; set; }
}

public class ProductSale : BaseEntity
{
    public Guid? AppointmentId { get; set; }
    public Guid? ClientId { get; set; }
    public Guid BarberId { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; } = 0;
    public decimal FinalAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public DateTime SoldAt { get; set; } = DateTime.UtcNow;

    public ICollection<ProductSaleItem> Items { get; set; } = new List<ProductSaleItem>();
}

public class ProductSaleItem : BaseEntity
{
    public Guid SaleId { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }

    public ProductSale? Sale { get; set; }
    public Product? Product { get; set; }
}
