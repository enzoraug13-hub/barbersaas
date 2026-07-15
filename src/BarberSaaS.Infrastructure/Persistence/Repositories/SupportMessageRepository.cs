using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

/// <summary>
/// Lado do dono: filtro explícito por tenantId (o filtro global de tenant também
/// está ativo — dupla proteção, mesmo padrão dos AnnouncementReads). Lado do super
/// admin: IgnoreQueryFilters DELIBERADO (mesmo motivo do InvoiceRepository — o JWT
/// dele carrega o tenant da barbearia dele), com !IsDeleted reaplicado à mão.
/// </summary>
public class SupportMessageRepository : ISupportMessageRepository
{
    private readonly AppDbContext _db;
    public SupportMessageRepository(AppDbContext db) => _db = db;

    public async Task AddAsync(SupportMessage message, CancellationToken ct = default)
    {
        _db.SupportMessages.Add(message);
        await _db.SaveChangesAsync(ct);
    }

    // ---------------- dono (tenant do JWT) ----------------

    public async Task<IReadOnlyList<SupportMessageRow>> ListForTenantAsync(
        Guid tenantId, CancellationToken ct = default)
        => await _db.SupportMessages
            .Where(m => m.TenantId == tenantId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new SupportMessageRow(m.Id, m.Author, m.Body, m.CreatedAt, m.ReadAt))
            .ToListAsync(ct);

    public async Task<int> MarkRepliesReadAsync(Guid tenantId, CancellationToken ct = default)
    {
        var unread = await _db.SupportMessages
            .Where(m => m.TenantId == tenantId
                && m.Author == SupportMessageAuthor.SuperAdmin
                && m.ReadAt == null)
            .ToListAsync(ct);
        if (unread.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var m in unread) m.ReadAt = now;
        await _db.SaveChangesAsync(ct);
        return unread.Count;
    }

    // ---------------- super admin (cruza tenants) ----------------

    private IQueryable<SupportMessage> All() =>
        _db.SupportMessages.IgnoreQueryFilters().Where(m => !m.IsDeleted);

    public async Task<IReadOnlyList<SupportConversationRow>> ListConversationsAsync(
        CancellationToken ct = default)
    {
        // "Última mensagem por tenant" via subconsulta correlacionada (CreatedAt == Max
        // do tenant): First() ordenado dentro da projeção de um GroupBy não é
        // traduzível pelo EF — verificado em runtime, não é hipótese.
        var all = All();
        var rows = await all
            .Where(m => m.CreatedAt == all
                .Where(x => x.TenantId == m.TenantId).Max(x => x.CreatedAt))
            .Select(m => new
            {
                m.TenantId,
                TenantName = _db.Tenants.IgnoreQueryFilters()
                    .Where(t => t.Id == m.TenantId).Select(t => t.Name).FirstOrDefault() ?? "—",
                m.Body,
                m.Author,
                m.CreatedAt,
                Unread = all.Count(x => x.TenantId == m.TenantId
                    && x.Author == SupportMessageAuthor.Owner && x.ReadAt == null),
            })
            .ToListAsync(ct);

        // Empate de CreatedAt no mesmo tenant devolveria duas "últimas" — dedup aqui.
        return rows
            .GroupBy(r => r.TenantId)
            .Select(g => g.First())
            .Select(r => new SupportConversationRow(
                r.TenantId, r.TenantName, r.Body, r.Author, r.CreatedAt, r.Unread))
            .OrderByDescending(r => r.LastAt)
            .ToList();
    }

    public async Task<IReadOnlyList<SupportMessageRow>> ListConversationAsync(
        Guid tenantId, CancellationToken ct = default)
        => await All()
            .Where(m => m.TenantId == tenantId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new SupportMessageRow(m.Id, m.Author, m.Body, m.CreatedAt, m.ReadAt))
            .ToListAsync(ct);

    public async Task<int> MarkOwnerMessagesReadAsync(Guid tenantId, CancellationToken ct = default)
    {
        var unread = await All()
            .Where(m => m.TenantId == tenantId
                && m.Author == SupportMessageAuthor.Owner
                && m.ReadAt == null)
            .ToListAsync(ct);
        if (unread.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var m in unread) m.ReadAt = now;
        await _db.SaveChangesAsync(ct);
        return unread.Count;
    }
}
