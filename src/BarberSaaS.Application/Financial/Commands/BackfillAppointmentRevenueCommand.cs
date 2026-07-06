using BarberSaaS.Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.Financial.Commands;

/// <summary>
/// Correção retroativa: agendamentos concluídos ANTES do elo agendamento→financeiro
/// existir (AppointmentCompletedFinancialHandler) ficaram sem receita lançada.
/// Este comando cria as FinancialTransactions que faltam. Idempotente — rodar de
/// novo não duplica nada. Retorna quantas receitas foram criadas.
/// </summary>
public record BackfillAppointmentRevenueCommand(Guid TenantId, Guid RequestedBy) : IRequest<int>;

public class BackfillAppointmentRevenueHandler : IRequestHandler<BackfillAppointmentRevenueCommand, int>
{
    private readonly IFinancialRepository _financial;
    private readonly ICacheService _cache;
    private readonly ILogger<BackfillAppointmentRevenueHandler> _logger;

    public BackfillAppointmentRevenueHandler(
        IFinancialRepository financial, ICacheService cache,
        ILogger<BackfillAppointmentRevenueHandler> logger)
    {
        _financial = financial; _cache = cache; _logger = logger;
    }

    public async Task<int> Handle(BackfillAppointmentRevenueCommand request, CancellationToken ct)
    {
        var created = await _financial.BackfillCompletedAppointmentsAsync(request.TenantId, request.RequestedBy, ct);
        if (created > 0)
        {
            _logger.LogInformation("Backfill: {Count} receitas criadas para o tenant {TenantId}", created, request.TenantId);
            await _cache.RemoveByPatternAsync($"dashboard:{request.TenantId}:*");
        }
        return created;
    }
}
