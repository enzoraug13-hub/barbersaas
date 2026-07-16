using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Domain.Events;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.Appointments.Events;

/// <summary>
/// Elo agendamento → fidelidade (mesmo padrão do AppointmentCompletedFinancialHandler).
/// Só credita com o LoyaltyProgram do tenant IsEnabled. Modo Points: FinalPrice ×
/// PointsPerReal; modo Visits: 1 por atendimento. Wallet criada sob demanda.
///
/// REGRA DE ARREDONDAMENTO (modo Points): FLOOR — sempre para baixo.
/// R$45 × 0,1 = 4,5 → 4 pontos. Racional: nunca creditamos valor que o cliente não
/// gastou (floor é o padrão dos programas de fidelidade — Livelo/Smiles), a regra é
/// explicável em uma frase ("a cada R$10 gastos, 1 ponto — o resto não conta") e é
/// consistente em qualquer valor. NÃO misturar com Math.Round: metade-arredonda-metade-
/// não vira reclamação clássica de cliente comparando dois atendimentos.
/// </summary>
public class AppointmentCompletedLoyaltyHandler : INotificationHandler<AppointmentCompletedEvent>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly IAppointmentRepositoryFull _appointments;
    private readonly ILogger<AppointmentCompletedLoyaltyHandler> _logger;

    public AppointmentCompletedLoyaltyHandler(
        ILoyaltyRepository loyalty, IAppointmentRepositoryFull appointments,
        ILogger<AppointmentCompletedLoyaltyHandler> logger)
    {
        _loyalty = loyalty; _appointments = appointments; _logger = logger;
    }

    public async Task Handle(AppointmentCompletedEvent e, CancellationToken ct)
    {
        var program = await _loyalty.GetProgramAsync(e.TenantId, ct);
        if (program is null || !program.IsEnabled)
            return;

        // Idempotente: um crédito por agendamento (o vínculo é o AppointmentId).
        if (await _loyalty.GetTransactionByAppointmentAsync(e.AppointmentId, LoyaltyTransactionType.Credit, ct) is not null)
            return;

        var points = program.Mode == LoyaltyMode.Visits
            ? 1
            : (int)Math.Floor(e.FinalPrice * program.PointsPerReal); // FLOOR — ver doc da classe

        if (points <= 0)
        {
            _logger.LogInformation(
                "Fidelidade: agendamento {AppointmentId} não gerou pontos (R${FinalPrice} × {Rate} < 1)",
                e.AppointmentId, e.FinalPrice, program.PointsPerReal);
            return;
        }

        var wallet = await _loyalty.GetOrCreateWalletAsync(e.TenantId, e.ClientId, ct);
        var unit = program.Mode == LoyaltyMode.Visits ? "corte(s)" : "ponto(s)";
        await _loyalty.CreditAsync(wallet, points, $"Atendimento concluído: +{points} {unit}", e.AppointmentId, ct);

        var appointment = await _appointments.GetByIdAsync(e.AppointmentId, ct);
        if (appointment is not null)
        {
            appointment.PointsEarned = points;
            await _appointments.UpdateAsync(appointment, ct);
        }
    }
}

/// <summary>
/// Estorno (mesmo padrão do AppointmentCancelledFinancialHandler): agendamento concluído
/// que foi cancelado devolve os pontos creditados. Sem crédito prévio = no-op; estorno
/// já feito = no-op (idempotente via transação Debit vinculada ao AppointmentId).
/// O saldo PODE ficar negativo se o cliente já gastou os pontos num resgate — o extrato
/// permanece íntegro e o saldo se corrige nos próximos créditos.
/// </summary>
public class AppointmentCancelledLoyaltyHandler : INotificationHandler<AppointmentCancelledEvent>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly IAppointmentRepositoryFull _appointments;

    public AppointmentCancelledLoyaltyHandler(ILoyaltyRepository loyalty, IAppointmentRepositoryFull appointments)
    {
        _loyalty = loyalty; _appointments = appointments;
    }

    public async Task Handle(AppointmentCancelledEvent e, CancellationToken ct)
    {
        var credit = await _loyalty.GetTransactionByAppointmentAsync(e.AppointmentId, LoyaltyTransactionType.Credit, ct);
        if (credit is null) return; // nunca houve crédito (caso comum: cancelado antes de concluir)

        if (await _loyalty.GetTransactionByAppointmentAsync(e.AppointmentId, LoyaltyTransactionType.Debit, ct) is not null)
            return; // estorno já aplicado

        var wallet = await _loyalty.GetWalletAsync(e.ClientId, ct);
        if (wallet is null) return;

        // LifetimePoints também recua: o ganho deixou de existir (diferente do débito de
        // resgate, onde o cliente GANHOU e gastou — lá o lifetime fica).
        wallet.LifetimePoints -= credit.Points;
        await _loyalty.DebitAsync(wallet, credit.Points, "Estorno: agendamento cancelado", e.AppointmentId, ct);

        var appointment = await _appointments.GetByIdAsync(e.AppointmentId, ct);
        if (appointment is not null && appointment.PointsEarned != 0)
        {
            appointment.PointsEarned = 0;
            await _appointments.UpdateAsync(appointment, ct);
        }
    }
}
