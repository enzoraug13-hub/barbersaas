using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Barbers.Commands;

// Edita os dados de exibição/comissão do barbeiro (PUT /barbers/{id}).
// NÃO mexe em e-mail/senha (fluxo separado de credenciais). Segue o padrão validado
// das Metas: carrega a entidade rastreada (GetByIdAsync respeita os filtros globais de
// tenant + soft-delete) -> muta -> UpdateAsync. Nada de DbSet.Update() cego numa PK pré-preenchida.
public record UpdateBarberCommand(
    Guid TenantId,
    Guid BarberId,
    string Name,
    string? PhotoUrl,
    string? Bio,
    string? Phone,
    CommissionType CommissionType,
    decimal CommissionValue,
    bool ShowInPublicPage,
    int DisplayOrder,
    decimal? ChairRentAmount = null,
    ChairRentPeriod? ChairRentPeriod = null) : IRequest<BarberDto>;

public class UpdateBarberValidator : AbstractValidator<UpdateBarberCommand>
{
    public UpdateBarberValidator()
    {
        RuleFor(x => x.BarberId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0);

        When(x => x.CommissionType == CommissionType.Percentage, () =>
            RuleFor(x => x.CommissionValue).InclusiveBetween(0, 100)
                .WithMessage("A comissão percentual deve estar entre 0 e 100."));
        When(x => x.CommissionType == CommissionType.Fixed, () =>
            RuleFor(x => x.CommissionValue).GreaterThanOrEqualTo(0)
                .WithMessage("A comissão fixa não pode ser negativa."));

        RuleFor(x => x.ChairRentAmount).GreaterThan(0)
            .When(x => x.ChairRentAmount.HasValue)
            .WithMessage("O valor da cadeira deve ser maior que zero.");
        RuleFor(x => x.ChairRentPeriod).NotNull()
            .When(x => x.ChairRentAmount.HasValue)
            .WithMessage("Informe a periodicidade do aluguel da cadeira (semanal ou mensal).");
    }
}

public class UpdateBarberHandler : IRequestHandler<UpdateBarberCommand, BarberDto>
{
    private readonly IBarberRepository _barbers;

    public UpdateBarberHandler(IBarberRepository barbers) => _barbers = barbers;

    public async Task<BarberDto> Handle(UpdateBarberCommand request, CancellationToken ct)
    {
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct)
            ?? throw new DomainException("Barbeiro não encontrado.");
        // Defesa-em-profundidade: GetByIdAsync já filtra por tenant, mas confirmamos explicitamente.
        if (barber.TenantId != request.TenantId)
            throw new DomainException("Barbeiro não encontrado.");

        barber.Name             = request.Name;
        barber.PhotoUrl         = request.PhotoUrl;
        barber.Bio              = request.Bio;
        barber.Phone            = request.Phone;
        barber.CommissionType   = request.CommissionType;
        barber.CommissionValue  = request.CommissionValue;
        barber.ShowInPublicPage = request.ShowInPublicPage;
        barber.DisplayOrder     = request.DisplayOrder;
        barber.ChairRentAmount  = request.ChairRentAmount;
        barber.ChairRentPeriod  = request.ChairRentAmount.HasValue ? request.ChairRentPeriod : null;

        await _barbers.UpdateAsync(barber, ct);

        return new BarberDto(barber.Id, barber.Name, barber.PhotoUrl, barber.Bio, barber.Phone,
            barber.IsActive, barber.ShowInPublicPage, barber.GoogleCalendarId, barber.DisplayOrder,
            (int)barber.CommissionType, barber.CommissionValue, barber.ChairRentAmount, (int?)barber.ChairRentPeriod);
    }
}
