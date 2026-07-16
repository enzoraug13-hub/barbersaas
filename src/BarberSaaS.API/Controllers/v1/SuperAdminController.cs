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

    /// <summary>O "mundo" de uma barbearia: cabeçalho da conta + resumo financeiro histórico.</summary>
    [HttpGet("tenants/{id:guid}")]
    public async Task<IActionResult> GetTenant(Guid id, CancellationToken ct)
        => Ok(ApiResponse<TenantAccountDetailDto>.Ok(
            await _mediator.Send(new GetTenantAccountQuery(id), ct)));

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

    // ---------------- Faturas (o que as barbearias pagam AO TRIMLY) ----------------
    // Receita do meu negócio. Não confundir com /financial, que é o caixa interno de
    // cada barbearia — aquele continua isolado por tenant e intocado por aqui.

    /// <summary>Faturas, com filtros opcionais de status, vencimento e barbearia.</summary>
    [HttpGet("invoices")]
    public async Task<IActionResult> ListInvoices(
        [FromQuery] InvoiceStatus? status, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] Guid? tenantId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<InvoiceDto>>.Ok(
            await _mediator.Send(new ListInvoicesQuery(status, from, to, tenantId), ct)));

    /// <summary>Emite a fatura de um mês para uma barbearia (nasce em aberto).</summary>
    [HttpPost("invoices")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceCommand command, CancellationToken ct)
        => Ok(ApiResponse<InvoiceDto>.Ok(await _mediator.Send(command, ct), "Fatura criada."));

    /// <summary>Marca como paga (recebi o Pix). Reversível: {"paid": false} volta pra aberta.</summary>
    [HttpPatch("invoices/{id:guid}/paid")]
    public async Task<IActionResult> MarkPaid(Guid id, [FromBody] MarkPaidRequest body, CancellationToken ct)
        => Ok(ApiResponse<object>.Ok(
            new { status = await _mediator.Send(new MarkInvoicePaidCommand(id, body.Paid, body.PaidAt), ct) },
            body.Paid ? "Fatura marcada como paga." : "Fatura reaberta."));

    /// <summary>Anexa o comprovante (URL vinda de POST /uploads). Vazio remove.</summary>
    [HttpPost("invoices/{id:guid}/receipt")]
    public async Task<IActionResult> AttachReceipt(Guid id, [FromBody] AttachReceiptRequest body, CancellationToken ct)
        => Ok(ApiResponse<bool>.Ok(
            await _mediator.Send(new AttachInvoiceReceiptCommand(id, body.ReceiptUrl), ct),
            "Comprovante atualizado."));

    // ---------------- Avisos (comunicados do Trimly às barbearias) ----------------
    // Broadcast (TenantId nulo) ou direcionado a uma barbearia. O dono lê pelo
    // AnnouncementsController, isolado no próprio tenant.

    /// <summary>Histórico de avisos publicados, com alvo e contagem de leituras.</summary>
    [HttpGet("announcements")]
    public async Task<IActionResult> ListAnnouncements(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<AnnouncementDto>>.Ok(
            await _mediator.Send(new ListAnnouncementsQuery(), ct)));

    /// <summary>Publica um aviso. TenantId nulo = todas as barbearias.</summary>
    [HttpPost("announcements")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementCommand command, CancellationToken ct)
        => Ok(ApiResponse<AnnouncementDto>.Ok(await _mediator.Send(command, ct), "Aviso publicado."));

    /// <summary>Remove um aviso (some do painel de todas as barbearias).</summary>
    [HttpDelete("announcements/{id:guid}")]
    public async Task<IActionResult> DeleteAnnouncement(Guid id, CancellationToken ct)
        => Ok(ApiResponse<bool>.Ok(
            await _mediator.Send(new DeleteAnnouncementCommand(id), ct), "Aviso removido."));

    // ---------------- Suporte (mensagens das barbearias AO Trimly) ----------------
    // Sentido inverso dos avisos: o dono escreve pelo SupportController (isolado no
    // próprio tenant) e o super admin lê/responde por aqui.

    /// <summary>Caixa de entrada: uma conversa por barbearia, com não-lidas e última mensagem.</summary>
    [HttpGet("support/conversations")]
    public async Task<IActionResult> ListSupportConversations(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<SupportConversationDto>>.Ok(
            await _mediator.Send(new ListSupportConversationsQuery(), ct)));

    /// <summary>A conversa completa de uma barbearia, em ordem cronológica.</summary>
    [HttpGet("support/conversations/{tenantId:guid}")]
    public async Task<IActionResult> GetSupportConversation(Guid tenantId, CancellationToken ct)
        => Ok(ApiResponse<SupportThreadDto>.Ok(
            await _mediator.Send(new GetSupportConversationQuery(tenantId), ct)));

    /// <summary>Responde na conversa da barbearia.</summary>
    [HttpPost("support/conversations/{tenantId:guid}/messages")]
    public async Task<IActionResult> ReplySupport(Guid tenantId, [FromBody] ReplySupportRequest body, CancellationToken ct)
        => Ok(ApiResponse<Application.Support.SupportMessageDto>.Ok(
            await _mediator.Send(new ReplySupportMessageCommand(tenantId, body.Body), ct),
            "Resposta enviada."));

    /// <summary>Marca as mensagens do dono como lidas (em massa, idempotente).</summary>
    [HttpPost("support/conversations/{tenantId:guid}/read")]
    public async Task<IActionResult> MarkSupportRead(Guid tenantId, CancellationToken ct)
        => Ok(ApiResponse<object>.Ok(
            new { marked = await _mediator.Send(new MarkSupportConversationReadCommand(tenantId), ct) },
            "Conversa marcada como lida."));

    /// <summary>Resumo do painel: recebido, em aberto, contagens e série mensal.</summary>
    [HttpGet("billing/summary")]
    public async Task<IActionResult> BillingSummary(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] int months = 6, CancellationToken ct = default)
        => Ok(ApiResponse<BillingSummaryDto>.Ok(
            await _mediator.Send(new GetBillingSummaryQuery(from, to, months), ct)));
}

public record SetStatusRequest(TenantStatus Status);
public record ResetPasswordRequest(string NewPassword);
public record MarkPaidRequest(bool Paid = true, DateTime? PaidAt = null);
public record AttachReceiptRequest(string? ReceiptUrl);
public record ReplySupportRequest(string Body);
