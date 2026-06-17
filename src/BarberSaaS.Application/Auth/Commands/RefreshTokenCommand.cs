using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Auth.Commands;

public record RefreshTokenCommand(string RefreshToken, string? IpAddress) : IRequest<LoginResult>;

public class RefreshTokenHandler : IRequestHandler<RefreshTokenCommand, LoginResult>
{
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IUserRepository _users;
    private readonly IJwtService _jwt;

    public RefreshTokenHandler(IRefreshTokenRepository refreshTokens, IUserRepository users, IJwtService jwt)
    {
        _refreshTokens = refreshTokens; _users = users; _jwt = jwt;
    }

    public async Task<LoginResult> Handle(RefreshTokenCommand request, CancellationToken ct)
    {
        var hash = LoginCommandHandler.HashToken(request.RefreshToken);
        var stored = await _refreshTokens.GetByHashAsync(hash, ct)
            ?? throw new UnauthorizedAccessException("Refresh token inválido ou expirado.");

        if (!stored.IsActive)
            throw new UnauthorizedAccessException("Refresh token expirado ou revogado.");

        stored.RevokedAt   = DateTime.UtcNow;
        stored.RevokedByIp = request.IpAddress;
        await _refreshTokens.UpdateAsync(stored, ct);

        var user = await _users.GetByIdAsync(stored.UserId, ct)
            ?? throw new UnauthorizedAccessException("Usuário não encontrado.");

        var tokens = _jwt.GenerateTokens(user.Id, user.Email, user.Name, user.Role.ToString().ToLower(), user.TenantId);

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
            new UserDto(user.Id, user.Name, user.Email, user.Role.ToString(), user.TenantId));
    }
}
