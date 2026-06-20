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

    /// <summary>Cliente já cadastrado pede o código OTP para entrar.</summary>
    [HttpPost("login/request-otp")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RequestLoginOtp([FromBody] RequestLoginOtpCommand command, CancellationToken ct)
        => Ok(ApiResponse<RequestOtpResult>.Ok(await _mediator.Send(command, ct), "Código enviado."));

    /// <summary>Cliente novo se cadastra (nome, telefone, CPF) e pede o código OTP.</summary>
    [HttpPost("register/request-otp")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RequestRegisterOtp([FromBody] RequestRegisterOtpCommand command, CancellationToken ct)
        => Ok(ApiResponse<RequestOtpResult>.Ok(await _mediator.Send(command, ct), "Código enviado."));

    /// <summary>Verifica o OTP e retorna o token de acesso do cliente.</summary>
    [HttpPost("verify-otp")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyClientOtpCommand command, CancellationToken ct)
        => Ok(ApiResponse<ClientAuthResult>.Ok(await _mediator.Send(command, ct)));
}
