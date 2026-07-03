using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.Auth.Commands;

/* ===================== Confirmar e-mail (link do e-mail de boas-vindas) ===================== */

public record ConfirmEmailCommand(string Token) : IRequest<bool>;

public class ConfirmEmailValidator : AbstractValidator<ConfirmEmailCommand>
{
    public ConfirmEmailValidator()
    {
        RuleFor(x => x.Token).NotEmpty().WithMessage("Token de confirmação ausente.").MaximumLength(200);
    }
}

public class ConfirmEmailHandler : IRequestHandler<ConfirmEmailCommand, bool>
{
    private readonly IUserRepository _users;

    public ConfirmEmailHandler(IUserRepository users) => _users = users;

    public async Task<bool> Handle(ConfirmEmailCommand request, CancellationToken ct)
    {
        var user = await _users.GetByEmailVerifyTokenAsync(request.Token, ct)
            ?? throw new DomainException("Link de confirmação inválido ou já utilizado.");

        user.EmailVerified    = true;
        user.EmailVerifyToken = null;
        await _users.UpdateAsync(user, ct);
        return true;
    }
}

/* ===================== Reenviar e-mail de confirmação ===================== */

public record ResendConfirmationEmailCommand(string Email) : IRequest<bool>;

public class ResendConfirmationEmailValidator : AbstractValidator<ResendConfirmationEmailCommand>
{
    public ResendConfirmationEmailValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("Informe o e-mail.").EmailAddress().WithMessage("E-mail inválido.");
    }
}

public class ResendConfirmationEmailHandler : IRequestHandler<ResendConfirmationEmailCommand, bool>
{
    private readonly IUserRepository _users;
    private readonly IAuthOptions _authOptions;
    private readonly IEmailService _email;
    private readonly ILogger<ResendConfirmationEmailHandler> _logger;

    public ResendConfirmationEmailHandler(
        IUserRepository users, IAuthOptions authOptions, IEmailService email,
        ILogger<ResendConfirmationEmailHandler> logger)
    {
        _users = users; _authOptions = authOptions; _email = email; _logger = logger;
    }

    public async Task<bool> Handle(ResendConfirmationEmailCommand request, CancellationToken ct)
    {
        // Resposta idêntica exista ou não a conta / já confirmada — evita enumeração de e-mails.
        var user = await _users.GetByEmailAsync(request.Email, ct);
        if (user is null || user.EmailVerified) return true;

        user.EmailVerifyToken = RegisterTenantHandler.GenerateVerifyToken();
        await _users.UpdateAsync(user, ct);

        try
        {
            var link = $"{_authOptions.FrontendUrl}/confirmar-email?token={user.EmailVerifyToken}";
            await _email.SendAsync(user.Email, ConfirmationEmail.Subject,
                ConfirmationEmail.BuildHtml(user.Name, null, link), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao reenviar e-mail de confirmação para {Email}", user.Email);
        }
        return true;
    }
}

/* ===================== Template do e-mail ===================== */

public static class ConfirmationEmail
{
    public const string Subject = "Confirme sua conta — Trimly";

    public static string BuildHtml(string name, string? businessName, string link)
    {
        var hello = string.IsNullOrWhiteSpace(name) ? "Olá" : $"Olá, {System.Net.WebUtility.HtmlEncode(name)}";
        var intro = businessName is null
            ? "Falta só um passo para ativar sua conta no <b>Trimly</b>."
            : $"Sua barbearia <b>{System.Net.WebUtility.HtmlEncode(businessName)}</b> foi criada no <b>Trimly</b>. Falta só um passo para ativar sua conta.";

        return $@"<!doctype html>
<html lang=""pt-BR"">
<body style=""margin:0;padding:32px 16px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;"">
  <div style=""max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;"">
    <h1 style=""font-size:20px;margin:0 0 16px;"">Trimly</h1>
    <p style=""font-size:15px;line-height:1.6;margin:0 0 8px;"">{hello}!</p>
    <p style=""font-size:15px;line-height:1.6;margin:0 0 24px;"">{intro}</p>
    <p style=""text-align:center;margin:0 0 24px;"">
      <a href=""{link}"" style=""display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:bold;"">Confirmar meu e-mail</a>
    </p>
    <p style=""font-size:13px;line-height:1.6;color:#71717a;margin:0 0 8px;"">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
    <p style=""font-size:12px;line-height:1.5;color:#71717a;word-break:break-all;margin:0 0 24px;"">{link}</p>
    <p style=""font-size:12px;color:#a1a1aa;margin:0;"">Se você não criou esta conta, ignore este e-mail.</p>
  </div>
</body>
</html>";
    }
}
