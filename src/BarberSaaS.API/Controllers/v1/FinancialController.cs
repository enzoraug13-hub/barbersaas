using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Financial.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class FinancialController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenant _tenant;
    private readonly ICurrentUser _user;
    private readonly IFinancialRepository _financial;

    public FinancialController(IMediator mediator, ICurrentTenant tenant, ICurrentUser user, IFinancialRepository financial)
    {
        _mediator = mediator; _tenant = tenant; _user = user; _financial = financial;
    }

    [HttpGet]
    public async Task<IActionResult> GetByPeriod([FromQuery] DateOnly start, [FromQuery] DateOnly end, CancellationToken ct)
    {
        var list = await _financial.GetByPeriodAsync(_tenant.Id, start, end, ct);
        return Ok(ApiResponse<object>.Ok(list));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTransactionRequest request, CancellationToken ct)
    {
        var command = new CreateTransactionCommand(
            _tenant.Id, _user.Id, request.Type, request.Category,
            request.Description, request.Amount, request.DueDate,
            request.AppointmentId, request.BarberId, request.Notes);
        var result = await _mediator.Send(command, ct);
        return Ok(ApiResponse<TransactionDto>.Ok(result));
    }

    // Correção retroativa (idempotente): lança as receitas de agendamentos concluídos
    // que ficaram sem FinancialTransaction. Seguro rodar mais de uma vez.
    [HttpPost("backfill-appointments")]
    public async Task<IActionResult> BackfillAppointments(CancellationToken ct)
    {
        var created = await _mediator.Send(new BackfillAppointmentRevenueCommand(_tenant.Id, _user.Id), ct);
        return Ok(ApiResponse<object>.Ok(new { created },
            created > 0 ? $"{created} receita(s) criada(s) retroativamente." : "Nada a corrigir — tudo em dia."));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] DateOnly start, [FromQuery] DateOnly end, CancellationToken ct)
    {
        var revenue = await _financial.GetTotalRevenueAsync(_tenant.Id, start, end, ct);
        var expense = await _financial.GetTotalExpenseAsync(_tenant.Id, start, end, ct);
        return Ok(ApiResponse<object>.Ok(new { Revenue = revenue, Expense = expense, NetProfit = revenue - expense }));
    }
}

public record CreateTransactionRequest(
    BarberSaaS.Domain.Enums.TransactionType Type,
    BarberSaaS.Domain.Enums.TransactionCategory Category,
    string Description,
    decimal Amount,
    DateOnly DueDate,
    Guid? AppointmentId,
    Guid? BarberId,
    string? Notes);
