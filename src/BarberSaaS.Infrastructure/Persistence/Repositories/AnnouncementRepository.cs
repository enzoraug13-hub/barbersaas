using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

/// <summary>
/// Announcement não tem filtro de tenant no modelo (dado global — ver AppDbContext),
/// só soft-delete: as queries daqui NÃO precisam de IgnoreQueryFilters, exceto o
/// ReadCount do super admin, que agrega AnnouncementReads de todos os tenants.
/// O isolamento do lado do dono é o Where explícito por TargetTenantId nulo-ou-meu.
/// </summary>
public class AnnouncementRepository : IAnnouncementRepository
{
    private readonly AppDbContext _db;
    public AnnouncementRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<AnnouncementRow>> ListAllAsync(CancellationToken ct = default)
        => await _db.Announcements
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AnnouncementRow(
                a.Id, a.Title, a.Body, a.TargetTenantId,
                a.TargetTenantId == null
                    ? null
                    : _db.Tenants.IgnoreQueryFilters()
                        .Where(t => t.Id == a.TargetTenantId).Select(t => t.Name).FirstOrDefault(),
                a.CreatedAt,
                _db.AnnouncementReads.IgnoreQueryFilters()
                    .Count(r => r.AnnouncementId == a.Id && !r.IsDeleted)))
            .ToListAsync(ct);

    public Task<Announcement?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.Announcements.FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task AddAsync(Announcement announcement, CancellationToken ct = default)
    {
        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync(ct);
    }

    private IQueryable<Announcement> VisibleTo(Guid tenantId) =>
        _db.Announcements.Where(a => a.TargetTenantId == null || a.TargetTenantId == tenantId);

    public async Task<IReadOnlyList<TenantAnnouncementRow>> ListForTenantAsync(
        Guid tenantId, CancellationToken ct = default)
        => await VisibleTo(tenantId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new TenantAnnouncementRow(
                a.Id, a.Title, a.Body, a.TargetTenantId == null, a.CreatedAt,
                // AnnouncementReads tem filtro global de tenant, mas aqui o tenant é
                // explícito de novo — a query também roda em contexto de super admin.
                _db.AnnouncementReads
                    .Where(r => r.AnnouncementId == a.Id && r.TenantId == tenantId)
                    .Select(r => (DateTime?)r.CreatedAt)
                    .FirstOrDefault()))
            .ToListAsync(ct);

    public Task<bool> IsVisibleToTenantAsync(Guid announcementId, Guid tenantId, CancellationToken ct = default)
        => VisibleTo(tenantId).AnyAsync(a => a.Id == announcementId, ct);

    public Task<bool> IsReadAsync(Guid announcementId, Guid tenantId, CancellationToken ct = default)
        => _db.AnnouncementReads
            .AnyAsync(r => r.AnnouncementId == announcementId && r.TenantId == tenantId, ct);

    public async Task AddReadAsync(AnnouncementRead read, CancellationToken ct = default)
    {
        _db.AnnouncementReads.Add(read);
        await _db.SaveChangesAsync(ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
