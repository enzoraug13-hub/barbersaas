using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Loyalty.Commands;

public record UpdateLoyaltyProgramCommand(bool IsEnabled, LoyaltyMode Mode, decimal PointsPerReal) : IRequest<bool>;

public class UpdateLoyaltyProgramValidator : AbstractValidator<UpdateLoyaltyProgramCommand>
{
    public UpdateLoyaltyProgramValidator()
    {
        RuleFor(x => x.Mode).IsInEnum();
        // Só relevante no modo Points, mas o valor fica salvo para quando alternar de modo.
        RuleFor(x => x.PointsPerReal).GreaterThan(0).LessThanOrEqualTo(100)
            .WithMessage("Pontos por real deve ser maior que 0 e no máximo 100.");
    }
}

public class UpdateLoyaltyProgramHandler : IRequestHandler<UpdateLoyaltyProgramCommand, bool>
{
    private readonly ILoyaltyRepository _loyalty;
    private readonly ICurrentTenant _tenant;

    public UpdateLoyaltyProgramHandler(ILoyaltyRepository loyalty, ICurrentTenant tenant)
    {
        _loyalty = loyalty; _tenant = tenant;
    }

    public async Task<bool> Handle(UpdateLoyaltyProgramCommand request, CancellationToken ct)
    {
        var program = await _loyalty.GetProgramAsync(_tenant.Id, ct)
            ?? new LoyaltyProgram { TenantId = _tenant.Id };

        program.IsEnabled     = request.IsEnabled;
        program.Mode          = request.Mode;
        program.PointsPerReal = request.PointsPerReal;

        await _loyalty.UpsertProgramAsync(program, ct);
        return true;
    }
}
