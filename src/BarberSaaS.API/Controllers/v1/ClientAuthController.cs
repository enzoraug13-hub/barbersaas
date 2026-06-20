using BarberSaaS.Application.ClientAuth.Commands;
using BarberSaaS.Application.Common.DTOs;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/client-auth")]
public class ClientAuthController : ControllerBase
{
    private readonly IMediator _mediator;
    public ClientAuthController(IMediator mediator) => _mediator = mediator;

    /// <summary>Pede o código OTP por telefone. Find-or-create — não distingue login/cadastro.</summary>
    [HttpPost("request-otp")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpCommand command, CancellationToken ct)
        => Ok(ApiResponse<RequestOtpResult>.Ok(await _mediator.Send(command, ct), "Código enviado."));

    /// <summary>Verifica o OTP e retorna o token de acesso do cliente.</summary>
    [HttpPost("verify-otp")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyClientOtpCommand command, CancellationToken ct)
        => Ok(ApiResponse<ClientAuthResult>.Ok(await _mediator.Send(command, ct)));
}
