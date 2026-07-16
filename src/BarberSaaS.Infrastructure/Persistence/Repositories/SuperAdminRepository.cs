using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

/// <summary>
/// Consultas cross-tenant do super admin. IgnoreQueryFilters é DELIBERADO aqui —
/// e somente aqui: a requisição do super admin carrega o tenant_id da barbearia
/// dele no JWT, então o filtro global esconderia todos os outros tenants. O
/// soft-delete é reaplicado à mão em cada query (IgnoreQueryFilters desliga os
/// dois filtros de uma vez).
/// </summary>
public class SuperAdminRepository : ISuperAdminRepository
{
    private readonly AppDbContext _db;
    public SuperAdminRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<TenantAccountRow>> ListTenantAccountsAsync(CancellationToken ct = default)
    {
        return await _db.Tenants.IgnoreQueryFilters().AsNoTracking()
            .Where(t => !t.IsDeleted)
            .OrderBy(t => t.Name)
            // Join explícito por TenantId (a navegação Tenant.Users não existe mais —
            // ver TenantConfiguration): o dono é o usuário Owner mais antigo do tenant.
            .Select(t => new TenantAccountRow(
                t.Id, t.Name, t.Slug, (byte)t.Status, t.CreatedAt,
                _db.Users.IgnoreQueryFilters()
                    .Where(u => u.TenantId == t.Id && !u.IsDeleted
                                && (u.Role == UserRole.Owner || u.Role == UserRole.SuperAdmin))
                    .OrderBy(u => u.CreatedAt).Select(u => (string?)u.Name).FirstOrDefault(),
                _db.Users.IgnoreQueryFilters()
                    .Where(u => u.TenantId == t.Id && !u.IsDeleted
                                && (u.Role == UserRole.Owner || u.Role == UserRole.SuperAdmin))
                    .OrderBy(u => u.CreatedAt).Select(u => (string?)u.Email).FirstOrDefault(),
                // Total em aberto por barbearia — subconsulta correlacionada na MESMA
                // query (uma ida ao banco pra lista inteira, sem N+1).
                _db.Invoices.IgnoreQueryFilters()
                    .Where(i => i.TenantId == t.Id && !i.IsDeleted
                                && i.Status == InvoiceStatus.Open)
                    .Sum(i => (decimal?)i.Amount) ?? 0m))
            .ToListAsync(ct);
    }

    public Task<Tenant?> GetTenantAsync(Guid tenantId, CancellationToken ct = default)
        => _db.Tenants.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, ct);

    public Task<User?> GetTenantOwnerAsync(Guid tenantId, CancellationToken ct = default)
        => _db.Users.IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId && !u.IsDeleted
                        && (u.Role == UserRole.Owner || u.Role == UserRole.SuperAdmin))
            .OrderBy(u => u.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => _db.Users.IgnoreQueryFilters()
            .AnyAsync(u => u.Email == email && !u.IsDeleted, ct);

    public async Task AddTenantWithOwnerAsync(Tenant tenant, User owner, CancellationToken ct = default)
    {
        _db.Tenants.Add(tenant);
        _db.Users.Add(owner);
        await _db.SaveChangesAsync(ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
