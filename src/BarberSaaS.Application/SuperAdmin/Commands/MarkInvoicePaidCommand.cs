using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>
/// Recebi o Pix → marco a fatura como paga. PaidAt opcional (o dinheiro pode ter
/// caído ontem); sem valor, usa agora. Reversível via <see cref="Paid"/> = false —
/// erro de clique não deve exigir mexer no banco.
/// </summary>
public record MarkInvoicePaidCommand(Guid InvoiceId, bool Paid = true, DateTime? PaidAt = null) : IRequest<string>;

public class MarkInvoicePaidValidator : AbstractValidator<MarkInvoicePaidCommand>
{
    public MarkInvoicePaidValidator() => RuleFor(x => x.InvoiceId).NotEmpty();
}

public class MarkInvoicePaidHandler : IRequestHandler<MarkInvoicePaidCommand, string>
{
    private readonly IInvoiceRepository _invoices;
    private readonly ILogger<MarkInvoicePaidHandler> _logger;

    public MarkInvoicePaidHandler(IInvoiceRepository invoices, ILogger<MarkInvoicePaidHandler> logger)
    {
        _invoices = invoices; _logger = logger;
    }

    public async Task<string> Handle(MarkInvoicePaidCommand request, CancellationToken ct)
    {
        var invoice = await _invoices.GetByIdAsync(request.InvoiceId, ct)
            ?? throw new Domain.Exceptions.DomainException("Fatura não encontrada.");

        if (request.Paid)
        {
            invoice.Status = InvoiceStatus.Paid;
            invoice.PaidAt = request.PaidAt ?? DateTime.UtcNow;
        }
        else
        {
            invoice.Status = InvoiceStatus.Open;
            invoice.PaidAt = null;
        }

        await _invoices.SaveChangesAsync(ct);

        _logger.LogInformation("SUPER ADMIN: fatura {InvoiceId} marcada como {Status}",
            invoice.Id, invoice.Status);

        return invoice.Status.ToString();
    }
}
