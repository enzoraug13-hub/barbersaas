using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.SuperAdmin.Queries;

/// <summary>
/// Resumo financeiro do TRIMLY (o que as barbearias me pagam). Sem período
/// explícito, usa o mês corrente. A série temporal vem por competência.
/// </summary>
public record GetBillingSummaryQuery(
    DateOnly? From = null,
    DateOnly? To = null,
    int Months = 6) : IRequest<BillingSummaryDto>;

public record BillingSummaryDto(
    decimal Received,
    decimal Outstanding,
    int PaidCount,
    int OpenCount,
    DateOnly From,
    DateOnly To,
    IReadOnlyList<MonthlyPointDto> Monthly);

public record MonthlyPointDto(int Year, int Month, string Label, decimal Received);

public class GetBillingSummaryHandler : IRequestHandler<GetBillingSummaryQuery, BillingSummaryDto>
{
    private static readonly string[] MonthAbbr =
        ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    private readonly IInvoiceRepository _invoices;
    public GetBillingSummaryHandler(IInvoiceRepository invoices) => _invoices = invoices;

    public async Task<BillingSummaryDto> Handle(GetBillingSummaryQuery request, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var from  = request.From ?? new DateOnly(today.Year, today.Month, 1);
        var to    = request.To   ?? from.AddMonths(1).AddDays(-1);
        var months = Math.Clamp(request.Months, 1, 24);

        var (received, outstanding, paidCount, openCount) = await _invoices.GetSummaryAsync(from, to, ct);
        var series = await _invoices.GetMonthlyReceivedAsync(months, ct);

        return new BillingSummaryDto(
            received, outstanding, paidCount, openCount, from, to,
            series.Select(s => new MonthlyPointDto(s.Year, s.Month, MonthAbbr[s.Month], s.Received)).ToList());
    }
}
