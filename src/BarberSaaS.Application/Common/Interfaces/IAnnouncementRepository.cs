using BarberSaaS.Domain.Entities;

namespace BarberSaaS.Application.Common.Interfaces;

/// <summary>Linha da listagem do super admin: alvo + quantas barbearias já leram.</summary>
public record AnnouncementRow(
    Guid Id,
    string Title,
    string Body,
    Guid? TargetTenantId,
    string? TargetTenantName,
    DateTime CreatedAt,
    int ReadCount);

/// <summary>Linha da listagem do dono: o aviso + se ELE (o tenant dele) já leu.</summary>
public record TenantAnnouncementRow(
    Guid Id,
    string Title,
    string Body,
    bool IsBroadcast,
    DateTime CreatedAt,
    DateTime? ReadAt);

/// <summary>
/// Avisos do Trimly. Dois lados, regras distintas:
/// - Super admin (List/Add/GetById): cruza tenants de propósito — só atrás de
///   RequireSuperAdmin. O ReadCount usa IgnoreQueryFilters em AnnouncementReads
///   (contagem agregada, nenhum dado da barbearia vaza além de "leu/não leu").
/// - Dono (ListForTenant/MarkRead): SEMPRE recebe o tenantId do chamador (vindo
///   do JWT) e filtra por TargetTenantId nulo-ou-meu — um dono nunca vê aviso
///   direcionado a outra barbearia. O Announcement fica fora do filtro global
///   de tenant (é dado global), então este filtro explícito é a fronteira real.
/// </summary>
public interface IAnnouncementRepository
{
    // ---- super admin ----
    Task<IReadOnlyList<AnnouncementRow>> ListAllAsync(CancellationToken ct = default);
    Task<Announcement?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Announcement announcement, CancellationToken ct = default);

    // ---- dono (tenant do JWT) ----
    Task<IReadOnlyList<TenantAnnouncementRow>> ListForTenantAsync(Guid tenantId, CancellationToken ct = default);
    /// <summary>O aviso existe e é visível para este tenant (broadcast ou direcionado a ele)?</summary>
    Task<bool> IsVisibleToTenantAsync(Guid announcementId, Guid tenantId, CancellationToken ct = default);
    Task<bool> IsReadAsync(Guid announcementId, Guid tenantId, CancellationToken ct = default);
    Task AddReadAsync(AnnouncementRead read, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
