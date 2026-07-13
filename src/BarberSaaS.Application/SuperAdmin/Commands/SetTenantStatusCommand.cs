using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>Alterna a conta entre Active e Suspended. Suspended bloqueia o login do tenant.</summary>
public record SetTenantStatusCommand(Guid TenantId, TenantStatus Status) : IRequest<string>;

public class SetTenantStatusValidator : AbstractValidator<SetTenantStatusCommand>
{
    public SetTenantStatusValidator()
    {
        RuleFor(x => x.TenantId).NotEmpty();
        RuleFor(x => x.Status).IsInEnum().WithMessage("Status inválido.");
    }
}

public class SetTenantStatusHandler : IRequestHandler<SetTenantStatusCommand, string>
{
    private readonly ISuperAdminRepository _repo;
    private readonly ILogger<SetTenantStatusHandler> _logger;

    public SetTenantStatusHandler(ISuperAdminRepository repo, ILogger<SetTenantStatusHandler> logger)
    {
        _repo = repo; _logger = logger;
    }

    public async Task<string> Handle(SetTenantStatusCommand request, CancellationToken ct)
    {
        var tenant = await _repo.GetTenantAsync(request.TenantId, ct)
            ?? throw new Domain.Exceptions.DomainException("Barbearia não encontrada.");

        tenant.Status = request.Status;
        await _repo.SaveChangesAsync(ct);

        _logger.LogWarning("SUPER ADMIN: tenant {TenantId} ({Slug}) agora está {Status}",
            tenant.Id, tenant.Slug, request.Status);

        return tenant.Status.ToString();
    }
}
