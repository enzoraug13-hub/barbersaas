using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Application.Common.Interfaces;

/// <summary>Fatura + o nome da barbearia (join), pra listagem do super admin.</summary>
public record InvoiceRow(
    Guid Id,
    Guid TenantId,
    string TenantName,
    int CompetenceYear,
    int CompetenceMonth,
    decimal Amount,
    DateOnly DueDate,
    byte Status,
    DateTime? PaidAt,
    string? ReceiptUrl,
    string? Notes);

/// <summary>Total recebido num mês — série temporal do painel.</summary>
public record MonthlyRevenueRow(int Year, int Month, decimal Received);

/// <summary>
/// Faturas que as barbearias pagam AO TRIMLY. Assim como o ISuperAdminRepository,
/// é cross-tenant por natureza (IgnoreQueryFilters) e só pode ser alcançado por
/// endpoints sob a policy RequireSuperAdmin. Não toca no financeiro das barbearias.
/// </summary>
public interface IInvoiceRepository
{
    Task<IReadOnlyList<InvoiceRow>> ListAsync(
        InvoiceStatus? status, DateOnly? from, DateOnly? to, Guid? tenantId, CancellationToken ct = default);

    Task<Invoice?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsForCompetenceAsync(Guid tenantId, int year, int month, CancellationToken ct = default);
    Task AddAsync(Invoice invoice, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);

    /// <summary>Recebido (Paid) e em aberto (Open) num período, pelo VENCIMENTO da fatura.</summary>
    Task<(decimal Received, decimal Outstanding, int PaidCount, int OpenCount)> GetSummaryAsync(
        DateOnly from, DateOnly to, CancellationToken ct = default);

    /// <summary>Série de recebidos por mês de competência, últimos N meses (inclui meses zerados).</summary>
    Task<IReadOnlyList<MonthlyRevenueRow>> GetMonthlyReceivedAsync(int months, CancellationToken ct = default);
}
