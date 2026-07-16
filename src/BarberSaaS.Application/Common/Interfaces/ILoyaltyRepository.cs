using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Application.Common.Interfaces;

/// <summary>Saldo de um cliente na visão do dono (aba Fidelidade).</summary>
public record ClientBalanceRow(Guid ClientId, string ClientName, string Phone, int TotalPoints, int LifetimePoints);

/// <summary>Visitas derivadas dos agendamentos Completed (nunca persistidas — não divergem).</summary>
public record VisitStats(int Visits, DateTime? LastVisitAt);

/// <summary>
/// Acesso ao programa de fidelidade. A LoyaltyWallet é a FONTE DA VERDADE do saldo;
/// os campos legados Client.LoyaltyPoints/WalletBalance/TotalVisits/LastVisitAt estão
/// aposentados (ninguém lê nem escreve). Toda mutação de saldo passa por Credit/Debit/
/// Redeem/CancelRedemption, que gravam wallet + LoyaltyTransaction (extrato) num único
/// SaveChanges — saldo sem extrato correspondente não existe.
/// </summary>
public interface ILoyaltyRepository
{
    // ---- programa (1 por tenant, índice único) ----
    Task<LoyaltyProgram?> GetProgramAsync(Guid tenantId, CancellationToken ct = default);
    /// <summary>Insere ou atualiza o programa do tenant num único SaveChanges.</summary>
    Task UpsertProgramAsync(LoyaltyProgram program, CancellationToken ct = default);

    // ---- carteira ----
    Task<LoyaltyWallet?> GetWalletAsync(Guid clientId, CancellationToken ct = default);
    Task<LoyaltyWallet> GetOrCreateWalletAsync(Guid tenantId, Guid clientId, CancellationToken ct = default);
    /// <summary>Credita pontos e grava a transação de extrato (1 SaveChanges).</summary>
    Task CreditAsync(LoyaltyWallet wallet, int points, string description, Guid? appointmentId = null, CancellationToken ct = default);
    /// <summary>Debita pontos e grava a transação de extrato (1 SaveChanges).</summary>
    Task DebitAsync(LoyaltyWallet wallet, int points, string description, Guid? appointmentId = null, CancellationToken ct = default);
    /// <summary>Transação vinculada ao agendamento (idempotência do crédito/estorno).</summary>
    Task<LoyaltyTransaction?> GetTransactionByAppointmentAsync(Guid appointmentId, LoyaltyTransactionType type, CancellationToken ct = default);

    // ---- saldos (painel do dono) ----
    Task<IReadOnlyList<ClientBalanceRow>> ListBalancesAsync(Guid tenantId, CancellationToken ct = default);

    // ---- visitas (derivadas de Appointments Completed) ----
    Task<int> CountCompletedVisitsAsync(Guid clientId, CancellationToken ct = default);
    Task<IReadOnlyDictionary<Guid, VisitStats>> GetVisitStatsAsync(Guid tenantId, CancellationToken ct = default);

    // ---- recompensas ----
    Task<IReadOnlyList<LoyaltyReward>> ListRewardsAsync(Guid tenantId, bool onlyActive, CancellationToken ct = default);
    Task<LoyaltyReward?> GetRewardAsync(Guid id, CancellationToken ct = default);
    Task<LoyaltyReward> AddRewardAsync(LoyaltyReward reward, CancellationToken ct = default);
    Task UpdateRewardAsync(LoyaltyReward reward, CancellationToken ct = default);

    // ---- resgates ----
    Task<IReadOnlyList<LoyaltyRedemption>> ListRedemptionsAsync(Guid tenantId, LoyaltyRedemptionStatus? status, CancellationToken ct = default);
    Task<IReadOnlyList<LoyaltyRedemption>> ListRedemptionsByClientAsync(Guid clientId, CancellationToken ct = default);
    Task<int> CountPendingRedemptionsAsync(Guid tenantId, CancellationToken ct = default);
    Task<LoyaltyRedemption?> GetRedemptionAsync(Guid id, CancellationToken ct = default);
    /// <summary>Resgate atômico: debita CostPaid + transação Debit + insere a redemption (1 SaveChanges).</summary>
    Task RedeemAsync(LoyaltyWallet wallet, LoyaltyRedemption redemption, CancellationToken ct = default);
    /// <summary>Marca Delivered (sem mexer em saldo) — 1 SaveChanges.</summary>
    Task MarkDeliveredAsync(LoyaltyRedemption redemption, CancellationToken ct = default);
    /// <summary>Cancela devolvendo os pontos: credita CostPaid + transação Credit + status Cancelled (1 SaveChanges).</summary>
    Task CancelRedemptionAsync(LoyaltyWallet wallet, LoyaltyRedemption redemption, CancellationToken ct = default);
}
