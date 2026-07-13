using BarberSaaS.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.Auth.Commands;

public record LoginCommand(string Email, string Password, string? IpAddress) : IRequest<LoginResult>;

public record LoginResult(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserDto User);

public record UserDto(Guid Id, string Name, string Email, string Role, Guid? TenantId);

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResult>
{
    private readonly IUserRepository _users;
    private readonly ITenantRepository _tenants;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtService _jwt;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IAuthOptions _authOptions;
    private readonly ILogger<LoginCommandHandler> _logger;

    public LoginCommandHandler(
        IUserRepository users,
        ITenantRepository tenants,
        IPasswordHasher hasher,
        IJwtService jwt,
        IRefreshTokenRepository refreshTokens,
        IAuthOptions authOptions,
        ILogger<LoginCommandHandler> logger)
    {
        _users = users; _tenants = tenants; _hasher = hasher; _jwt = jwt;
        _refreshTokens = refreshTokens; _authOptions = authOptions; _logger = logger;
    }

    public async Task<LoginResult> Handle(LoginCommand request, CancellationToken ct)
    {
        // Mesma mensagem para e-mail inexistente e senha errada — não vaza qual dos dois falhou.
        var user = await _users.GetByEmailAsync(request.Email, ct)
            ?? throw new UnauthorizedAccessException("E-mail ou senha incorretos.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Usuário inativo.");

        if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
            throw new UnauthorizedAccessException("Conta bloqueada temporariamente. Tente novamente mais tarde.");

        if (!_hasher.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= 5)
                user.LockedUntil = DateTime.UtcNow.AddMinutes(15);
            await _users.UpdateAsync(user, ct);
            throw new UnauthorizedAccessException("E-mail ou senha incorretos.");
        }

        // Só depois da senha conferir, para não vazar se a conta existe.
        // Contas antigas nasceram com EmailVerified=true, então ligar a flag não bloqueia ninguém já ativo.
        if (_authOptions.RequireEmailConfirmation && !user.EmailVerified)
            throw new UnauthorizedAccessException("Confirme seu e-mail para entrar. Verifique sua caixa de entrada (e o spam).");

        // Conta suspensa pelo super admin bloqueia o login do tenant inteiro.
        // Super admin nunca é bloqueado — senão suspender o próprio tenant o trancaria pra fora.
        // Checado após a senha, pra não vazar o status da conta a quem não a possui.
        if (user.Role != Domain.Enums.UserRole.SuperAdmin)
        {
            var tenant = await _tenants.GetByIdAsync(user.TenantId, ct);
            if (tenant is not null && tenant.Status == Domain.Enums.TenantStatus.Suspended)
                throw new UnauthorizedAccessException("Esta conta está suspensa. Entre em contato com o suporte do Trimly.");
        }

        user.FailedLoginCount = 0;
        user.LockedUntil      = null;
        user.LastLoginAt      = DateTime.UtcNow;
        user.LastLoginIp      = request.IpAddress;
        await _users.UpdateAsync(user, ct);

        var tokens = _jwt.GenerateTokens(user.Id, user.Email, user.Name, user.Role.ToString().ToLower(), user.TenantId);

        await _refreshTokens.AddAsync(new Domain.Entities.RefreshToken
        {
            UserId      = user.Id,
            TenantId    = user.TenantId,
            TokenHash   = HashToken(tokens.RefreshToken),
            ExpiresAt   = DateTime.UtcNow.AddDays(7),
            CreatedByIp = request.IpAddress
        }, ct);

        _logger.LogInformation("User {UserId} logged in successfully", user.Id);

        return new LoginResult(tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresAt,
            new UserDto(user.Id, user.Name, user.Email, user.Role.ToString(), user.TenantId));
    }

    internal static string HashToken(string token)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLower();
    }
}
