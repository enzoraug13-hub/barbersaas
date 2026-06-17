using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwnerOrAdmin")]
public class ClientsController : ControllerBase
{
    private readonly IClientRepository _clients;
    private readonly ICurrentTenant _tenant;

    public ClientsController(IClientRepository clients, ICurrentTenant tenant)
    {
        _clients = clients; _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, CancellationToken ct)
    {
        var all = await _clients.GetAllAsync(ct);
        if (!string.IsNullOrEmpty(search))
            all = all.Where(c => c.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                                 c.PhoneNumber.Contains(search)).ToList();

        return Ok(ApiResponse<object>.Ok(all.Select(c => new
        {
            c.Id, c.Name, c.PhoneNumber, c.Email,
            c.TotalVisits, c.LastVisitAt, c.LoyaltyPoints, c.IsBlocked
        })));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var client = await _clients.GetByIdAsync(id, ct);
        if (client == null) return NotFound();
        return Ok(ApiResponse<object>.Ok(client));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClientRequest request, CancellationToken ct)
    {
        if (await _clients.PhoneExistsAsync(request.Phone, _tenant.Id, ct))
            return Conflict(ApiResponse<bool>.Fail("Já existe um cliente com este telefone."));

        var client = new Domain.Entities.Client
        {
            Name        = request.Name,
            PhoneNumber = request.Phone,
            Email       = request.Email,
        };
        await _clients.AddAsync(client, ct);
        return Ok(ApiResponse<object>.Ok(new { client.Id, client.Name, client.PhoneNumber, client.Email }));
    }

    [HttpPatch("{id:guid}/block")]
    public async Task<IActionResult> Block(Guid id, [FromBody] BlockClientRequest request, CancellationToken ct)
    {
        var client = await _clients.GetByIdAsync(id, ct);
        if (client == null) return NotFound();
        client.IsBlocked   = true;
        client.BlockReason = request.Reason;
        await _clients.UpdateAsync(client, ct);
        return Ok(ApiResponse<bool>.Ok(true));
    }

    [HttpPatch("{id:guid}/unblock")]
    public async Task<IActionResult> Unblock(Guid id, CancellationToken ct)
    {
        var client = await _clients.GetByIdAsync(id, ct);
        if (client == null) return NotFound();
        client.IsBlocked   = false;
        client.BlockReason = null;
        await _clients.UpdateAsync(client, ct);
        return Ok(ApiResponse<bool>.Ok(true));
    }
}

public record BlockClientRequest(string Reason);
public record CreateClientRequest(string Name, string Phone, string? Email);
