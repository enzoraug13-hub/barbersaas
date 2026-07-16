using BarberSaaS.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BarberSaaS.Infrastructure.ExternalServices.Sms;

/// <summary>
/// Envio real de SMS via SMSDev (https://www.smsdev.com.br — sem SDK; usa HttpClient).
/// Chave EXCLUSIVAMENTE em configuração/segredos (nunca versionar):
///   Sms:SmsDev:ApiKey  (env var: Sms__SmsDev__ApiKey)
/// Sem fail-open: se o envio falhar o usuário não recebe o código OTP, então o erro
/// é propagado (diferente do Google Calendar, onde fail-open é a regra do projeto).
/// Cada mensagem de até 160 caracteres consome 1 crédito da conta.
/// </summary>
public class SmsDevSmsService : ISmsService
{
    private readonly string _apiKey;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<SmsDevSmsService> _logger;

    public SmsDevSmsService(IConfiguration config, IHttpClientFactory httpFactory, ILogger<SmsDevSmsService> logger)
    {
        _apiKey = config["Sms:SmsDev:ApiKey"] ?? "";
        _httpFactory = httpFactory;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrEmpty(_apiKey);

    public async Task SendAsync(string toPhone, string message, CancellationToken ct = default)
    {
        // O projeto guarda telefone como +55 com formatação; o SMSDev aceita só dígitos
        // (com ou sem o DDI 55). Remove tudo que não for dígito e valida o que sobrou.
        var digits = new string(toPhone.Where(char.IsDigit).ToArray());
        if (digits.Length is < 10 or > 13)
        {
            _logger.LogError("Telefone inválido para envio de SMS via SMSDev: {Phone} ({Digits} dígitos)",
                toPhone, digits.Length);
            throw new InvalidOperationException("Telefone inválido para envio de SMS.");
        }

        var http = _httpFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(15);

        var payload = new Dictionary<string, string>
        {
            ["key"]    = _apiKey,
            ["type"]   = "9",
            ["number"] = digits,
            ["msg"]    = message,
        };

        SmsDevResponse? result;
        try
        {
            var resp = await http.PostAsJsonAsync("https://api.smsdev.com.br/v1/send", payload, ct);
            var body = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogError("Falha HTTP ao enviar SMS via SMSDev ({Status}): {Body}", resp.StatusCode, body);
                throw new InvalidOperationException("Falha ao enviar SMS.");
            }
            result = JsonSerializer.Deserialize<SmsDevResponse>(body);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogError(ex, "Erro de comunicação com o SMSDev");
            throw new InvalidOperationException("Falha ao enviar SMS.", ex);
        }

        if (result?.Situacao != "OK")
        {
            _logger.LogError("SMSDev recusou o envio (codigo {Codigo}): {Descricao}",
                result?.Codigo, result?.Descricao);
            throw new InvalidOperationException("Falha ao enviar SMS.");
        }

        _logger.LogInformation("SMS enviado via SMSDev (id {Id}): {Descricao}", result.Id, result.Descricao);
    }

    private record SmsDevResponse(
        [property: JsonPropertyName("situacao")]  string? Situacao,
        [property: JsonPropertyName("codigo")]    string? Codigo,
        [property: JsonPropertyName("id")]        string? Id,
        [property: JsonPropertyName("descricao")] string? Descricao);
}
