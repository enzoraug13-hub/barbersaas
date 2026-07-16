using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.SuperAdmin.Queries;

public record ListTenantAccountsQuery : IRequest<IReadOnlyList<TenantAccountDto>>;

public record TenantAccountDto(
    Guid Id,
    string Name,
    string Slug,
    string Status,        // "Active" | "Suspended" — string pra UI não depender do byte
    DateTime CreatedAt,
    string? OwnerName,
    string? OwnerEmail,
    decimal OpenAmount);  // soma das faturas em aberto — 0 = "em dia" na lista

public class ListTenantAccountsHandler : IRequestHandler<ListTenantAccountsQuery, IReadOnlyList<TenantAccountDto>>
{
    private readonly ISuperAdminRepository _repo;
    public ListTenantAccountsHandler(ISuperAdminRepository repo) => _repo = repo;

    public async Task<IReadOnlyList<TenantAccountDto>> Handle(ListTenantAccountsQuery request, CancellationToken ct)
    {
        var rows = await _repo.ListTenantAccountsAsync(ct);
        return rows.Select(r => new TenantAccountDto(
            r.TenantId, r.Name, r.Slug,
            ((Domain.Enums.TenantStatus)r.Status).ToString(),
            r.CreatedAt, r.OwnerName, r.OwnerEmail, r.OpenAmount)).ToList();
    }
}
