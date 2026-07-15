using BarberSaaS.Application.Auth.Commands;
using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IAuthOptions _authOptions;

    public AuthController(IMediator mediator, IAuthOptions authOptions)
    {
        _mediator = mediator;
        _authOptions = authOptions;
    }

    /// <summary>
    /// Auto-cadastro público — DESATIVADO por padrão (contas são criadas pelo super
    /// admin em /super-admin). O endpoint e o RegisterTenantCommand ficam intactos de
    /// propósito: a reativação futura (billing self-service) é só ligar a flag
    /// Auth:PublicRegistrationEnabled, sem ressuscitar código.
    /// </summary>
    [HttpPost("register")]
    [EnableRateLimiting("register")]
    public async Task<IActionResult> Register([FromBody] RegisterTenantCommand command, CancellationToken ct)
    {
        if (!_authOptions.PublicRegistrationEnabled)
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<object>.Fail("O cadastro de novas barbearias está temporariamente desativado. Entre em contato com o Trimly."));

        var result = await _mediator.Send(command, ct);
        return Ok(ApiResponse<RegisterTenantResult>.Ok(result, "Barbearia registrada com sucesso!"));
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _mediator.Send(new LoginCommand(request.Email, request.Password, ip), ct);
        return Ok(ApiResponse<LoginResult>.Ok(result));
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _mediator.Send(new RefreshTokenCommand(request.RefreshToken, ip), ct);
        return Ok(ApiResponse<LoginResult>.Ok(result));
    }

    [HttpPost("confirm-email")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest request, CancellationToken ct)
    {
        await _mediator.Send(new ConfirmEmailCommand(request.Token), ct);
        return Ok(ApiResponse<bool>.Ok(true, "E-mail confirmado! Você já pode entrar."));
    }

    [HttpPost("resend-confirmation")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResendConfirmation([FromBody] ResendConfirmationRequest request, CancellationToken ct)
    {
        await _mediator.Send(new ResendConfirmationEmailCommand(request.Email), ct);
        return Ok(ApiResponse<bool>.Ok(true, "Se a conta existir e estiver pendente, enviamos um novo e-mail."));
    }
}

public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record ConfirmEmailRequest(string Token);
public record ResendConfirmationRequest(string Email);
