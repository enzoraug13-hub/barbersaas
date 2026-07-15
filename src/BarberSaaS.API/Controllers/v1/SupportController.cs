using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Support;
using BarberSaaS.Application.Support.Commands;
using BarberSaaS.Application.Support.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

/// <summary>
/// Lado do DONO do canal de suporte: ele escreve ao Trimly ("queria tal recurso")
/// e lê as respostas do super admin — o sentido inverso dos avisos. O tenant vem
/// exclusivamente do JWT (handlers usam ICurrentTenant), então cada dono só
/// enxerga a própria conversa; não existe endpoint com id de conversa aqui.
/// A caixa de entrada e as respostas ficam no SuperAdminController.
/// </summary>
[ApiController]
[Route("api/v1/support")]
[Authorize(Policy = "RequireOwner")]
public class SupportController : ControllerBase
{
    private readonly IMediator _mediator;
    public SupportController(IMediator mediator) => _mediator = mediator;

    /// <summary>A conversa da barbearia logada com o Trimly, em ordem cronológica.</summary>
    [HttpGet("messages")]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<SupportMessageDto>>.Ok(
            await _mediator.Send(new ListMySupportMessagesQuery(), ct)));

    /// <summary>Envia uma mensagem ao Trimly.</summary>
    [HttpPost("messages")]
    public async Task<IActionResult> Send([FromBody] SendSupportMessageCommand command, CancellationToken ct)
        => Ok(ApiResponse<SupportMessageDto>.Ok(
            await _mediator.Send(command, ct), "Mensagem enviada."));

    /// <summary>Marca as respostas do Trimly como lidas (em massa, idempotente).</summary>
    [HttpPost("messages/read")]
    public async Task<IActionResult> MarkRead(CancellationToken ct)
        => Ok(ApiResponse<object>.Ok(
            new { marked = await _mediator.Send(new MarkSupportRepliesReadCommand(), ct) },
            "Respostas marcadas como lidas."));
}
