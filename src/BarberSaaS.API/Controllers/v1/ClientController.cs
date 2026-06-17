using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.API.Controllers.v1;

/// <summary>
/// Área do cliente autenticado por telefone/OTP. Todas as rotas usam o id do
/// próprio cliente (claim `sub`) — um cliente só acessa os próprios dados.
/// </summary>
[ApiController]
[Route("api/v1/client")]
[Authorize(Policy = "RequireClient")]
public class ClientController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _user; // sub = clientId

    public ClientController(AppDbContext db, ICurrentUser user)
    {
        _db = db; _user = user;
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var c = await _db.Clients.AsNoTracking().FirstOrDefaultAsync(x => x.Id == _user.Id, ct);
        if (c == null) return NotFound();
        return Ok(ApiResponse<object>.Ok(new
        {
            c.Id, c.Name, Phone = c.PhoneNumber, c.Email, c.LoyaltyPoints, c.TotalVisits
        }));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateClientProfileRequest req, CancellationToken ct)
    {
        var c = await _db.Clients.FirstOrDefaultAsync(x => x.Id == _user.Id, ct);
        if (c == null) return NotFound();
        if (!string.IsNullOrWhiteSpace(req.Name)) c.Name = req.Name.Trim();
        if (req.Email != null) c.Email = req.Email;
        await _db.SaveChangesAsync(ct);
        return Ok(ApiResponse<bool>.Ok(true, "Perfil atualizado."));
    }

    [HttpGet("appointments")]
    public async Task<IActionResult> MyAppointments(CancellationToken ct)
    {
        var list = await _db.Appointments.AsNoTracking()
            .Include(a => a.Barber).Include(a => a.Service)
            .Where(a => a.ClientId == _user.Id)
            .OrderByDescending(a => a.Date).ThenByDescending(a => a.StartTime)
            .Select(a => new
            {
                a.Id, a.Date, a.StartTime, a.EndTime, a.FinalPrice,
                Status  = a.Status.ToString(),
                Barber  = a.Barber!.Name,
                Service = a.Service!.Name
            })
            .ToListAsync(ct);
        return Ok(ApiResponse<object>.Ok(list));
    }
}

public record UpdateClientProfileRequest(string? Name, string? Email);
