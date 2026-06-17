using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberSaaS.Infrastructure.Persistence.Configurations;

public class ProductCategoryConfiguration : IEntityTypeConfiguration<ProductCategory>
{
    public void Configure(EntityTypeBuilder<ProductCategory> b)
    {
        b.ToTable("ProductCategories");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(100).IsRequired();

        b.HasMany(x => x.Products)
            .WithOne(x => x.Category)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> b)
    {
        b.ToTable("Products");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.Sku).HasMaxLength(100);
        b.Property(x => x.BarCode).HasMaxLength(100);
        b.Property(x => x.ImageUrl).HasMaxLength(500);
        b.Property(x => x.SalePrice).HasColumnType("decimal(10,2)");
        b.Property(x => x.CostPrice).HasColumnType("decimal(10,2)");

        b.HasMany(x => x.StockMovements)
            .WithOne(x => x.Product)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class StockMovementConfiguration : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> b)
    {
        b.ToTable("StockMovements");
        b.HasKey(x => x.Id);

        b.Property(x => x.Type).HasConversion<byte>();
        b.Property(x => x.UnitCost).HasColumnType("decimal(10,2)");
        b.Property(x => x.Reason).HasMaxLength(300);
    }
}

public class ProductSaleConfiguration : IEntityTypeConfiguration<ProductSale>
{
    public void Configure(EntityTypeBuilder<ProductSale> b)
    {
        b.ToTable("ProductSales");
        b.HasKey(x => x.Id);

        b.Property(x => x.TotalAmount).HasColumnType("decimal(10,2)");
        b.Property(x => x.DiscountAmount).HasColumnType("decimal(10,2)");
        b.Property(x => x.FinalAmount).HasColumnType("decimal(10,2)");
        b.Property(x => x.PaymentMethod).HasConversion<byte>();

        b.HasMany(x => x.Items)
            .WithOne(x => x.Sale)
            .HasForeignKey(x => x.SaleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ProductSaleItemConfiguration : IEntityTypeConfiguration<ProductSaleItem>
{
    public void Configure(EntityTypeBuilder<ProductSaleItem> b)
    {
        b.ToTable("ProductSaleItems");
        b.HasKey(x => x.Id);

        b.Property(x => x.UnitPrice).HasColumnType("decimal(10,2)");
        b.Property(x => x.TotalPrice).HasColumnType("decimal(10,2)");

        b.HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
