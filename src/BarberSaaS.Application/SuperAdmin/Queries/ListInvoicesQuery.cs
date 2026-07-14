using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;

namespace BarberSaaS.Application.SuperAdmin.Queries;

/// <summary>Faturas do Trimly. Filtros opcionais: status, janela de vencimento, tenant.</summary>
public record ListInvoicesQuery(
    InvoiceStatus? Status = null,
    DateOnly? From = null,
    DateOnly? To = null,
    Guid? TenantId = null) : IRequest<IReadOnlyList<InvoiceDto>>;

public record InvoiceDto(
    Guid Id,
    Guid TenantId,
    string TenantName,
    int CompetenceYear,
    int CompetenceMonth,
    decimal Amount,
    DateOnly DueDate,
    string Status,          // "Open" | "Paid"
    DateTime? PaidAt,
    string? ReceiptUrl,
    string? Notes);

public class ListInvoicesHandler : IRequestHandler<ListInvoicesQuery, IReadOnlyList<InvoiceDto>>
{
    private readonly IInvoiceRepository _invoices;
    public ListInvoicesHandler(IInvoiceRepository invoices) => _invoices = invoices;

    public async Task<IReadOnlyList<InvoiceDto>> Handle(ListInvoicesQuery request, CancellationToken ct)
    {
        var rows = await _invoices.ListAsync(request.Status, request.From, request.To, request.TenantId, ct);
        return rows.Select(r => new InvoiceDto(
            r.Id, r.TenantId, r.TenantName, r.CompetenceYear, r.CompetenceMonth,
            r.Amount, r.DueDate, ((InvoiceStatus)r.Status).ToString(),
            r.PaidAt, r.ReceiptUrl, r.Notes)).ToList();
    }
}
