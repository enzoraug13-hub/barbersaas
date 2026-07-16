using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

public class LoyaltyRepository : ILoyaltyRepository
{
    private readonly AppDbContext _db;
    public LoyaltyRepository(AppDbContext db) => _db = db;

    // ---- programa ----

    public async Task<LoyaltyProgram?> GetProgramAsync(Guid tenantId, CancellationToken ct = default)
        => await _db.LoyaltyPrograms.FirstOrDefaultAsync(p => p.TenantId == tenantId, ct);

    public async Task UpsertProgramAsync(LoyaltyProgram program, CancellationToken ct = default)
    {
        // Lição das Metas: decide Add/Update pela existência rastreada — nunca Update() cego.
        if (_db.Entry(program).State == EntityState.Detached &&
            !await _db.LoyaltyPrograms.AnyAsync(p => p.Id == program.Id, ct))
            _db.LoyaltyPrograms.Add(program);
        await _db.SaveChangesAsync(ct);
    }

    // ---- carteira ----

    public async Task<LoyaltyWallet?> GetWalletAsync(Guid clientId, CancellationToken ct = default)
        => await _db.LoyaltyWallets.FirstOrDefaultAsync(w => w.ClientId == clientId, ct);

    public async Task<LoyaltyWallet> GetOrCreateWalletAsync(Guid tenantId, Guid clientId, CancellationToken ct = default)
    {
        var wallet = await GetWalletAsync(clientId, ct);
        if (wallet is not null) return wallet;

        wallet = new LoyaltyWallet { TenantId = tenantId, ClientId = clientId };
        _db.LoyaltyWallets.Add(wallet);
        await _db.SaveChangesAsync(ct);
        return wallet;
    }

    public async Task CreditAsync(LoyaltyWallet wallet, int points, string description, Guid? appointmentId = null, CancellationToken ct = default)
    {
        wallet.TotalPoints    += points;
        wallet.LifetimePoints += points;
        wallet.LastUpdatedAt   = DateTime.UtcNow;
        _db.LoyaltyTransactions.Add(new LoyaltyTransaction
        {
            TenantId = wallet.TenantId, WalletId = wallet.Id,
            Type = LoyaltyTransactionType.Credit, Points = points,
            Description = description, AppointmentId = appointmentId
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task DebitAsync(LoyaltyWallet wallet, int points, string description, Guid? appointmentId = null, CancellationToken ct = default)
    {
        wallet.TotalPoints  -= points;
        wallet.LastUpdatedAt = DateTime.UtcNow;
        _db.LoyaltyTransactions.Add(new LoyaltyTransaction
        {
            TenantId = wallet.TenantId, WalletId = wallet.Id,
            Type = LoyaltyTransactionType.Debit, Points = points,
            Description = description, AppointmentId = appointmentId
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<LoyaltyTransaction?> GetTransactionByAppointmentAsync(Guid appointmentId, LoyaltyTransactionType type, CancellationToken ct = default)
        => await _db.LoyaltyTransactions
            .FirstOrDefaultAsync(t => t.AppointmentId == appointmentId && t.Type == type, ct);

    // ---- saldos ----

    public async Task<IReadOnlyList<ClientBalanceRow>> ListBalancesAsync(Guid tenantId, CancellationToken ct = default)
        => await _db.LoyaltyWallets
            .Where(w => w.TenantId == tenantId && w.Client != null)
            .OrderByDescending(w => w.TotalPoints)
            .Select(w => new ClientBalanceRow(w.ClientId, w.Client!.Name, w.Client.PhoneNumber, w.TotalPoints, w.LifetimePoints))
            .ToListAsync(ct);

    // ---- visitas (derivadas — Appointments Completed) ----

    public async Task<int> CountCompletedVisitsAsync(Guid clientId, CancellationToken ct = default)
        => await _db.Appointments.CountAsync(a => a.ClientId == clientId && a.Status == AppointmentStatus.Completed, ct);

    public async Task<IReadOnlyDictionary<Guid, VisitStats>> GetVisitStatsAsync(Guid tenantId, CancellationToken ct = default)
    {
        var rows = await _db.Appointments
            .Where(a => a.TenantId == tenantId && a.Status == AppointmentStatus.Completed)
            .GroupBy(a => a.ClientId)
            .Select(g => new { g.Key, Visits = g.Count(), Last = g.Max(a => a.CompletedAt) })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.Key, r => new VisitStats(r.Visits, r.Last));
    }

    // ---- recompensas ----

    public async Task<IReadOnlyList<LoyaltyReward>> ListRewardsAsync(Guid tenantId, bool onlyActive, CancellationToken ct = default)
        => await _db.LoyaltyRewards
            .Include(r => r.Service).Include(r => r.Product)
            .Where(r => r.TenantId == tenantId && (!onlyActive || r.IsActive))
            .OrderBy(r => r.Cost)
            .ToListAsync(ct);

    public async Task<LoyaltyReward?> GetRewardAsync(Guid id, CancellationToken ct = default)
        => await _db.LoyaltyRewards.FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<LoyaltyReward> AddRewardAsync(LoyaltyReward reward, CancellationToken ct = default)
    {
        _db.LoyaltyRewards.Add(reward);
        await _db.SaveChangesAsync(ct);
        return reward;
    }

    public async Task UpdateRewardAsync(LoyaltyReward reward, CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);

    // ---- resgates ----

    public async Task<IReadOnlyList<LoyaltyRedemption>> ListRedemptionsAsync(Guid tenantId, LoyaltyRedemptionStatus? status, CancellationToken ct = default)
        => await _db.LoyaltyRedemptions
            .Include(r => r.Client)
            .Where(r => r.TenantId == tenantId && (status == null || r.Status == status))
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<LoyaltyRedemption>> ListRedemptionsByClientAsync(Guid clientId, CancellationToken ct = default)
        => await _db.LoyaltyRedemptions
            .Where(r => r.ClientId == clientId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

    public async Task<int> CountPendingRedemptionsAsync(Guid tenantId, CancellationToken ct = default)
        => await _db.LoyaltyRedemptions.CountAsync(
            r => r.TenantId == tenantId && r.Status == LoyaltyRedemptionStatus.Pending, ct);

    public async Task<LoyaltyRedemption?> GetRedemptionAsync(Guid id, CancellationToken ct = default)
        => await _db.LoyaltyRedemptions.Include(r => r.Client).FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task RedeemAsync(LoyaltyWallet wallet, LoyaltyRedemption redemption, CancellationToken ct = default)
    {
        wallet.TotalPoints  -= redemption.CostPaid;
        wallet.LastUpdatedAt = DateTime.UtcNow;
        _db.LoyaltyTransactions.Add(new LoyaltyTransaction
        {
            TenantId = wallet.TenantId, WalletId = wallet.Id,
            Type = LoyaltyTransactionType.Debit, Points = redemption.CostPaid,
            Description = $"Resgate: {redemption.RewardName}"
        });
        _db.LoyaltyRedemptions.Add(redemption);
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkDeliveredAsync(LoyaltyRedemption redemption, CancellationToken ct = default)
    {
        redemption.Status     = LoyaltyRedemptionStatus.Delivered;
        redemption.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task CancelRedemptionAsync(LoyaltyWallet wallet, LoyaltyRedemption redemption, CancellationToken ct = default)
    {
        wallet.TotalPoints  += redemption.CostPaid;
        wallet.LastUpdatedAt = DateTime.UtcNow;
        _db.LoyaltyTransactions.Add(new LoyaltyTransaction
        {
            TenantId = wallet.TenantId, WalletId = wallet.Id,
            Type = LoyaltyTransactionType.Credit, Points = redemption.CostPaid,
            Description = $"Estorno de resgate cancelado: {redemption.RewardName}"
        });
        redemption.Status     = LoyaltyRedemptionStatus.Cancelled;
        redemption.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }
}
