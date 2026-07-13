using BarberSaaS.Application.Common.Interfaces;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>
/// Redefine a senha do DONO de um tenant (senha provisória definida pelo super
/// admin, entregue por fora). Mesmo BCrypt do login. Zera o lockout de tentativas
/// e revoga as sessões ativas do dono — senha trocada por admin não deve deixar
/// sessões antigas vivas.
/// </summary>
public record ResetTenantOwnerPasswordCommand(Guid TenantId, string NewPassword) : IRequest<bool>;

public class ResetTenantOwnerPasswordValidator : AbstractValidator<ResetTenantOwnerPasswordCommand>
{
    public ResetTenantOwnerPasswordValidator()
    {
        RuleFor(x => x.TenantId).NotEmpty();
        RuleFor(x => x.NewPassword)
            .NotEmpty().MinimumLength(8).WithMessage("A senha deve ter no mínimo 8 caracteres.");
    }
}

public class ResetTenantOwnerPasswordHandler : IRequestHandler<ResetTenantOwnerPasswordCommand, bool>
{
    private readonly ISuperAdminRepository _repo;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<ResetTenantOwnerPasswordHandler> _logger;

    public ResetTenantOwnerPasswordHandler(ISuperAdminRepository repo, IRefreshTokenRepository refreshTokens,
        IPasswordHasher hasher, ILogger<ResetTenantOwnerPasswordHandler> logger)
    {
        _repo = repo; _refreshTokens = refreshTokens; _hasher = hasher; _logger = logger;
    }

    public async Task<bool> Handle(ResetTenantOwnerPasswordCommand request, CancellationToken ct)
    {
        var owner = await _repo.GetTenantOwnerAsync(request.TenantId, ct)
            ?? throw new Domain.Exceptions.DomainException("Dono da barbearia não encontrado.");

        owner.PasswordHash     = _hasher.Hash(request.NewPassword);
        owner.FailedLoginCount = 0;
        owner.LockedUntil      = null;
        await _repo.SaveChangesAsync(ct);

        var revoked = await _refreshTokens.RevokeAllForUserAsync(owner.Id, null, ct);

        _logger.LogWarning("SUPER ADMIN: senha do dono do tenant {TenantId} redefinida ({Revoked} sessões revogadas)",
            request.TenantId, revoked);

        return true;
    }
}
