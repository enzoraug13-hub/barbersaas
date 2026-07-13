using BarberSaaS.Domain.Entities;

namespace BarberSaaS.Application.Common.Interfaces;

/// <summary>Linha da listagem de contas do super admin — só dados de CONTA, nada operacional.</summary>
public record TenantAccountRow(
    Guid TenantId,
    string Name,
    string Slug,
    byte Status,
    DateTime CreatedAt,
    string? OwnerName,
    string? OwnerEmail);

/// <summary>
/// ÚNICO ponto do sistema autorizado a consultar dados CRUZANDO tenants — e apenas
/// dados de conta (nome, slug, status, dono). A implementação usa IgnoreQueryFilters
/// de propósito (o filtro global de tenant esconderia os demais tenants); em troca,
/// todo uso fica atrás da policy RequireSuperAdmin no controller. Nunca exponha
/// agenda, financeiro ou clientes finais por aqui.
/// </summary>
public interface ISuperAdminRepository
{
    Task<IReadOnlyList<TenantAccountRow>> ListTenantAccountsAsync(CancellationToken ct = default);
    Task<Tenant?> GetTenantAsync(Guid tenantId, CancellationToken ct = default);
    /// <summary>Dono do tenant (Role=Owner mais antigo).</summary>
    Task<User?> GetTenantOwnerAsync(Guid tenantId, CancellationToken ct = default);
    /// <summary>Existe usuário com este e-mail em QUALQUER tenant?</summary>
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task AddTenantWithOwnerAsync(Tenant tenant, User owner, CancellationToken ct = default);
    /// <summary>Persiste mutações feitas em entidades rastreadas (status, senha).</summary>
    Task SaveChangesAsync(CancellationToken ct = default);
}
