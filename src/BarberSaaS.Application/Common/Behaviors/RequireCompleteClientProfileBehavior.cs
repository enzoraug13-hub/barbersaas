using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Exceptions;
using MediatR;

namespace BarberSaaS.Application.Common.Behaviors;

/// <summary>
/// Marca um Command/Query de cliente que só pode ser executado por quem já
/// completou o cadastro (Name + Cpf). Não usar em GET/PUT do próprio perfil
/// (GetMyProfileQuery / UpdateMyProfileCommand) — o cliente precisa poder
/// ler e completar o cadastro mesmo estando incompleto.
///
/// Hoje (2026) nenhum Command/Query implementa isto: toda criação de
/// agendamento passa pelo endpoint público anônimo (POST /public/{slug}/appointments),
/// não pela área autenticada do cliente. Fica pronto para a primeira ação
/// autenticada de cliente (ex.: o cliente logado cancelar/criar algo direto
/// pela própria conta) sem precisar reimplementar a checagem em cada handler.
/// </summary>
public interface IRequireCompleteClientProfile { }

public class RequireCompleteClientProfileBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ICurrentUser _user;
    private readonly IClientRepository _clients;

    public RequireCompleteClientProfileBehavior(ICurrentUser user, IClientRepository clients)
    {
        _user = user; _clients = clients;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (request is not IRequireCompleteClientProfile || _user.Role != "client")
            return await next();

        var client = await _clients.GetByIdAsync(_user.Id, ct);
        var complete = client is not null
            && !string.IsNullOrWhiteSpace(client.Name)
            && !string.IsNullOrWhiteSpace(client.Cpf);

        if (!complete)
            throw new ClientProfileIncompleteException();

        return await next();
    }
}
