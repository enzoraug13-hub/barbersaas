using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Dashboard.Queries;

public record GetPaymentMethodsQuery(Guid TenantId, DateOnly StartDate, DateOnly EndDate) : IRequest<PaymentMethodsDto>;

// Quanto entrou por forma de pagamento no período (atendimentos concluídos e pagos).
// Não reconcilia com a receita total do Financeiro (que inclui vendas de balcão etc.);
// é o recorte "como os atendimentos foram pagos".
public record PaymentMethodsDto(
    decimal Cash,
    decimal Pix,
    decimal Credit,
    decimal Debit,
    decimal Other,
    decimal Total);

public class GetPaymentMethodsHandler : IRequestHandler<GetPaymentMethodsQuery, PaymentMethodsDto>
{
    private readonly IDashboardRepository _dashboard;
    private readonly ICacheService _cache;

    public GetPaymentMethodsHandler(IDashboardRepository dashboard, ICacheService cache)
    {
        _dashboard = dashboard; _cache = cache;
    }

    public async Task<PaymentMethodsDto> Handle(GetPaymentMethodsQuery request, CancellationToken ct)
    {
        var cacheKey = $"paymethods:{request.TenantId}:{request.StartDate:yyyyMMdd}:{request.EndDate:yyyyMMdd}";
        return await _cache.GetOrSetAsync(cacheKey,
            () => _dashboard.GetPaymentMethodsAsync(request.TenantId, request.StartDate, request.EndDate, ct),
            TimeSpan.FromMinutes(5));
    }
}
