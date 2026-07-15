using BarberSaaS.Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>Remove um aviso (soft-delete): some do painel de todas as barbearias.</summary>
public record DeleteAnnouncementCommand(Guid Id) : IRequest<bool>;

public class DeleteAnnouncementHandler : IRequestHandler<DeleteAnnouncementCommand, bool>
{
    private readonly IAnnouncementRepository _announcements;
    private readonly ILogger<DeleteAnnouncementHandler> _logger;

    public DeleteAnnouncementHandler(IAnnouncementRepository announcements,
        ILogger<DeleteAnnouncementHandler> logger)
    {
        _announcements = announcements; _logger = logger;
    }

    public async Task<bool> Handle(DeleteAnnouncementCommand request, CancellationToken ct)
    {
        var announcement = await _announcements.GetByIdAsync(request.Id, ct)
            ?? throw new Domain.Exceptions.DomainException("Aviso não encontrado.");

        announcement.IsDeleted = true;
        await _announcements.SaveChangesAsync(ct);

        _logger.LogInformation("SUPER ADMIN: aviso {AnnouncementId} removido", announcement.Id);
        return true;
    }
}
