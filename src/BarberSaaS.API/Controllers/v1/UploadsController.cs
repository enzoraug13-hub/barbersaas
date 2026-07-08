using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

/// <summary>
/// Upload de imagens da barbearia (logo, capa, fotos). O destino vem de
/// <see cref="IFileStorage"/>: Cloudflare R2 em produção (persistente — o disco do
/// Railway some a cada redeploy), wwwroot local em dev. Contrato estável:
/// POST → { url } (absoluta no R2, relativa no local — o assetUrl() do frontend
/// resolve as duas).
/// </summary>
[ApiController]
[Route("api/v1/uploads")]
[Authorize(Policy = "RequireOwner")]
public class UploadsController : ControllerBase
{
    private readonly ICurrentTenant _tenant;
    private readonly IFileStorage _storage;

    // Extensão permitida → MIME real. O Content-Type declarado pelo cliente é ignorado
    // (forjável: um .png "text/html" seria servido como HTML pelo R2) — o tipo salvo
    // deriva SEMPRE da extensão whitelistada.
    private static readonly Dictionary<string, string> AllowedTypes = new()
    {
        [".jpg"]  = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"]  = "image/png",
        [".webp"] = "image/webp",
        [".gif"]  = "image/gif",
    };
    private const long MaxBytes = 5 * 1024 * 1024;

    public UploadsController(ICurrentTenant tenant, IFileStorage storage)
    {
        _tenant = tenant; _storage = storage;
    }

    [HttpPost]
    [RequestSizeLimit(MaxBytes)]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("Nenhum arquivo enviado."));
        if (file.Length > MaxBytes)
            return BadRequest(ApiResponse<object>.Fail("Arquivo muito grande (máximo 5 MB)."));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedTypes.TryGetValue(ext, out var contentType))
            return BadRequest(ApiResponse<object>.Fail("Formato inválido. Use JPG, PNG, WEBP ou GIF."));

        var key = $"{_tenant.Id}/{Guid.NewGuid():N}{ext}";
        await using var stream = file.OpenReadStream();
        var url = await _storage.SaveAsync(key, stream, contentType, ct);

        return Ok(ApiResponse<object>.Ok(new { url }));
    }
}
