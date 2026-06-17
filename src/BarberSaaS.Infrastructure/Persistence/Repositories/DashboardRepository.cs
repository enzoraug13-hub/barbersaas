using BarberSaaS.Application.Dashboard.Queries;
using BarberSaaS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _db;

    public DashboardRepository(AppDbContext db) => _db = db;

    public async Task<DashboardDto> GetSummaryAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default)
    {
        var transactions = await _db.FinancialTransactions
            .AsNoTracking()
            .Where(t => t.TenantId == tenantId && !t.IsDeleted
                     && t.TransactionDate >= start && t.TransactionDate <= end)
            .Select(t => new { t.Type, t.Amount, t.TransactionDate })
            .ToListAsync(ct);

        var totalRevenue = transactions.Where(t => t.Type == TransactionType.Revenue).Sum(t => t.Amount);
        var totalExpense = transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
        var revenueItems = transactions.Where(t => t.Type == TransactionType.Revenue).ToList();
        var averageTicket = revenueItems.Count > 0 ? revenueItems.Average(t => t.Amount) : 0m;

        var appointments = await _db.Appointments
            .AsNoTracking()
            .Where(a => a.TenantId == tenantId && !a.IsDeleted
                     && a.Date >= start && a.Date <= end)
            .Select(a => new { a.Status, a.ClientId, a.Date, a.FinalPrice, a.ServiceId })
            .ToListAsync(ct);

        var total         = appointments.Count;
        var cancelledCount = appointments.Count(a => a.Status == AppointmentStatus.Cancelled);
        var completedCount = appointments.Count(a => a.Status == AppointmentStatus.Completed);
        var uniqueClients = appointments.Select(a => a.ClientId).Distinct().Count();

        var completedServiceIds = appointments
            .Where(a => a.Status == AppointmentStatus.Completed)
            .Select(a => a.ServiceId)
            .Distinct()
            .ToList();

        var serviceNames = await _db.Services
            .AsNoTracking()
            .Where(s => completedServiceIds.Contains(s.Id))
            .Select(s => new { s.Id, s.Name })
            .ToListAsync(ct);

        var topServices = appointments
            .Where(a => a.Status == AppointmentStatus.Completed)
            .GroupBy(a => a.ServiceId)
            .Select(g => new
            {
                ServiceId = g.Key,
                Count     = g.Count(),
                Revenue   = g.Sum(a => a.FinalPrice)
            })
            .OrderByDescending(g => g.Revenue)
            .Take(5)
            .Select(g => new TopServiceDto(
                serviceNames.FirstOrDefault(s => s.Id == g.ServiceId)?.Name ?? "Serviço",
                g.Count,
                g.Revenue))
            .ToList();

        var apptCountByDate = appointments
            .GroupBy(a => a.Date)
            .ToDictionary(g => g.Key, g => g.Count());

        var dailyRevenue = transactions
            .GroupBy(t => t.TransactionDate)
            .OrderBy(g => g.Key)
            .Select(g => new DailyRevenueDto(
                g.Key.ToString("yyyy-MM-dd"),
                g.Where(t => t.Type == TransactionType.Revenue).Sum(t => t.Amount),
                g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
                apptCountByDate.TryGetValue(g.Key, out var c) ? c : 0))
            .ToList();

        return new DashboardDto(
            totalRevenue,
            totalExpense,
            totalRevenue - totalExpense,
            averageTicket,
            total,
            cancelledCount,
            completedCount,
            uniqueClients,
            total > 0 ? Math.Round((decimal)cancelledCount / total * 100, 2) : 0,
            topServices,
            dailyRevenue);
    }
}
