using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Settings.Queries;

public record GetSettingsQuery : IRequest<SettingsDto?>;

// DTO tipado da configuração da barbearia (antes era objeto anônimo no controller).
public record SettingsDto(
    string BusinessName, string? Description,
    string? LogoUrl, string? CoverImageUrl,
    string PrimaryColor, string SecondaryColor, string AccentColor,
    string? Phone, string? WhatsAppNumber, string? InstagramUrl,
    string? Address, string? City, string? State, string? ZipCode,
    int SlotIntervalMinutes, int MaxAdvanceDays, int MinNoticeMinutes,
    bool AllowOnlineBooking, bool RequireConfirmation,
    string PublicSlug);

public class GetSettingsHandler : IRequestHandler<GetSettingsQuery, SettingsDto?>
{
    private readonly ITenantRepository _tenants;
    private readonly ICurrentTenant _tenant;

    public GetSettingsHandler(ITenantRepository tenants, ICurrentTenant tenant)
    {
        _tenants = tenants; _tenant = tenant;
    }

    public async Task<SettingsDto?> Handle(GetSettingsQuery request, CancellationToken ct)
    {
        var tenant = await _tenants.GetWithSettingsAsync(_tenant.Id, ct);
        if (tenant?.Settings is not { } s) return null;

        return new SettingsDto(
            s.BusinessName, s.Description,
            s.LogoUrl, s.CoverImageUrl,
            s.PrimaryColor, s.SecondaryColor, s.AccentColor,
            s.Phone, s.WhatsAppNumber, s.InstagramUrl,
            s.Address, s.City, s.State, s.ZipCode,
            s.SlotIntervalMinutes, s.MaxAdvanceDays, s.MinNoticeMinutes,
            s.AllowOnlineBooking, s.RequireConfirmation,
            s.PublicSlug);
    }
}
