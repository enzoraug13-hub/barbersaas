using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.SuperAdmin.Queries;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>Emite a fatura de um mês para uma barbearia. Nasce Open (Pix manual).</summary>
public record CreateInvoiceCommand(
    Guid TenantId,
    int CompetenceYear,
    int CompetenceMonth,
    decimal Amount,
    DateOnly DueDate,
    string? Notes = null) : IRequest<InvoiceDto>;

public class CreateInvoiceValidator : AbstractValidator<CreateInvoiceCommand>
{
    public CreateInvoiceValidator()
    {
        RuleFor(x => x.TenantId).NotEmpty();
        RuleFor(x => x.CompetenceYear).InclusiveBetween(2020, 2100);
        RuleFor(x => x.CompetenceMonth).InclusiveBetween(1, 12).WithMessage("Mês da competência deve ser 1–12.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("O valor deve ser maior que zero.");
        RuleFor(x => x.DueDate).NotEmpty();
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public class CreateInvoiceHandler : IRequestHandler<CreateInvoiceCommand, InvoiceDto>
{
    private readonly IInvoiceRepository _invoices;
    private readonly ISuperAdminRepository _superAdmin;
    private readonly ILogger<CreateInvoiceHandler> _logger;

    public CreateInvoiceHandler(IInvoiceRepository invoices, ISuperAdminRepository superAdmin,
        ILogger<CreateInvoiceHandler> logger)
    {
        _invoices = invoices; _superAdmin = superAdmin; _logger = logger;
    }

    public async Task<InvoiceDto> Handle(CreateInvoiceCommand request, CancellationToken ct)
    {
        var tenant = await _superAdmin.GetTenantAsync(request.TenantId, ct)
            ?? throw new Domain.Exceptions.DomainException("Barbearia não encontrada.");

        // Checagem amigável; o índice único (TenantId, ano, mês) é a garantia real.
        if (await _invoices.ExistsForCompetenceAsync(request.TenantId, request.CompetenceYear, request.CompetenceMonth, ct))
            throw new Domain.Exceptions.DomainException(
                $"Já existe fatura de {request.CompetenceMonth:00}/{request.CompetenceYear} para esta barbearia.");

        var invoice = new Invoice
        {
            TenantId        = request.TenantId,
            CompetenceYear  = request.CompetenceYear,
            CompetenceMonth = request.CompetenceMonth,
            Amount          = request.Amount,
            DueDate         = request.DueDate,
            Status          = InvoiceStatus.Open,
            Notes           = request.Notes
        };
        await _invoices.AddAsync(invoice, ct);

        _logger.LogInformation("SUPER ADMIN: fatura {InvoiceId} criada ({Month:00}/{Year}, R$ {Amount}) para {Tenant}",
            invoice.Id, invoice.CompetenceMonth, invoice.CompetenceYear, invoice.Amount, tenant.Name);

        return new InvoiceDto(invoice.Id, tenant.Id, tenant.Name,
            invoice.CompetenceYear, invoice.CompetenceMonth, invoice.Amount, invoice.DueDate,
            invoice.Status.ToString(), invoice.PaidAt, invoice.ReceiptUrl, invoice.Notes);
    }
}
