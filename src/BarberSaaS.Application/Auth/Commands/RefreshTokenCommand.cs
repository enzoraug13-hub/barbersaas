using BarberSaaS.Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.Auth.Commands;

public record RefreshTokenCommand(string RefreshToken, string? IpAddress) : IRequest<LoginResult>;

public class RefreshTokenHandler : IRequestHandler<RefreshTokenCommand, LoginResult>
{
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IUserRepository _users;
    private readonly IJwtService _jwt;
    private readonly ILogger<RefreshTokenHandler> _logger;

    public RefreshTokenHandler(IRefreshTokenRepository refreshTokens, IUserRepository users, IJwtService jwt,
        ILogger<RefreshTokenHandler> logger)
    {
        _refreshTokens = refreshTokens; _users = users; _jwt = jwt; _logger = logger;
    }

    public async Task<LoginResult> Handle(RefreshTokenCommand request, CancellationToken ct)
    {
        var hash = LoginCommandHandler.HashToken(request.RefreshToken);
        var stored = await _refreshTokens.GetByHashAsync(hash, ct)
            ?? throw new UnauthorizedAccessException("Refresh token inválido ou expirado.");

        // Reuso de token JÁ REVOGADO = sinal clássico de roubo: na rotação o token antigo
        // morre; se ele reaparece, ou um ladrão está usando o token vazado, ou o ladrão
        // rotacionou primeiro e o dono legítimo está com o antigo. Não dá pra saber qual
        // das pontas é o atacante — revoga a cadeia inteira e força novo login nas duas.
        if (stored.RevokedAt is not null)
        {
            var revoked = await _refreshTokens.RevokeAllForUserAsync(stored.UserId, request.IpAddress, ct);
            _logger.LogWarning(
                "SEGURANÇA: reuso de refresh token revogado (usuário {UserId}, IP {Ip}) — {Count} sessões ativas revogadas",
                stored.UserId, request.IpAddress, revoked);
            throw new UnauthorizedAccessException("Sessão encerrada por segurança. Entre novamente.");
        }

        if (!stored.IsActive) // não revogado — então só pode estar expirado
            throw new UnauthorizedAccessException("Refresh token expirado.");

        stored.RevokedAt   = DateTime.UtcNow;
        stored.RevokedByIp = request.IpAddress;
        await _refreshTokens.UpdateAsync(stored, ct);

        var user = await _users.GetByIdAsync(stored.UserId, ct)
            ?? throw new UnauthorizedAccessException("Usuário não encontrado.");

        // Mesmo tratamento do login: tenant vazio (super admin) → claim vazio.
        Guid? tenantId = user.TenantId == Guid.Empty ? null : user.TenantId;
        var tokens = _jwt.GenerateTokens(user.Id, user.Email, user.Name, user.Role.ToString().ToLower(), tenantId);

        await _refreshTokens.AddAsync(new Domain.Entities.RefreshToken
        {
            UserId          = user.Id,
            TenantId        = user.TenantId,
            TokenHash       = LoginCommandHandler.HashToken(tokens.RefreshToken),
            ExpiresAt       = DateTime.UtcNow.AddDays(7),
            CreatedByIp     = request.IpAddress,
            ReplacedByToken = tokens.RefreshToken
        }, ct);

        return new LoginResult(tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresAt,
            new UserDto(user.Id, user.Name, user.Email, user.Role.ToString(), tenantId));
    }
}
