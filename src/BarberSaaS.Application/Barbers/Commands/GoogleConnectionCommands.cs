using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using MediatR;

namespace BarberSaaS.Application.Barbers.Commands;

// Conexão do Google Calendar por barbeiro (OAuth). Barbeiro não tem login próprio —
// quem inicia a conexão é o Owner/Admin no painel, autorizando com a conta Google
// do barbeiro. Os tokens ficam na Infrastructure (IGoogleOAuthService); aqui só se
// orquestra a validação de tenant e o gate barber.GoogleCalendarId.

public record GetGoogleConnectUrlQuery(Guid TenantId, Guid BarberId) : IRequest<string>;

public record GetGoogleStatusQuery(Guid TenantId, Guid BarberId) : IRequest<GoogleConnectionStatus>;

/// <summary>Chamado pelo callback ANÔNIMO do Google — a autorização vem do state assinado, não de JWT.</summary>
public record CompleteGoogleCallbackCommand(string Code, string State) : IRequest<GoogleCallbackOutcome>;
public record GoogleCallbackOutcome(bool Success, Guid? BarberId);

public record DisconnectGoogleCommand(Guid TenantId, Guid BarberId) : IRequest<bool>;

public class GetGoogleConnectUrlHandler : IRequestHandler<GetGoogleConnectUrlQuery, string>
{
    private readonly IBarberRepository _barbers;
    private readonly IGoogleOAuthService _google;

    public GetGoogleConnectUrlHandler(IBarberRepository barbers, IGoogleOAuthService google)
    {
        _barbers = barbers; _google = google;
    }

    public async Task<string> Handle(GetGoogleConnectUrlQuery request, CancellationToken ct)
    {
        if (!_google.IsConfigured)
            throw new DomainException("Integração com Google Calendar não está configurada no servidor.");

        var barber = await _barbers.GetByIdAsync(request.BarberId, ct);
        if (barber == null || barber.TenantId != request.TenantId)
            throw new DomainException("Barbeiro não encontrado.");

        return _google.BuildConnectUrl(request.TenantId, request.BarberId);
    }
}

public class GetGoogleStatusHandler : IRequestHandler<GetGoogleStatusQuery, GoogleConnectionStatus>
{
    private readonly IBarberRepository _barbers;
    private readonly IGoogleOAuthService _google;

    public GetGoogleStatusHandler(IBarberRepository barbers, IGoogleOAuthService google)
    {
        _barbers = barbers; _google = google;
    }

    public async Task<GoogleConnectionStatus> Handle(GetGoogleStatusQuery request, CancellationToken ct)
    {
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct);
        if (barber == null || barber.TenantId != request.TenantId)
            throw new DomainException("Barbeiro não encontrado.");

        return await _google.GetStatusAsync(request.BarberId, ct);
    }
}

public class CompleteGoogleCallbackHandler : IRequestHandler<CompleteGoogleCallbackCommand, GoogleCallbackOutcome>
{
    private readonly IBarberRepository _barbers;
    private readonly IGoogleOAuthService _google;

    public CompleteGoogleCallbackHandler(IBarberRepository barbers, IGoogleOAuthService google)
    {
        _barbers = barbers; _google = google;
    }

    public async Task<GoogleCallbackOutcome> Handle(CompleteGoogleCallbackCommand request, CancellationToken ct)
    {
        var result = await _google.CompleteCallbackAsync(request.Code, request.State, ct);
        if (!result.Success || result.BarberId == null)
            return new GoogleCallbackOutcome(false, result.BarberId);

        // Fluxo anônimo (sem tenant no contexto ⇒ filtro global desativado): valida
        // explicitamente que o barbeiro do state pertence mesmo ao tenant do state.
        var barber = await _barbers.GetByIdAsync(result.BarberId.Value, ct);
        if (barber == null || barber.TenantId != result.TenantId)
        {
            await _google.DisconnectAsync(result.BarberId.Value, ct); // não deixa credencial órfã
            return new GoogleCallbackOutcome(false, result.BarberId);
        }

        // Gate dos handlers de agendamento: com "primary" preenchido, os eventos
        // passam a ser criados no calendário principal da conta conectada.
        barber.GoogleCalendarId = "primary";
        await _barbers.UpdateAsync(barber, ct);

        return new GoogleCallbackOutcome(true, barber.Id);
    }
}

public class DisconnectGoogleHandler : IRequestHandler<DisconnectGoogleCommand, bool>
{
    private readonly IBarberRepository _barbers;
    private readonly IGoogleOAuthService _google;

    public DisconnectGoogleHandler(IBarberRepository barbers, IGoogleOAuthService google)
    {
        _barbers = barbers; _google = google;
    }

    public async Task<bool> Handle(DisconnectGoogleCommand request, CancellationToken ct)
    {
        var barber = await _barbers.GetByIdAsync(request.BarberId, ct);
        if (barber == null || barber.TenantId != request.TenantId)
            throw new DomainException("Barbeiro não encontrado.");

        // Revoga no Google (best-effort), apaga a credencial e limpa GoogleCalendarId.
        await _google.DisconnectAsync(request.BarberId, ct);
        return true;
    }
}
