using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Financial.Commands;

public record CreateTransactionCommand(
    Guid TenantId,
    Guid CreatedByUserId,
    TransactionType Type,
    TransactionCategory Category,
    string Description,
    decimal Amount,
    DateOnly DueDate,
    Guid? AppointmentId = null,
    Guid? BarberId = null,
    string? Notes = null) : IRequest<TransactionDto>;

public record TransactionDto(
    Guid Id, TransactionType Type, TransactionCategory Category,
    string Description, decimal Amount, decimal PaidAmount,
    TransactionStatus Status, DateOnly DueDate, DateOnly TransactionDate);

public class CreateTransactionValidator : AbstractValidator<CreateTransactionCommand>
{
    public CreateTransactionValidator()
    {
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Amount).GreaterThan(0);
    }
}

public class CreateTransactionHandler : IRequestHandler<CreateTransactionCommand, TransactionDto>
{
    private readonly IFinancialRepository _financial;
    private readonly ICacheService _cache;

    public CreateTransactionHandler(IFinancialRepository financial, ICacheService cache)
    {
        _financial = financial; _cache = cache;
    }

    public async Task<TransactionDto> Handle(CreateTransactionCommand request, CancellationToken ct)
    {
        var tx = new FinancialTransaction
        {
            TenantId        = request.TenantId,
            Type            = request.Type,
            Category        = request.Category,
            Description     = request.Description,
            Amount          = request.Amount,
            DueDate         = request.DueDate,
            AppointmentId   = request.AppointmentId,
            BarberId        = request.BarberId,
            CreatedByUserId = request.CreatedByUserId,
            Notes           = request.Notes
        };
        await _financial.AddAsync(tx, ct);

        // Mesmo motivo do AppointmentCompletedFinancialHandler/Backfill: o resumo do
        // dashboard fica 5 min em cache — sem limpar, o lançamento manual (ex.: despesa)
        // não aparece nos números até o TTL vencer.
        await _cache.RemoveByPatternAsync($"dashboard:{request.TenantId}:*");

        return new TransactionDto(tx.Id, tx.Type, tx.Category, tx.Description, tx.Amount, tx.PaidAmount, tx.Status, tx.DueDate, tx.TransactionDate);
    }
}
