using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using MediatR;

namespace BarberSaaS.Application.SuperAdmin.Queries;

/// <summary>
/// O "mundo" de UMA barbearia pro super admin: cabeçalho da conta + resumo
/// financeiro histórico. Reusa os repositórios dos Blocos 1 e 2 — as faturas do
/// tenant são poucas (uma por mês), então o agregado é feito em memória em cima
/// do mesmo ListAsync da listagem, sem método novo de repositório.
/// </summary>
public record GetTenantAccountQuery(Guid TenantId) : IRequest<TenantAccountDetailDto>;

public record TenantAccountDetailDto(
    Guid Id,
    string Name,
    string Slug,
    string Status,
    DateTime CreatedAt,
    string? OwnerName,
    string? OwnerEmail,
    decimal TotalPaid,          // histórico inteiro, não só o mês
    decimal TotalOpen,
    string? LastCompetence,     // "07/2026" — null se nunca houve fatura
    string? LastStatus,         // "Open" | "Paid"
    decimal? LastAmount);

public class GetTenantAccountHandler : IRequestHandler<GetTenantAccountQuery, TenantAccountDetailDto>
{
    private readonly ISuperAdminRepository _superAdmin;
    private readonly IInvoiceRepository _invoices;

    public GetTenantAccountHandler(ISuperAdminRepository superAdmin, IInvoiceRepository invoices)
    {
        _superAdmin = superAdmin; _invoices = invoices;
    }

    public async Task<TenantAccountDetailDto> Handle(GetTenantAccountQuery request, CancellationToken ct)
    {
        var tenant = await _superAdmin.GetTenantAsync(request.TenantId, ct)
            ?? throw new Domain.Exceptions.DomainException("Barbearia não encontrada.");
        var owner = await _superAdmin.GetTenantOwnerAsync(request.TenantId, ct);

        // Já vem ordenado por competência desc (ver InvoiceRepository.ListAsync).
        var invoices = await _invoices.ListAsync(null, null, null, request.TenantId, ct);
        var last = invoices.FirstOrDefault();

        return new TenantAccountDetailDto(
            tenant.Id, tenant.Name, tenant.Slug, tenant.Status.ToString(), tenant.CreatedAt,
            owner?.Name, owner?.Email,
            invoices.Where(i => (InvoiceStatus)i.Status == InvoiceStatus.Paid).Sum(i => i.Amount),
            invoices.Where(i => (InvoiceStatus)i.Status == InvoiceStatus.Open).Sum(i => i.Amount),
            last is null ? null : $"{last.CompetenceMonth:00}/{last.CompetenceYear}",
            last is null ? null : ((InvoiceStatus)last.Status).ToString(),
            last?.Amount);
    }
}
