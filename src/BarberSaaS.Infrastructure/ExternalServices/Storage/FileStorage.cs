using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using BarberSaaS.Application.Common.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Infrastructure.ExternalServices.Storage;

/// <summary>Config do bucket R2 (Storage:R2:* — env vars Storage__R2__* no Railway).</summary>
public record R2Options(string AccountId, string AccessKeyId, string SecretAccessKey, string Bucket, string PublicBaseUrl);

/// <summary>
/// Cloudflare R2 via API S3-compatível. Persistente entre redeploys (o disco do
/// Railway é efêmero) e com URL pública absoluta — o assetUrl() do frontend deixa
/// URLs absolutas passarem intactas, então nada muda para quem consome.
/// </summary>
public class R2FileStorage : IFileStorage
{
    private readonly AmazonS3Client _client;
    private readonly R2Options _options;
    private readonly ILogger<R2FileStorage> _logger;

    public R2FileStorage(R2Options options, ILogger<R2FileStorage> logger)
    {
        _options = options;
        _logger  = logger;
        _client  = new AmazonS3Client(options.AccessKeyId, options.SecretAccessKey, new AmazonS3Config
        {
            ServiceURL     = $"https://{options.AccountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
            // R2 rejeita os checksums CRC32 que o SDK v4 calcula por padrão —
            // WHEN_REQUIRED é o ajuste documentado pela Cloudflare.
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED
        });
    }

    public async Task<string> SaveAsync(string key, Stream content, string contentType, CancellationToken ct = default)
    {
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName            = _options.Bucket,
            Key                   = key,
            InputStream           = content,
            ContentType           = contentType,
            DisablePayloadSigning = true // exigência do R2 sobre HTTPS
        }, ct);

        var url = $"{_options.PublicBaseUrl.TrimEnd('/')}/{key}";
        _logger.LogInformation("Upload salvo no R2: {Url}", url);
        return url;
    }
}

/// <summary>
/// Fallback de desenvolvimento: grava em wwwroot/uploads (comportamento original)
/// e devolve URL relativa servida por UseStaticFiles + proxy do Vite.
/// </summary>
public class LocalFileStorage : IFileStorage
{
    private readonly string _webRoot;

    public LocalFileStorage(IHostEnvironment env)
        => _webRoot = Path.Combine(env.ContentRootPath, "wwwroot");

    public async Task<string> SaveAsync(string key, Stream content, string contentType, CancellationToken ct = default)
    {
        var fullPath = Path.Combine(_webRoot, "uploads", key.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using var file = File.Create(fullPath);
        await content.CopyToAsync(file, ct);
        return $"/uploads/{key}";
    }
}
