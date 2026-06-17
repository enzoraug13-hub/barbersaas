using BarberSaaS.Application.Appointments.Commands.CancelAppointment;
using BarberSaaS.Application.Appointments.Commands.CompleteAppointment;
using BarberSaaS.Application.Appointments.Commands.CreateAppointment;
using BarberSaaS.Application.Appointments.Queries.GetAvailableSlots;
using BarberSaaS.Application.Appointments.Queries.GetAppointments;
using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireBarber")]
public class AppointmentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentTenant _tenant;
    private readonly ICurrentUser _user;

    public AppointmentsController(IMediator mediator, ICurrentTenant tenant, ICurrentUser user)
    {
        _mediator = mediator; _tenant = tenant; _user = user;
    }

    [HttpGet("slots")]
    public async Task<IActionResult> GetSlots([FromQuery] Guid barberId, [FromQuery] Guid serviceId, [FromQuery] DateOnly date, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAvailableSlotsQuery(barberId, serviceId, date, _tenant.Id), ct);
        return Ok(ApiResponse<IReadOnlyList<SlotDto>>.Ok(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest request, CancellationToken ct)
    {
        var command = new CreateAppointmentCommand(
            _tenant.Id, request.BarberId, request.ServiceId,
            request.ClientName, request.ClientPhone, request.ClientEmail,
            request.Date, request.StartTime, request.Notes);
        var result = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetByDate), new { date = request.Date }, ApiResponse<AppointmentResultDto>.Ok(result));
    }

    [HttpGet]
    public async Task<IActionResult> GetByDate([FromQuery] DateOnly date, [FromQuery] Guid? barberId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAppointmentsQuery(_tenant.Id, date, barberId), ct);
        return Ok(ApiResponse<IReadOnlyList<AppointmentListDto>>.Ok(result));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelRequest request, CancellationToken ct)
    {
        await _mediator.Send(new CancelAppointmentCommand(id, _user.Id, request.Reason), ct);
        return Ok(ApiResponse<bool>.Ok(true, "Agendamento cancelado."));
    }

    [HttpPatch("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id, [FromBody] CompleteRequest request, CancellationToken ct)
    {
        await _mediator.Send(new CompleteAppointmentCommand(id, (PaymentMethod)request.PaymentMethod, _user.Id), ct);
        return Ok(ApiResponse<bool>.Ok(true, "Agendamento concluído."));
    }
}

public record CreateAppointmentRequest(Guid BarberId, Guid ServiceId, string ClientName, string ClientPhone, string? ClientEmail, DateOnly Date, TimeOnly StartTime, string? Notes);
public record CancelRequest(string? Reason);
public record CompleteRequest(int PaymentMethod);
