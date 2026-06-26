using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Clients.Commands;

// Migração única (Parte 3): remove os "clientes fantasma" criados pelo
// RequestOtpCommand antigo (find-or-create por telefone) — Name vazio.
// Só apaga quem NÃO tem nenhum agendamento vinculado, pra nunca perder
// histórico por engano. DryRun=true só lista os candidatos, sem apagar.
public record CleanupGhostClientsCommand(bool DryRun) : IRequest<CleanupGhostClientsResult>;

public record GhostClientDto(Guid Id, string PhoneNumber, DateTime CreatedAt);

public record CleanupGhostClientsResult(IReadOnlyList<GhostClientDto> Candidates, int DeletedCount);

public class CleanupGhostClientsHandler : IRequestHandler<CleanupGhostClientsCommand, CleanupGhostClientsResult>
{
    private readonly IClientRepository _clients;
    private readonly IAppointmentRepositoryFull _appointments;

    public CleanupGhostClientsHandler(IClientRepository clients, IAppointmentRepositoryFull appointments)
    {
        _clients = clients; _appointments = appointments;
    }

    public async Task<CleanupGhostClientsResult> Handle(CleanupGhostClientsCommand request, CancellationToken ct)
    {
        var all = await _clients.GetAllAsync(ct);
        var ghosts = all.Where(c => string.IsNullOrWhiteSpace(c.Name)).ToList();

        var candidates = new List<GhostClientDto>();
        foreach (var c in ghosts)
        {
            var appts = await _appointments.GetByClientAsync(c.Id, ct);
            if (appts.Count == 0)
                candidates.Add(new GhostClientDto(c.Id, c.PhoneNumber, c.CreatedAt));
        }

        if (request.DryRun)
            return new CleanupGhostClientsResult(candidates, 0);

        var deleted = 0;
        foreach (var dto in candidates)
        {
            var client = ghosts.First(c => c.Id == dto.Id);
            await _clients.DeleteAsync(client, ct);
            deleted++;
        }

        return new CleanupGhostClientsResult(candidates, deleted);
    }
}
