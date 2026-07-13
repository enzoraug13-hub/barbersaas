using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.SuperAdmin.Commands;
using BarberSaaS.Application.SuperAdmin.Queries;
using BarberSaaS.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

/// <summary>
/// Gestão de CONTAS pelo super admin (venda ao vivo: contas são criadas e
/// suspensas manualmente). Estes são os ÚNICOS endpoints do sistema que cruzam
/// tenants — e tocam apenas dados de conta (nome, e-mail do dono, status).
/// Agenda, financeiro e clientes das barbearias seguem inacessíveis por aqui.
///
/// Segurança: a policy exige o claim "role"="superadmin", emitido no login a
/// partir do banco (Users.Role) dentro de um JWT assinado — dono comum recebe 403.
/// Nenhum endpoint da API escreve Users.Role; promover alguém é operação manual
/// de banco.
/// </summary>
[ApiController]
[Route("api/v1/super-admin")]
[Authorize(Policy = "RequireSuperAdmin")]
public class SuperAdminController : ControllerBase
{
    private readonly IMediator _mediator;
    public SuperAdminController(IMediator mediator) => _mediator = mediator;

    /// <summary>Todas as contas: id, nome, slug, dono (nome/e-mail), status, criada em.</summary>
    [HttpGet("tenants")]
    public async Task<IActionResult> ListTenants(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<TenantAccountDto>>.Ok(
            await _mediator.Send(new ListTenantAccountsQuery(), ct)));

    /// <summary>Criação administrativa: barbearia + dono com senha provisória. Sem trial.</summary>
    [HttpPost("tenants")]
    public async Task<IActionResult> CreateTenant([FromBody] CreateTenantAccountCommand command, CancellationToken ct)
        => Ok(ApiResponse<CreateTenantAccountResult>.Ok(
            await _mediator.Send(command, ct), "Conta criada."));

    /// <summary>Alterna Active/Suspended. Suspended bloqueia o login do tenant inteiro.</summary>
    [HttpPatch("tenants/{id:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetStatusRequest body, CancellationToken ct)
        => Ok(ApiResponse<object>.Ok(
            new { status = await _mediator.Send(new SetTenantStatusCommand(id, body.Status), ct) },
            "Status atualizado."));

    /// <summary>Redefine a senha do dono do tenant (provisória, definida pelo super admin).</summary>
    [HttpPost("tenants/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest body, CancellationToken ct)
        => Ok(ApiResponse<bool>.Ok(
            await _mediator.Send(new ResetTenantOwnerPasswordCommand(id, body.NewPassword), ct),
            "Senha redefinida."));
}

public record SetStatusRequest(TenantStatus Status);
public record ResetPasswordRequest(string NewPassword);
