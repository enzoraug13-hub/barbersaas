using System.Net;
using System.Text.Json;
using BarberSaaS.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Infrastructure.ExternalServices;

/// <summary>
/// Consulta CNPJ na BrasilAPI (https://brasilapi.com.br/api/cnpj/v1/{cnpj}).
/// Timeout curto (5s) e retorno <c>null</c> em qualquer falha de infraestrutura —
/// o cadastro não pode travar porque a API pública caiu (fail-open).
/// </summary>
public class BrasilApiCnpjService : ICnpjLookupService
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<BrasilApiCnpjService> _logger;

    public BrasilApiCnpjService(IHttpClientFactory httpFactory, ILogger<BrasilApiCnpjService> logger)
    {
        _httpFactory = httpFactory; _logger = logger;
    }

    public async Task<CnpjLookupResult?> LookupAsync(string cnpjDigits, CancellationToken ct = default)
    {
        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(Timeout);

            var client = _httpFactory.CreateClient();
            using var req = new HttpRequestMessage(HttpMethod.Get, $"https://brasilapi.com.br/api/cnpj/v1/{cnpjDigits}");
            // Sem User-Agent a BrasilAPI (Cloudflare) responde 429 direto.
            req.Headers.UserAgent.ParseAdd("Trimly/1.0 (+https://trimly.app)");
            var response = await client.SendAsync(req, timeoutCts.Token);

            if (response.StatusCode == HttpStatusCode.NotFound)
                return new CnpjLookupResult(false, null, null);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Validação online de CNPJ indisponível: BrasilAPI retornou {Status} para {Cnpj}",
                    (int)response.StatusCode, cnpjDigits);
                return null;
            }

            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(timeoutCts.Token));
            var root = json.RootElement;
            var razao = root.TryGetProperty("razao_social", out var r) ? r.GetString() : null;
            var situacao = root.TryGetProperty("descricao_situacao_cadastral", out var s) ? s.GetString() : null;
            return new CnpjLookupResult(true, razao, situacao);
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            // Timeout dos 5s, DNS, rede, JSON inesperado: falha de infraestrutura, não do CNPJ.
            _logger.LogWarning(ex, "Validação online de CNPJ falhou para {Cnpj} — seguindo sem consulta (fail-open)", cnpjDigits);
            return null;
        }
    }
}
