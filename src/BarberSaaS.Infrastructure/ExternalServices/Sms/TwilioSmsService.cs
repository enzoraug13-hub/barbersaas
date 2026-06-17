using BarberSaaS.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Text;

namespace BarberSaaS.Infrastructure.ExternalServices.Sms;

/// <summary>
/// Envio real de SMS via Twilio REST API (sem SDK; usa HttpClient).
/// Credenciais EXCLUSIVAMENTE em configuração/segredos (nunca versionar):
///   Sms:Twilio:AccountSid, Sms:Twilio:AuthToken, Sms:Twilio:FromNumber
/// </summary>
public class TwilioSmsService : ISmsService
{
    private readonly string _sid;
    private readonly string _token;
    private readonly string _from;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<TwilioSmsService> _logger;

    public TwilioSmsService(IConfiguration config, IHttpClientFactory httpFactory, ILogger<TwilioSmsService> logger)
    {
        _sid   = config["Sms:Twilio:AccountSid"] ?? "";
        _token = config["Sms:Twilio:AuthToken"]  ?? "";
        _from  = config["Sms:Twilio:FromNumber"] ?? "";
        _httpFactory = httpFactory;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrEmpty(_sid) && !string.IsNullOrEmpty(_token) && !string.IsNullOrEmpty(_from);

    public async Task SendAsync(string toPhone, string message, CancellationToken ct = default)
    {
        var http = _httpFactory.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Post,
            $"https://api.twilio.com/2010-04-01/Accounts/{_sid}/Messages.json");
        req.Headers.Authorization = new AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_sid}:{_token}")));
        req.Content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("To",   toPhone),
            new KeyValuePair<string, string>("From", _from),
            new KeyValuePair<string, string>("Body", message),
        });

        var resp = await http.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(ct);
            _logger.LogError("Falha ao enviar SMS via Twilio ({Status}): {Body}", resp.StatusCode, body);
            throw new InvalidOperationException("Falha ao enviar SMS.");
        }
    }
}
