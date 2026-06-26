using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Dashboard.Queries;
using BarberSaaS.Domain.Exceptions;
using MediatR;

namespace BarberSaaS.Application.Barbers.Queries;

// Série temporal mensal de desempenho de UM barbeiro (GET /barbers/{id}/performance?months=6).
// Espelha o GetMonthlyRevenueQuery do Dashboard, mas filtrado por BarberId e baseado em
// Appointment.FinalPrice dos atendimentos CONCLUÍDOS — é o gráfico do perfil do barbeiro.
public record GetBarberPerformanceSeriesQuery(Guid TenantId, Guid BarberId, int Months)
    : IRequest<IReadOnlyList<BarberMonthlyPointDto>>;

public record BarberMonthlyPointDto(string Month, decimal Revenue, int Appointments);

public class GetBarberPerformanceSeriesHandler
    : IRequestHandler<GetBarberPerformanceSeriesQuery, IReadOnlyList<BarberMonthlyPointDto>>
{
    private readonly IBarberRepository _barbers;
    private readonly IDashboardRepository _dashboard;

    public GetBarberPerformanceSeriesHandler(IBarberRepository barbers, IDashboardRepository dashboard)
    {
        _barbers = barbers; _dashboard = dashboard;
    }

    public async Task<IReadOnlyList<BarberMonthlyPointDto>> Handle(GetBarberPerformanceSeriesQuery request, CancellationToken ct)
    {
        // Defesa-em-profundidade: confirma que o barbeiro existe e é deste tenant antes de montar a série.
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct)
            ?? throw new DomainException("Barbeiro não encontrado.");
        if (barber.TenantId != request.TenantId)
            throw new DomainException("Barbeiro não encontrado.");

        return await _dashboard.GetBarberMonthlySeriesAsync(request.TenantId, request.BarberId,
            request.Months <= 0 ? 6 : request.Months, ct);
    }
}
