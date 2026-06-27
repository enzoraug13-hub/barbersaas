using BarberSaaS.Application.Common.Interfaces;
using MediatR;
using System.Text.Json;

namespace BarberSaaS.Application.Settings.Queries;

public record GetSettingsQuery : IRequest<SettingsDto?>;

// DayOfWeek: 0=domingo..6=sábado (igual ao System.DayOfWeek do .NET).
public record BusinessHourDto(int DayOfWeek, bool IsOpen, string? OpenTime, string? CloseTime);

// DTO tipado da configuração da barbearia (antes era objeto anônimo no controller).
public record SettingsDto(
    string BusinessName, string? Description,
    string? LogoUrl, string? CoverImageUrl,
    string PrimaryColor, string SecondaryColor, string AccentColor,
    string? Phone, string? WhatsAppNumber, string? InstagramUrl,
    string? Address, string? City, string? State, string? ZipCode,
    int SlotIntervalMinutes, int MaxAdvanceDays, int MinNoticeMinutes,
    bool AllowOnlineBooking, bool RequireConfirmation, bool CustomPriceEnabled,
    string PublicSlug,
    IReadOnlyList<BusinessHourDto> BusinessHours);

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
            s.AllowOnlineBooking, s.RequireConfirmation, s.CustomPriceEnabled,
            s.PublicSlug,
            ParseBusinessHours(s.BusinessHoursJson));
    }

    public static IReadOnlyList<BusinessHourDto> ParseBusinessHours(string? json)
    {
        if (!string.IsNullOrWhiteSpace(json))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<BusinessHourDto>>(json);
                if (parsed is { Count: 7 }) return parsed;
            }
            catch (JsonException) { /* dados antigos/corrompidos: cai pro padrão abaixo */ }
        }
        // Padrão: seg-sáb 09:00-19:00, domingo fechado.
        return Enumerable.Range(0, 7)
            .Select(d => new BusinessHourDto(d, d != 0, "09:00", "19:00"))
            .ToList();
    }
}
