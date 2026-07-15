using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Announcements.Queries;

/// <summary>
/// Avisos do Trimly visíveis à barbearia LOGADA: broadcasts + os direcionados a ela.
/// O tenant vem do JWT (ICurrentTenant) — nunca do request, então um dono não tem
/// como listar avisos de outra barbearia.
/// </summary>
public record ListMyAnnouncementsQuery() : IRequest<IReadOnlyList<MyAnnouncementDto>>;

public record MyAnnouncementDto(
    Guid Id,
    string Title,
    string Body,
    bool IsBroadcast,
    DateTime CreatedAt,
    bool IsRead,
    DateTime? ReadAt);

public class ListMyAnnouncementsHandler : IRequestHandler<ListMyAnnouncementsQuery, IReadOnlyList<MyAnnouncementDto>>
{
    private readonly IAnnouncementRepository _announcements;
    private readonly ICurrentTenant _tenant;

    public ListMyAnnouncementsHandler(IAnnouncementRepository announcements, ICurrentTenant tenant)
    {
        _announcements = announcements; _tenant = tenant;
    }

    public async Task<IReadOnlyList<MyAnnouncementDto>> Handle(ListMyAnnouncementsQuery request, CancellationToken ct)
    {
        var rows = await _announcements.ListForTenantAsync(_tenant.Id, ct);
        return rows.Select(r => new MyAnnouncementDto(
            r.Id, r.Title, r.Body, r.IsBroadcast, r.CreatedAt, r.ReadAt is not null, r.ReadAt)).ToList();
    }
}
