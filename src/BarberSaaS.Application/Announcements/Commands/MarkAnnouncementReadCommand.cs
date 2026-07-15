using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using MediatR;

namespace BarberSaaS.Application.Announcements.Commands;

/// <summary>
/// Marca um aviso como lido PELA BARBEARIA logada (tenant do JWT). Idempotente:
/// marcar duas vezes não duplica (e o índice único aviso+tenant garante no banco).
/// </summary>
public record MarkAnnouncementReadCommand(Guid AnnouncementId) : IRequest<bool>;

public class MarkAnnouncementReadHandler : IRequestHandler<MarkAnnouncementReadCommand, bool>
{
    private readonly IAnnouncementRepository _announcements;
    private readonly ICurrentTenant _tenant;

    public MarkAnnouncementReadHandler(IAnnouncementRepository announcements, ICurrentTenant tenant)
    {
        _announcements = announcements; _tenant = tenant;
    }

    public async Task<bool> Handle(MarkAnnouncementReadCommand request, CancellationToken ct)
    {
        // Visibilidade primeiro: aviso de outra barbearia responde "não encontrado"
        // (mesma resposta de aviso inexistente — sem oráculo de existência).
        if (!await _announcements.IsVisibleToTenantAsync(request.AnnouncementId, _tenant.Id, ct))
            throw new Domain.Exceptions.DomainException("Aviso não encontrado.");

        if (await _announcements.IsReadAsync(request.AnnouncementId, _tenant.Id, ct))
            return true;

        // TenantId é carimbado pelo SaveChanges com o tenant da requisição.
        await _announcements.AddReadAsync(new AnnouncementRead
        {
            AnnouncementId = request.AnnouncementId
        }, ct);
        return true;
    }
}
