using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;
using System.Text;

namespace BarberSaaS.Infrastructure.ExternalServices.GoogleCalendar;

/// <summary>
/// Cifra AES-256-GCM para os tokens OAuth do Google em repouso e para o parâmetro
/// <c>state</c> do fluxo OAuth (o GCM autentica — state adulterado falha na decifração).
/// A chave é derivada de <c>Jwt:SecretKey</c> (SHA-256 com rótulo próprio): zero
/// configuração nova e estável entre deploys. Se o segredo JWT for rotacionado, os
/// tokens gravados ficam ilegíveis — <see cref="Decrypt"/> retorna <c>null</c> e o
/// chamador trata como "barbeiro desconectado" (ele só precisa reconectar).
/// </summary>
public class GoogleTokenCipher
{
    private const int NonceSize = 12;
    private const int TagSize   = 16;

    private readonly byte[] _key;

    public GoogleTokenCipher(IConfiguration config)
    {
        var secret = config["Jwt:SecretKey"] ?? string.Empty;
        _key = SHA256.HashData(Encoding.UTF8.GetBytes("barbersaas:google-token-cipher:" + secret));
    }

    /// <summary>Retorna Base64 URL-safe (vai em query string no state do OAuth).</summary>
    public string Encrypt(string plaintext)
    {
        var nonce  = RandomNumberGenerator.GetBytes(NonceSize);
        var plain  = Encoding.UTF8.GetBytes(plaintext);
        var cipher = new byte[plain.Length];
        var tag    = new byte[TagSize];

        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plain, cipher, tag);

        var payload = new byte[NonceSize + TagSize + cipher.Length];
        nonce.CopyTo(payload, 0);
        tag.CopyTo(payload, NonceSize);
        cipher.CopyTo(payload, NonceSize + TagSize);

        return Convert.ToBase64String(payload).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    /// <summary><c>null</c> quando o payload é inválido, foi adulterado ou a chave mudou.</summary>
    public string? Decrypt(string encrypted)
    {
        try
        {
            var b64 = encrypted.Replace('-', '+').Replace('_', '/');
            b64 += (b64.Length % 4) switch { 2 => "==", 3 => "=", _ => "" };
            var payload = Convert.FromBase64String(b64);
            if (payload.Length < NonceSize + TagSize) return null;

            var nonce  = payload.AsSpan(0, NonceSize);
            var tag    = payload.AsSpan(NonceSize, TagSize);
            var cipher = payload.AsSpan(NonceSize + TagSize);
            var plain  = new byte[cipher.Length];

            using var aes = new AesGcm(_key, TagSize);
            aes.Decrypt(nonce, cipher, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }
        catch
        {
            return null;
        }
    }
}
