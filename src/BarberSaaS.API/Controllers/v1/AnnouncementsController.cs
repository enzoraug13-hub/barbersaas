using BarberSaaS.Application.Announcements.Commands;
using BarberSaaS.Application.Announcements.Queries;
using BarberSaaS.Application.Common.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

/// <summary>
/// Lado do DONO da central de avisos: comunicados que o Trimly (super admin)
/// publicou para esta barbearia — broadcasts + os direcionados a ela. O tenant
/// vem exclusivamente do JWT (handlers usam ICurrentTenant), então cada dono só
/// enxerga e marca como lido o que é dele. Publicação/remoção ficam no
/// SuperAdminController.
/// </summary>
[ApiController]
[Route("api/v1/announcements")]
[Authorize(Policy = "RequireOwner")]
public class AnnouncementsController : ControllerBase
{
    private readonly IMediator _mediator;
    public AnnouncementsController(IMediator mediator) => _mediator = mediator;

    /// <summary>Avisos visíveis à barbearia logada, com marcação de lido.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<MyAnnouncementDto>>.Ok(
            await _mediator.Send(new ListMyAnnouncementsQuery(), ct)));

    /// <summary>Marca um aviso como lido pela barbearia logada (idempotente).</summary>
    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
        => Ok(ApiResponse<bool>.Ok(
            await _mediator.Send(new MarkAnnouncementReadCommand(id), ct), "Aviso marcado como lido."));
}
