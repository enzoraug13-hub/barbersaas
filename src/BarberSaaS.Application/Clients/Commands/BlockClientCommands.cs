using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Clients.Commands;

public record BlockClientCommand(Guid Id, string? Reason) : IRequest<bool>;
public record UnblockClientCommand(Guid Id) : IRequest<bool>;

public class BlockClientHandler : IRequestHandler<BlockClientCommand, bool>
{
    private readonly IClientRepository _clients;
    public BlockClientHandler(IClientRepository clients) => _clients = clients;

    public async Task<bool> Handle(BlockClientCommand request, CancellationToken ct)
    {
        var c = await _clients.GetByIdAsync(request.Id, ct);
        if (c is null) return false;
        c.IsBlocked   = true;
        c.BlockReason = request.Reason;
        await _clients.UpdateAsync(c, ct);
        return true;
    }
}

public class UnblockClientHandler : IRequestHandler<UnblockClientCommand, bool>
{
    private readonly IClientRepository _clients;
    public UnblockClientHandler(IClientRepository clients) => _clients = clients;

    public async Task<bool> Handle(UnblockClientCommand request, CancellationToken ct)
    {
        var c = await _clients.GetByIdAsync(request.Id, ct);
        if (c is null) return false;
        c.IsBlocked   = false;
        c.BlockReason = null;
        await _clients.UpdateAsync(c, ct);
        return true;
    }
}
