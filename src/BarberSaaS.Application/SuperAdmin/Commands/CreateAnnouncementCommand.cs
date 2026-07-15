using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.SuperAdmin.Queries;
using BarberSaaS.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>Publica um aviso: TenantId nulo = todas as barbearias (broadcast).</summary>
public record CreateAnnouncementCommand(
    string Title,
    string Body,
    Guid? TenantId = null) : IRequest<AnnouncementDto>;

public class CreateAnnouncementValidator : AbstractValidator<CreateAnnouncementCommand>
{
    public CreateAnnouncementValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Informe o título.").MaximumLength(150);
        RuleFor(x => x.Body).NotEmpty().WithMessage("Escreva a mensagem.").MaximumLength(2000);
    }
}

public class CreateAnnouncementHandler : IRequestHandler<CreateAnnouncementCommand, AnnouncementDto>
{
    private readonly IAnnouncementRepository _announcements;
    private readonly ISuperAdminRepository _superAdmin;
    private readonly ILogger<CreateAnnouncementHandler> _logger;

    public CreateAnnouncementHandler(IAnnouncementRepository announcements,
        ISuperAdminRepository superAdmin, ILogger<CreateAnnouncementHandler> logger)
    {
        _announcements = announcements; _superAdmin = superAdmin; _logger = logger;
    }

    public async Task<AnnouncementDto> Handle(CreateAnnouncementCommand request, CancellationToken ct)
    {
        string? tenantName = null;
        if (request.TenantId is not null)
        {
            var tenant = await _superAdmin.GetTenantAsync(request.TenantId.Value, ct)
                ?? throw new Domain.Exceptions.DomainException("Barbearia não encontrada.");
            tenantName = tenant.Name;
        }

        var announcement = new Announcement
        {
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            TargetTenantId = request.TenantId
        };
        await _announcements.AddAsync(announcement, ct);

        _logger.LogInformation("SUPER ADMIN: aviso {AnnouncementId} publicado ({Target})",
            announcement.Id, tenantName ?? "broadcast");

        return new AnnouncementDto(announcement.Id, announcement.Title, announcement.Body,
            announcement.TargetTenantId, tenantName, announcement.CreatedAt, 0);
    }
}
