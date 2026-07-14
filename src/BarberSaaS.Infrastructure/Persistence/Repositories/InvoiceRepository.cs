using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

/// <summary>
/// IgnoreQueryFilters DELIBERADO (mesmo motivo do SuperAdminRepository): a fatura
/// pertence a um tenant, mas quem lê é o super admin — cujo JWT carrega o tenant da
/// barbearia dele. Com o filtro global ligado, ele só veria as próprias faturas.
/// O soft-delete é reaplicado à mão em toda query (IgnoreQueryFilters derruba os dois).
/// </summary>
public class InvoiceRepository : IInvoiceRepository
{
    private readonly AppDbContext _db;
    public InvoiceRepository(AppDbContext db) => _db = db;

    private IQueryable<Invoice> Base() =>
        _db.Invoices.IgnoreQueryFilters().Where(i => !i.IsDeleted);

    public async Task<IReadOnlyList<InvoiceRow>> ListAsync(
        InvoiceStatus? status, DateOnly? from, DateOnly? to, Guid? tenantId, CancellationToken ct = default)
    {
        var q = Base();
        if (status is not null)   q = q.Where(i => i.Status == status);
        if (from is not null)     q = q.Where(i => i.DueDate >= from);
        if (to is not null)       q = q.Where(i => i.DueDate <= to);
        if (tenantId is not null) q = q.Where(i => i.TenantId == tenantId);

        return await q
            .OrderByDescending(i => i.CompetenceYear)
            .ThenByDescending(i => i.CompetenceMonth)
            .ThenBy(i => i.DueDate)
            .Select(i => new InvoiceRow(
                i.Id, i.TenantId,
                _db.Tenants.IgnoreQueryFilters()
                    .Where(t => t.Id == i.TenantId).Select(t => t.Name).FirstOrDefault() ?? "—",
                i.CompetenceYear, i.CompetenceMonth, i.Amount, i.DueDate,
                (byte)i.Status, i.PaidAt, i.ReceiptUrl, i.Notes))
            .ToListAsync(ct);
    }

    public Task<Invoice?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Base().FirstOrDefaultAsync(i => i.Id == id, ct);

    public Task<bool> ExistsForCompetenceAsync(Guid tenantId, int year, int month, CancellationToken ct = default)
        => Base().AnyAsync(i => i.TenantId == tenantId
                             && i.CompetenceYear == year
                             && i.CompetenceMonth == month, ct);

    public async Task AddAsync(Invoice invoice, CancellationToken ct = default)
    {
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync(ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);

    public async Task<(decimal Received, decimal Outstanding, int PaidCount, int OpenCount)> GetSummaryAsync(
        DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows = await Base()
            .Where(i => i.DueDate >= from && i.DueDate <= to)
            .Select(i => new { i.Status, i.Amount })
            .ToListAsync(ct);

        var paid = rows.Where(r => r.Status == InvoiceStatus.Paid).ToList();
        var open = rows.Where(r => r.Status == InvoiceStatus.Open).ToList();

        return (paid.Sum(r => r.Amount), open.Sum(r => r.Amount), paid.Count, open.Count);
    }

    public async Task<IReadOnlyList<MonthlyRevenueRow>> GetMonthlyReceivedAsync(int months, CancellationToken ct = default)
    {
        // Janela dos últimos N meses (inclui o atual), pela COMPETÊNCIA da fatura.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = new DateOnly(today.Year, today.Month, 1).AddMonths(-(months - 1));
        var startKey = start.Year * 100 + start.Month;

        var paid = await Base()
            .Where(i => i.Status == InvoiceStatus.Paid
                     && i.CompetenceYear * 100 + i.CompetenceMonth >= startKey)
            .GroupBy(i => new { i.CompetenceYear, i.CompetenceMonth })
            .Select(g => new { g.Key.CompetenceYear, g.Key.CompetenceMonth, Received = g.Sum(x => x.Amount) })
            .ToListAsync(ct);

        // Meses sem fatura paga entram zerados — o gráfico precisa da série contínua.
        var series = new List<MonthlyRevenueRow>();
        for (var i = 0; i < months; i++)
        {
            var m = start.AddMonths(i);
            var hit = paid.FirstOrDefault(p => p.CompetenceYear == m.Year && p.CompetenceMonth == m.Month);
            series.Add(new MonthlyRevenueRow(m.Year, m.Month, hit?.Received ?? 0m));
        }
        return series;
    }
}
