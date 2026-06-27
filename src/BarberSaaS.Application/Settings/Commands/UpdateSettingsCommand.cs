using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Settings.Queries;
using MediatR;
using System.Text.Json;

namespace BarberSaaS.Application.Settings.Commands;

public record UpdateSettingsCommand(
    string? BusinessName, string? Description,
    string? LogoUrl, string? CoverImageUrl,
    string? PrimaryColor, string? SecondaryColor, string? AccentColor,
    string? Phone, string? Address, string? City, string? State, string? ZipCode,
    string? InstagramUrl, string? WhatsAppNumber,
    bool? AllowOnlineBooking, bool? RequireConfirmation, bool? CustomPriceEnabled,
    int? SlotIntervalMinutes, int? MaxAdvanceDays,
    IReadOnlyList<BusinessHourDto>? BusinessHours) : IRequest<bool>;

public class UpdateSettingsHandler : IRequestHandler<UpdateSettingsCommand, bool>
{
    private readonly ITenantRepository _tenants;
    private readonly ICurrentTenant _tenant;
    private readonly ICacheService _cache;

    public UpdateSettingsHandler(ITenantRepository tenants, ICurrentTenant tenant, ICacheService cache)
    {
        _tenants = tenants; _tenant = tenant; _cache = cache;
    }

    public async Task<bool> Handle(UpdateSettingsCommand request, CancellationToken ct)
    {
        var tenant = await _tenants.GetWithSettingsAsync(_tenant.Id, ct);
        if (tenant?.Settings is not { } s) return false;

        s.BusinessName        = request.BusinessName ?? s.BusinessName;
        s.Description         = request.Description  ?? s.Description;
        // Fotos: string vazia ("") = remover; null = não enviado (mantém atual).
        s.LogoUrl             = request.LogoUrl       ?? s.LogoUrl;
        s.CoverImageUrl       = request.CoverImageUrl ?? s.CoverImageUrl;
        s.PrimaryColor        = request.PrimaryColor   ?? s.PrimaryColor;
        s.SecondaryColor      = request.SecondaryColor ?? s.SecondaryColor;
        s.AccentColor         = request.AccentColor    ?? s.AccentColor;
        s.Phone               = request.Phone          ?? s.Phone;
        s.Address             = request.Address        ?? s.Address;
        s.City                = request.City           ?? s.City;
        s.State               = request.State          ?? s.State;
        s.ZipCode             = request.ZipCode        ?? s.ZipCode;
        s.InstagramUrl        = request.InstagramUrl   ?? s.InstagramUrl;
        s.WhatsAppNumber      = request.WhatsAppNumber ?? s.WhatsAppNumber;
        s.AllowOnlineBooking  = request.AllowOnlineBooking ?? s.AllowOnlineBooking;
        s.RequireConfirmation = request.RequireConfirmation ?? s.RequireConfirmation;
        s.CustomPriceEnabled  = request.CustomPriceEnabled ?? s.CustomPriceEnabled;
        s.SlotIntervalMinutes = request.SlotIntervalMinutes ?? s.SlotIntervalMinutes;
        s.MaxAdvanceDays      = request.MaxAdvanceDays ?? s.MaxAdvanceDays;
        if (request.BusinessHours is { Count: 7 })
            s.BusinessHoursJson = JsonSerializer.Serialize(request.BusinessHours);

        await _tenants.UpdateAsync(tenant, ct);
        await _cache.RemoveByPatternAsync($"public:{s.PublicSlug}:*");
        return true;
    }
}
