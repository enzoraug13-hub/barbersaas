using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberSaaS.API.Controllers.v1;

/// <summary>
/// Upload de imagens da barbearia (logo, capa). Dev: salva em wwwroot/uploads/{tenantId}
/// e serve via UseStaticFiles. Em produção, trocar por blob storage mantendo o mesmo contrato.
/// </summary>
[ApiController]
[Route("api/v1/uploads")]
[Authorize(Policy = "RequireOwner")]
public class UploadsController : ControllerBase
{
    private readonly ICurrentTenant _tenant;
    private readonly IWebHostEnvironment _env;
    private static readonly string[] Allowed = { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
    private const long MaxBytes = 5 * 1024 * 1024;

    public UploadsController(ICurrentTenant tenant, IWebHostEnvironment env)
    {
        _tenant = tenant; _env = env;
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
        if (!Allowed.Contains(ext))
            return BadRequest(ApiResponse<object>.Fail("Formato inválido. Use JPG, PNG, WEBP ou GIF."));

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var folder  = Path.Combine(webRoot, "uploads", _tenant.Id.ToString());
        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        await using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
            await file.CopyToAsync(stream, ct);

        var url = $"/uploads/{_tenant.Id}/{fileName}";
        return Ok(ApiResponse<object>.Ok(new { url }));
    }
}
