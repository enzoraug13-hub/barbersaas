using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using Google.Apis.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Requests;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Calendar.v3;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Infrastructure.ExternalServices.GoogleCalendar;

/// <summary>
/// Fluxo OAuth do Google Calendar por barbeiro (authorization code + refresh token),
/// usando as libs oficiais (Google.Apis.Auth). Config: Google:ClientId,
/// Google:ClientSecret e Google:RedirectUri (env: Google__*).
/// O state do callback é cifrado/autenticado com <see cref="GoogleTokenCipher"/> —
/// callback forjado ou state vencido (10 min) é rejeitado.
/// </summary>
public class GoogleOAuthService : IGoogleOAuthService
{
    private static readonly TimeSpan StateLifetime = TimeSpan.FromMinutes(10);
    // Renova o access token quando faltar menos que isso para expirar.
    private static readonly TimeSpan RefreshSkew   = TimeSpan.FromMinutes(2);

    private readonly string? _clientId;
    private readonly string? _clientSecret;
    private readonly string? _redirectUri;
    private readonly GoogleTokenCipher _cipher;
    private readonly IBarberGoogleCredentialRepository _credentials;
    private readonly IBarberRepository _barbers;
    private readonly ILogger<GoogleOAuthService> _logger;

    public GoogleOAuthService(
        IConfiguration config, GoogleTokenCipher cipher,
        IBarberGoogleCredentialRepository credentials, IBarberRepository barbers,
        ILogger<GoogleOAuthService> logger)
    {
        _clientId     = config["Google:ClientId"];
        _clientSecret = config["Google:ClientSecret"];
        _redirectUri  = config["Google:RedirectUri"];
        _cipher       = cipher;
        _credentials  = credentials;
        _barbers      = barbers;
        _logger       = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrEmpty(_clientId) &&
        !string.IsNullOrEmpty(_clientSecret) &&
        !string.IsNullOrEmpty(_redirectUri);

    private GoogleAuthorizationCodeFlow CreateFlow() => new(new GoogleAuthorizationCodeFlow.Initializer
    {
        ClientSecrets = new ClientSecrets { ClientId = _clientId, ClientSecret = _clientSecret },
        // openid+email só para exibir "conectado como fulano@gmail.com" no painel.
        Scopes = new[] { CalendarService.Scope.CalendarEvents, "openid", "email" }
    });

    public string BuildConnectUrl(Guid tenantId, Guid barberId)
    {
        var state = _cipher.Encrypt(
            $"{tenantId:N}|{barberId:N}|{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}");

        var url = (GoogleAuthorizationCodeRequestUrl)CreateFlow().CreateAuthorizationCodeRequest(_redirectUri);
        url.State      = state;
        url.AccessType = "offline";
        // Sem "consent" o Google só devolve refresh_token na PRIMEIRA autorização —
        // reconectar depois de desconectar viria sem refresh_token e quebraria a renovação.
        url.Prompt     = "consent";
        return url.Build().ToString();
    }

    public async Task<GoogleCallbackResult> CompleteCallbackAsync(string code, string state, CancellationToken ct = default)
    {
        var parsed = ParseState(state);
        if (parsed == null)
        {
            _logger.LogWarning("Google OAuth: callback com state inválido ou vencido.");
            return new GoogleCallbackResult(false, null, null, null);
        }
        var (tenantId, barberId) = parsed.Value;

        try
        {
            var token = await CreateFlow().ExchangeCodeForTokenAsync(barberId.ToString(), code, _redirectUri, ct);
            if (string.IsNullOrEmpty(token.AccessToken) || string.IsNullOrEmpty(token.RefreshToken))
            {
                _logger.LogWarning("Google OAuth: resposta sem access/refresh token (barbeiro {BarberId}).", barberId);
                return new GoogleCallbackResult(false, tenantId, barberId, null);
            }

            string? email = null;
            if (!string.IsNullOrEmpty(token.IdToken))
            {
                try { email = (await GoogleJsonWebSignature.ValidateAsync(token.IdToken)).Email; }
                catch (Exception ex) { _logger.LogWarning(ex, "Google OAuth: id_token ilegível — segue sem e-mail."); }
            }

            var expiresAt = DateTime.UtcNow.AddSeconds(token.ExpiresInSeconds ?? 3600);
            var existing  = await _credentials.GetByBarberIdAsync(barberId, ct);
            if (existing == null)
            {
                await _credentials.AddAsync(new BarberGoogleCredential
                {
                    TenantId             = tenantId,
                    BarberId             = barberId,
                    GoogleEmail          = email,
                    AccessToken          = _cipher.Encrypt(token.AccessToken),
                    RefreshToken         = _cipher.Encrypt(token.RefreshToken),
                    AccessTokenExpiresAt = expiresAt,
                    ConnectedAt          = DateTime.UtcNow
                }, ct);
            }
            else
            {
                existing.GoogleEmail          = email ?? existing.GoogleEmail;
                existing.AccessToken          = _cipher.Encrypt(token.AccessToken);
                existing.RefreshToken         = _cipher.Encrypt(token.RefreshToken);
                existing.AccessTokenExpiresAt = expiresAt;
                existing.ConnectedAt          = DateTime.UtcNow;
                await _credentials.UpdateAsync(existing, ct);
            }

            return new GoogleCallbackResult(true, tenantId, barberId, email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google OAuth: falha ao trocar code por tokens (barbeiro {BarberId}).", barberId);
            return new GoogleCallbackResult(false, tenantId, barberId, null);
        }
    }

    public async Task DisconnectAsync(Guid barberId, CancellationToken ct = default)
    {
        var cred = await _credentials.GetByBarberIdAsync(barberId, ct);
        if (cred != null && IsConfigured)
        {
            var refresh = _cipher.Decrypt(cred.RefreshToken);
            if (refresh != null)
            {
                try { await CreateFlow().RevokeTokenAsync(barberId.ToString(), refresh, ct); }
                catch (Exception ex) { _logger.LogWarning(ex, "Google OAuth: revogação falhou (barbeiro {BarberId}) — removendo credencial mesmo assim.", barberId); }
            }
        }
        await RemoveCredentialAsync(barberId, ct);
    }

    public async Task<GoogleConnectionStatus> GetStatusAsync(Guid barberId, CancellationToken ct = default)
    {
        var cred = await _credentials.GetByBarberIdAsync(barberId, ct);
        return cred == null
            ? new GoogleConnectionStatus(false, null, null)
            : new GoogleConnectionStatus(true, cred.GoogleEmail, cred.ConnectedAt);
    }

    public async Task<string?> GetValidAccessTokenAsync(Guid barberId, CancellationToken ct = default)
    {
        var cred = await _credentials.GetByBarberIdAsync(barberId, ct);
        if (cred == null) return null;

        var refresh = _cipher.Decrypt(cred.RefreshToken);
        if (refresh == null)
        {
            // Chave de cifra mudou (Jwt:SecretKey rotacionado) — impossível renovar; exige reconexão.
            _logger.LogWarning("Google OAuth: refresh token ilegível (barbeiro {BarberId}) — reconexão necessária.", barberId);
            return null;
        }

        var access = _cipher.Decrypt(cred.AccessToken);
        if (access != null && cred.AccessTokenExpiresAt > DateTime.UtcNow.Add(RefreshSkew))
            return access;

        if (!IsConfigured) return null;

        try
        {
            var token = await CreateFlow().RefreshTokenAsync(barberId.ToString(), refresh, ct);
            cred.AccessToken          = _cipher.Encrypt(token.AccessToken);
            if (!string.IsNullOrEmpty(token.RefreshToken))
                cred.RefreshToken     = _cipher.Encrypt(token.RefreshToken);
            cred.AccessTokenExpiresAt = DateTime.UtcNow.AddSeconds(token.ExpiresInSeconds ?? 3600);
            await _credentials.UpdateAsync(cred, ct);
            return token.AccessToken;
        }
        catch (TokenResponseException ex) when (ex.Error?.Error == "invalid_grant")
        {
            // Barbeiro revogou o acesso na conta Google — auto-desconecta para o
            // gate (GoogleCalendarId) parar de tentar a cada agendamento.
            _logger.LogWarning("Google OAuth: refresh revogado pelo usuário (barbeiro {BarberId}) — desconectando.", barberId);
            await RemoveCredentialAsync(barberId, ct);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google OAuth: falha ao renovar access token (barbeiro {BarberId}).", barberId);
            return null;
        }
    }

    // Apaga a credencial e limpa o gate barber.GoogleCalendarId — os handlers de
    // agendamento usam esse campo para decidir se tentam criar evento.
    private async Task RemoveCredentialAsync(Guid barberId, CancellationToken ct)
    {
        await _credentials.DeleteByBarberIdAsync(barberId, ct);
        var barber = await _barbers.GetByIdAsync(barberId, ct);
        if (barber != null && !string.IsNullOrEmpty(barber.GoogleCalendarId))
        {
            barber.GoogleCalendarId = null;
            await _barbers.UpdateAsync(barber, ct);
        }
    }

    private (Guid TenantId, Guid BarberId)? ParseState(string state)
    {
        var plain = _cipher.Decrypt(state);
        if (plain == null) return null;

        var parts = plain.Split('|');
        if (parts.Length != 3) return null;
        if (!Guid.TryParseExact(parts[0], "N", out var tenantId)) return null;
        if (!Guid.TryParseExact(parts[1], "N", out var barberId)) return null;
        if (!long.TryParse(parts[2], out var issuedUnix)) return null;

        var age = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - issuedUnix;
        if (age < 0 || age > StateLifetime.TotalSeconds) return null;

        return (tenantId, barberId);
    }
}
