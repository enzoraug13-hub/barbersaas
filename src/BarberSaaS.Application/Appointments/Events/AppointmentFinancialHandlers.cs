using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Domain.Events;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.Appointments.Events;

/// <summary>
/// Elo agendamento → financeiro. Antes destes handlers, o AppointmentCompletedEvent
/// era publicado sem nenhum ouvinte: a receita nunca chegava à FinancialTransactions
/// e o Dashboard/Financeiro ficavam em R$ 0 mesmo com atendimentos concluídos
/// (só "Serviços Mais Vendidos" mostrava valor, pois lê direto dos Appointments).
/// </summary>
public class AppointmentCompletedFinancialHandler : INotificationHandler<AppointmentCompletedEvent>
{
    private readonly IFinancialRepository _financial;
    private readonly IAppointmentRepositoryFull _appointments;
    private readonly IClientRepository _clients;
    private readonly IServiceRepository _services;
    private readonly ICacheService _cache;
    private readonly ILogger<AppointmentCompletedFinancialHandler> _logger;

    public AppointmentCompletedFinancialHandler(
        IFinancialRepository financial, IAppointmentRepositoryFull appointments,
        IClientRepository clients, IServiceRepository services,
        ICacheService cache, ILogger<AppointmentCompletedFinancialHandler> logger)
    {
        _financial = financial; _appointments = appointments;
        _clients = clients; _services = services; _cache = cache; _logger = logger;
    }

    public async Task Handle(AppointmentCompletedEvent e, CancellationToken ct)
    {
        // Idempotente: uma receita por agendamento (o vínculo é o AppointmentId).
        if (await _financial.GetByAppointmentIdAsync(e.TenantId, e.AppointmentId, ct) is not null)
            return;

        var appointment = await _appointments.GetByIdAsync(e.AppointmentId, ct);
        if (appointment is null)
        {
            _logger.LogWarning("Receita não lançada: agendamento {AppointmentId} não encontrado", e.AppointmentId);
            return;
        }

        var client  = await _clients.GetByIdAsync(appointment.ClientId, ct);
        var service = await _services.GetByIdAsync(appointment.ServiceId, ct);

        await _financial.AddAsync(new FinancialTransaction
        {
            TenantId        = e.TenantId,
            Type            = TransactionType.Revenue,
            Category        = TransactionCategory.Service,
            Description     = $"{service?.Name ?? "Atendimento"} — {client?.Name ?? "Cliente"}",
            Amount          = e.FinalPrice,
            PaidAmount      = e.FinalPrice,
            Status          = TransactionStatus.Paid,
            AppointmentId   = appointment.Id,
            BarberId        = appointment.BarberId,
            CreatedByUserId = e.CompletedBy,
            DueDate         = appointment.Date,
            TransactionDate = appointment.Date,
            PaidAt          = DateTime.UtcNow
        }, ct);

        // O resumo do dashboard fica 5 min em cache — sem isso a receita nova demora a aparecer.
        await _cache.RemoveByPatternAsync($"dashboard:{e.TenantId}:*");
    }
}

/// <summary>
/// Estorno: um agendamento concluído (pago) ainda pode ser cancelado — nesse caso a
/// receita lançada é removida (soft-delete), senão o faturamento ficaria inflado.
/// Agendamento cancelado sem receita (o caso comum: nunca foi concluído) é no-op.
/// </summary>
public class AppointmentCancelledFinancialHandler : INotificationHandler<AppointmentCancelledEvent>
{
    private readonly IFinancialRepository _financial;
    private readonly ICacheService _cache;

    public AppointmentCancelledFinancialHandler(IFinancialRepository financial, ICacheService cache)
    {
        _financial = financial; _cache = cache;
    }

    public async Task Handle(AppointmentCancelledEvent e, CancellationToken ct)
    {
        var tx = await _financial.GetByAppointmentIdAsync(e.TenantId, e.AppointmentId, ct);
        if (tx is null) return;

        tx.IsDeleted = true;
        tx.Notes = string.IsNullOrEmpty(tx.Notes)
            ? "Estornada: agendamento cancelado."
            : $"{tx.Notes} | Estornada: agendamento cancelado.";
        await _financial.UpdateAsync(tx, ct);

        await _cache.RemoveByPatternAsync($"dashboard:{e.TenantId}:*");
    }
}
