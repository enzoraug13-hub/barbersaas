using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.SuperAdmin.Queries;

/// <summary>Histórico de avisos publicados pelo super admin, mais recentes primeiro.</summary>
public record ListAnnouncementsQuery() : IRequest<IReadOnlyList<AnnouncementDto>>;

public record AnnouncementDto(
    Guid Id,
    string Title,
    string Body,
    Guid? TenantId,          // null = broadcast
    string? TenantName,
    DateTime CreatedAt,
    int ReadCount);          // quantas barbearias já marcaram como lido

public class ListAnnouncementsHandler : IRequestHandler<ListAnnouncementsQuery, IReadOnlyList<AnnouncementDto>>
{
    private readonly IAnnouncementRepository _announcements;
    public ListAnnouncementsHandler(IAnnouncementRepository announcements) => _announcements = announcements;

    public async Task<IReadOnlyList<AnnouncementDto>> Handle(ListAnnouncementsQuery request, CancellationToken ct)
    {
        var rows = await _announcements.ListAllAsync(ct);
        return rows.Select(r => new AnnouncementDto(
            r.Id, r.Title, r.Body, r.TargetTenantId, r.TargetTenantName, r.CreatedAt, r.ReadCount)).ToList();
    }
}
