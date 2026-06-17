using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "RequireOwner")]
public class SettingsController : ControllerBase
{
    private readonly ITenantRepository _tenants;
    private readonly ICurrentTenant _tenant;
    private readonly ICacheService _cache;

    public SettingsController(ITenantRepository tenants, ICurrentTenant tenant, ICacheService cache)
    {
        _tenants = tenants; _tenant = tenant; _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var tenant = await _tenants.GetWithSettingsAsync(_tenant.Id, ct);
        if (tenant?.Settings is not { } s) return NotFound();

        // Projeta um objeto anônimo em vez de devolver a entidade EF crua:
        // TenantSettings.Tenant cria um ciclo de referência que o System.Text.Json
        // não serializa (resultava em 500). Também evita vazar campos não usados.
        return Ok(ApiResponse<object>.Ok(new
        {
            s.BusinessName, s.Description,
            s.LogoUrl, s.CoverImageUrl,
            s.PrimaryColor, s.SecondaryColor, s.AccentColor,
            s.Phone, s.WhatsAppNumber, s.InstagramUrl,
            s.Address, s.City, s.State, s.ZipCode,
            s.SlotIntervalMinutes, s.MaxAdvanceDays, s.MinNoticeMinutes,
            s.AllowOnlineBooking, s.RequireConfirmation,
            s.PublicSlug
        }));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateSettingsRequest request, CancellationToken ct)
    {
        var tenant = await _tenants.GetWithSettingsAsync(_tenant.Id, ct);
        if (tenant == null || tenant.Settings == null) return NotFound();

        var s = tenant.Settings;
        s.BusinessName         = request.BusinessName ?? s.BusinessName;
        s.Description          = request.Description  ?? s.Description;
        // Fotos: string vazia ("") = remover; null = não enviado (mantém atual).
        s.LogoUrl              = request.LogoUrl       ?? s.LogoUrl;
        s.CoverImageUrl        = request.CoverImageUrl ?? s.CoverImageUrl;
        s.PrimaryColor         = request.PrimaryColor  ?? s.PrimaryColor;
        s.SecondaryColor       = request.SecondaryColor ?? s.SecondaryColor;
        s.AccentColor          = request.AccentColor    ?? s.AccentColor;
        s.Phone                = request.Phone          ?? s.Phone;
        s.Address              = request.Address        ?? s.Address;
        s.City                 = request.City           ?? s.City;
        s.State                = request.State          ?? s.State;
        s.ZipCode              = request.ZipCode        ?? s.ZipCode;
        s.InstagramUrl         = request.InstagramUrl   ?? s.InstagramUrl;
        s.WhatsAppNumber       = request.WhatsAppNumber ?? s.WhatsAppNumber;
        s.AllowOnlineBooking   = request.AllowOnlineBooking ?? s.AllowOnlineBooking;
        s.RequireConfirmation  = request.RequireConfirmation ?? s.RequireConfirmation;
        s.SlotIntervalMinutes  = request.SlotIntervalMinutes ?? s.SlotIntervalMinutes;
        s.MaxAdvanceDays       = request.MaxAdvanceDays ?? s.MaxAdvanceDays;

        await _tenants.UpdateAsync(tenant, ct);
        await _cache.RemoveByPatternAsync($"public:{s.PublicSlug}:*");

        return Ok(ApiResponse<bool>.Ok(true, "Configurações atualizadas."));
    }
}

public record UpdateSettingsRequest(
    string? BusinessName, string? Description,
    string? LogoUrl, string? CoverImageUrl,
    string? PrimaryColor, string? SecondaryColor, string? AccentColor,
    string? Phone, string? Address, string? City, string? State, string? ZipCode,
    string? InstagramUrl, string? WhatsAppNumber,
    bool? AllowOnlineBooking, bool? RequireConfirmation,
    int? SlotIntervalMinutes, int? MaxAdvanceDays);
