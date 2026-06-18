using BarberSaaS.Application.Clients.Commands;
using BarberSaaS.Application.Clients.Queries;
using BarberSaaS.Application.Common.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class ClientsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ClientsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, CancellationToken ct)
    {
        var clients = await _mediator.Send(new GetClientsQuery(search), ct);
        return Ok(ApiResponse<IReadOnlyList<ClientListItemDto>>.Ok(clients));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var client = await _mediator.Send(new GetClientByIdQuery(id), ct);
        return client is null ? NotFound() : Ok(ApiResponse<ClientListItemDto>.Ok(client));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClientCommand command, CancellationToken ct)
    {
        var created = await _mediator.Send(command, ct);
        return created is null
            ? Conflict(ApiResponse<bool>.Fail("Já existe um cliente com este telefone."))
            : Ok(ApiResponse<ClientListItemDto>.Ok(created));
    }

    [HttpPatch("{id:guid}/block")]
    public async Task<IActionResult> Block(Guid id, [FromBody] BlockClientRequest request, CancellationToken ct)
    {
        var ok = await _mediator.Send(new BlockClientCommand(id, request.Reason), ct);
        return ok ? Ok(ApiResponse<bool>.Ok(true)) : NotFound();
    }

    [HttpPatch("{id:guid}/unblock")]
    public async Task<IActionResult> Unblock(Guid id, CancellationToken ct)
    {
        var ok = await _mediator.Send(new UnblockClientCommand(id), ct);
        return ok ? Ok(ApiResponse<bool>.Ok(true)) : NotFound();
    }
}

public record BlockClientRequest(string? Reason);
