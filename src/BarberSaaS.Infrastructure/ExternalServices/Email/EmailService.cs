using BarberSaaS.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace BarberSaaS.Infrastructure.ExternalServices.Email;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config; _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        var apiKey = _config["SendGrid:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("SendGrid não configurado. Email para {To} não enviado.", to);
            return;
        }

        var client  = new SendGridClient(apiKey);
        var from    = new EmailAddress(_config["SendGrid:FromEmail"] ?? "noreply@barbersaas.com.br", _config["SendGrid:FromName"] ?? "BarberSaaS");
        var message = MailHelper.CreateSingleEmail(from, new EmailAddress(to), subject, null, htmlBody);

        var response = await client.SendEmailAsync(message, ct);
        if (!response.IsSuccessStatusCode)
            _logger.LogError("SendGrid retornou {Status} para {To}", response.StatusCode, to);
    }
}
