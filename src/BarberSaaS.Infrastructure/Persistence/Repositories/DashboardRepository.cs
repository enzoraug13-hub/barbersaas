using BarberSaaS.Application.Barbers.Queries;
using BarberSaaS.Application.Dashboard.Queries;
using BarberSaaS.Domain.Entities;
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

    public async Task<IReadOnlyList<MonthlyRevenueDto>> GetMonthlyRevenueAsync(Guid tenantId, int months, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var firstMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(-(months - 1));
        var start = firstMonth;
        var end = today;

        var transactions = await _db.FinancialTransactions
            .AsNoTracking()
            .Where(t => t.TenantId == tenantId && !t.IsDeleted
                     && t.TransactionDate >= start && t.TransactionDate <= end)
            .Select(t => new { t.Type, t.Amount, t.TransactionDate })
            .ToListAsync(ct);

        var byMonth = transactions
            .GroupBy(t => new DateOnly(t.TransactionDate.Year, t.TransactionDate.Month, 1))
            .ToDictionary(g => g.Key, g => (
                Revenue: g.Where(t => t.Type == TransactionType.Revenue).Sum(t => t.Amount),
                Expense: g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount)));

        var result = new List<MonthlyRevenueDto>();
        for (var m = firstMonth; m <= today; m = m.AddMonths(1))
        {
            var (revenue, expense) = byMonth.TryGetValue(m, out var v) ? v : (0m, 0m);
            result.Add(new MonthlyRevenueDto(m.ToString("yyyy-MM"), revenue, expense));
        }
        return result;
    }

    // Série mensal de UM barbeiro: faturamento (FinalPrice dos concluídos) + nº de atendimentos.
    // Mesmo padrão SQLite-safe do GetMonthlyRevenueAsync: consulta plana + agrupamento em memória
    // (sem CROSS APPLY). Preenche todos os meses do intervalo, mesmo os zerados.
    public async Task<IReadOnlyList<BarberMonthlyPointDto>> GetBarberMonthlySeriesAsync(Guid tenantId, Guid barberId, int months, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var firstMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(-(months - 1));

        var appts = await _db.Appointments
            .AsNoTracking()
            .Where(a => a.TenantId == tenantId && !a.IsDeleted && a.BarberId == barberId
                     && a.Date >= firstMonth && a.Date <= today
                     && a.Status == AppointmentStatus.Completed)
            .Select(a => new { a.Date, a.FinalPrice })
            .ToListAsync(ct);

        var byMonth = appts
            .GroupBy(a => new DateOnly(a.Date.Year, a.Date.Month, 1))
            .ToDictionary(g => g.Key, g => (Revenue: g.Sum(a => a.FinalPrice), Count: g.Count()));

        var result = new List<BarberMonthlyPointDto>();
        for (var m = firstMonth; m <= today; m = m.AddMonths(1))
        {
            var (revenue, count) = byMonth.TryGetValue(m, out var v) ? v : (0m, 0);
            result.Add(new BarberMonthlyPointDto(m.ToString("yyyy-MM"), revenue, count));
        }
        return result;
    }

    // Formas de pagamento: soma o FinalPrice dos atendimentos concluídos e pagos do
    // período, agrupado por método. Filtra por Date (mesma semântica das outras seções
    // baseadas em agendamento). PaymentMethod nulo é ignorado.
    public async Task<PaymentMethodsDto> GetPaymentMethodsAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default)
    {
        var paid = await _db.Appointments
            .AsNoTracking()
            .Where(a => a.TenantId == tenantId && !a.IsDeleted
                     && a.Status == AppointmentStatus.Completed && a.IsPaid
                     && a.PaymentMethod != null
                     && a.Date >= start && a.Date <= end)
            .Select(a => new { a.PaymentMethod, a.FinalPrice })
            .ToListAsync(ct);

        decimal Sum(PaymentMethod m) => paid.Where(p => p.PaymentMethod == m).Sum(p => p.FinalPrice);
        var cash   = Sum(PaymentMethod.Cash);
        var pix    = Sum(PaymentMethod.Pix);
        var credit = Sum(PaymentMethod.Credit);
        var debit  = Sum(PaymentMethod.Debit);
        var other  = Sum(PaymentMethod.Other);
        return new PaymentMethodsDto(cash, pix, credit, debit, other, cash + pix + credit + debit + other);
    }

    // Índice 0 = segunda, 6 = domingo. DayOfWeek do .NET é 0=domingo..6=sábado.
    private static int MondayFirstIndex(DayOfWeek d) => ((int)d + 6) % 7;

    public async Task<IReadOnlyList<BarberPerformanceDto>> GetBarberPerformanceAsync(Guid tenantId, DateOnly start, DateOnly end, CancellationToken ct = default)
    {
        var barbers = await _db.Barbers
            .AsNoTracking()
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .OrderBy(b => b.DisplayOrder)
            .Select(b => new { b.Id, b.Name, b.PhotoUrl, b.IsActive })
            .ToListAsync(ct);

        if (barbers.Count == 0) return Array.Empty<BarberPerformanceDto>();

        var barberIds = barbers.Select(b => b.Id).ToList();

        var appointments = await _db.Appointments
            .AsNoTracking()
            .Where(a => a.TenantId == tenantId && !a.IsDeleted && barberIds.Contains(a.BarberId)
                     && a.Date >= start && a.Date <= end && a.Status != AppointmentStatus.Cancelled)
            .Select(a => new { a.BarberId, a.Date, a.StartTime, a.EndTime, a.FinalPrice, a.Status })
            .ToListAsync(ct);

        // Consulta direta no DbSet de WorkShifts (join simples), em vez de
        // SelectMany sobre a navegação WorkSchedule.WorkShifts: esse padrão gera
        // CROSS APPLY no SQL translation do EF Core, que o provider do SQLite
        // não suporta (suportado no SQL Server) — quebrava só em dev.
        var shifts = await _db.WorkShifts
            .AsNoTracking()
            .Where(s => s.IsActive && s.WorkSchedule!.IsActive && barberIds.Contains(s.WorkSchedule!.BarberId))
            .Select(s => new { s.WorkSchedule!.BarberId, s.DayOfWeek, s.StartTime, s.EndTime })
            .ToListAsync(ct);

        var daysOff = await _db.DaysOff
            .AsNoTracking()
            .Where(d => barberIds.Contains(d.BarberId) && d.Date >= start && d.Date <= end && d.IsFullDay)
            .Select(d => new { d.BarberId, d.Date })
            .ToListAsync(ct);

        return barbers.Select(b =>
        {
            var bAppts = appointments.Where(a => a.BarberId == b.Id).ToList();
            var revenue = bAppts.Where(a => a.Status == AppointmentStatus.Completed).Sum(a => a.FinalPrice);

            var weekly = new int[7];
            foreach (var a in bAppts) weekly[MondayFirstIndex(a.Date.DayOfWeek)]++;

            var bShifts = shifts.Where(s => s.BarberId == b.Id).ToList();
            var bDaysOff = daysOff.Where(d => d.BarberId == b.Id).Select(d => d.Date).ToHashSet();

            decimal capacityMinutes = 0;
            for (var day = start; day <= end; day = day.AddDays(1))
            {
                if (bDaysOff.Contains(day)) continue;
                capacityMinutes += bShifts
                    .Where(s => s.DayOfWeek == day.DayOfWeek)
                    .Sum(s => (decimal)(s.EndTime - s.StartTime).TotalMinutes);
            }
            var bookedMinutes = bAppts.Sum(a => (decimal)(a.EndTime - a.StartTime).TotalMinutes);
            var occupancy = capacityMinutes > 0 ? Math.Round(Math.Min(100, bookedMinutes / capacityMinutes * 100), 1) : 0;

            return new BarberPerformanceDto(b.Id, b.Name, b.PhotoUrl, b.IsActive, bAppts.Count, revenue, occupancy, weekly);
        })
        .ToList();
    }
}
