using BarberSaaS.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Infrastructure.ExternalServices.Sms;

/// <summary>
/// Stub de desenvolvimento: NÃO envia SMS real, apenas registra no log do servidor.
/// Ativo quando nenhum provedor (Twilio) está configurado. Como IsConfigured=false,
/// a API devolve o código OTP na resposta para permitir testar o fluxo localmente.
/// </summary>
public class LogSmsService : ISmsService
{
    private readonly ILogger<LogSmsService> _logger;
    public LogSmsService(ILogger<LogSmsService> logger) => _logger = logger;

    public bool IsConfigured => false;

    public Task SendAsync(string toPhone, string message, CancellationToken ct = default)
    {
        _logger.LogInformation("[SMS-DEV] (não enviado) para {Phone}: {Message}", toPhone, message);
        return Task.CompletedTask;
    }
}
