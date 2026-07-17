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
// Owner OU super admin: o super admin (sem tenant) usa uploads pra anexar
// comprovante de fatura — o arquivo não é dado tenant-scoped, só storage.
[Authorize(Policy = "RequireOwnerOrSuperAdmin")]
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

        // Defesa em profundidade: a extensão diz o que o arquivo ALEGA ser; os magic
        // bytes dizem o que ele É. Sem isso, qualquer arquivo renomeado pra .png
        // passava e era servido pelo R2 com MIME de imagem.
        var header = new byte[12];
        int read;
        await using (var probe = file.OpenReadStream())
            read = await probe.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);
        if (!MatchesSignature(ext, header, read))
            return BadRequest(ApiResponse<object>.Fail(
                $"O conteúdo do arquivo não corresponde ao formato {ext.TrimStart('.').ToUpperInvariant()}. Envie a imagem original."));

        // Super admin não tem tenant: os arquivos dele (comprovantes) vão pro
        // prefixo "trimly" em vez de uma pasta de guid zerado.
        var prefix = _tenant.Id == Guid.Empty ? "trimly" : _tenant.Id.ToString();
        var key = $"{prefix}/{Guid.NewGuid():N}{ext}";
        await using var stream = file.OpenReadStream();
        var url = await _storage.SaveAsync(key, stream, contentType, ct);

        return Ok(ApiResponse<object>.Ok(new { url }));
    }

    // Assinaturas reais dos formatos aceitos (magic numbers) — 12 bytes bastam:
    //   JPEG: FF D8 FF   PNG: 89 "PNG" 0D 0A 1A 0A
    //   GIF:  "GIF87a"/"GIF89a"   WEBP: "RIFF" ???? "WEBP" (tamanho nos bytes 4-7)
    private static bool MatchesSignature(string ext, byte[] h, int read)
    {
        static bool At(byte[] h, int read, int offset, params byte[] sig)
            => read >= offset + sig.Length && h.AsSpan(offset, sig.Length).SequenceEqual(sig);

        return ext switch
        {
            ".jpg" or ".jpeg" => At(h, read, 0, 0xFF, 0xD8, 0xFF),
            ".png"            => At(h, read, 0, 0x89, (byte)'P', (byte)'N', (byte)'G', 0x0D, 0x0A, 0x1A, 0x0A),
            ".gif"            => At(h, read, 0, (byte)'G', (byte)'I', (byte)'F', (byte)'8', (byte)'7', (byte)'a')
                              || At(h, read, 0, (byte)'G', (byte)'I', (byte)'F', (byte)'8', (byte)'9', (byte)'a'),
            ".webp"           => At(h, read, 0, (byte)'R', (byte)'I', (byte)'F', (byte)'F')
                              && At(h, read, 8, (byte)'W', (byte)'E', (byte)'B', (byte)'P'),
            _ => false,
        };
    }
}
