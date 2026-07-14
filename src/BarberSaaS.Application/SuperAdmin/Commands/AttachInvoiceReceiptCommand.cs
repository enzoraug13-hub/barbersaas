using BarberSaaS.Application.Common.Interfaces;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>
/// Anexa o comprovante do Pix. Recebe a URL já devolvida por POST /uploads
/// (IFileStorage) — este comando só guarda o ponteiro. Null/vazio remove o anexo.
///
/// ATENÇÃO (produção): sem o Cloudflare R2 configurado, o upload cai no disco
/// efêmero do Railway e o arquivo some no próximo deploy. Por isso o comprovante
/// é opcional e o status Paid nunca depende dele.
/// </summary>
public record AttachInvoiceReceiptCommand(Guid InvoiceId, string? ReceiptUrl) : IRequest<bool>;

public class AttachInvoiceReceiptValidator : AbstractValidator<AttachInvoiceReceiptCommand>
{
    public AttachInvoiceReceiptValidator()
    {
        RuleFor(x => x.InvoiceId).NotEmpty();
        RuleFor(x => x.ReceiptUrl).MaximumLength(500);
    }
}

public class AttachInvoiceReceiptHandler : IRequestHandler<AttachInvoiceReceiptCommand, bool>
{
    private readonly IInvoiceRepository _invoices;
    public AttachInvoiceReceiptHandler(IInvoiceRepository invoices) => _invoices = invoices;

    public async Task<bool> Handle(AttachInvoiceReceiptCommand request, CancellationToken ct)
    {
        var invoice = await _invoices.GetByIdAsync(request.InvoiceId, ct)
            ?? throw new Domain.Exceptions.DomainException("Fatura não encontrada.");

        invoice.ReceiptUrl = string.IsNullOrWhiteSpace(request.ReceiptUrl) ? null : request.ReceiptUrl;
        await _invoices.SaveChangesAsync(ct);
        return true;
    }
}
