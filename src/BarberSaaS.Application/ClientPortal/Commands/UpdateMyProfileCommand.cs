using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Exceptions;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.ClientPortal.Commands;

public record UpdateMyProfileCommand(string? Name, string? Cpf, string? Email) : IRequest<bool>;

public class UpdateMyProfileValidator : AbstractValidator<UpdateMyProfileCommand>
{
    public UpdateMyProfileValidator()
    {
        RuleFor(x => x.Cpf!).Must(IsValidCpf).WithMessage("CPF inválido.")
            .When(x => !string.IsNullOrWhiteSpace(x.Cpf));
    }

    // Confere os dígitos verificadores — não só o formato de 11 dígitos.
    public static bool IsValidCpf(string? cpf)
    {
        if (string.IsNullOrWhiteSpace(cpf)) return false;
        var digits = new string(cpf.Where(char.IsDigit).ToArray());
        if (digits.Length != 11) return false;
        if (digits.Distinct().Count() == 1) return false;

        int CalcDigit(int length)
        {
            var sum = 0;
            for (var i = 0; i < length; i++) sum += (digits[i] - '0') * (length + 1 - i);
            var rest = sum * 10 % 11;
            return rest == 10 ? 0 : rest;
        }

        return CalcDigit(9) == digits[9] - '0' && CalcDigit(10) == digits[10] - '0';
    }
}

public class UpdateMyProfileHandler : IRequestHandler<UpdateMyProfileCommand, bool>
{
    private readonly IClientRepository _clients;
    private readonly ICurrentUser _user;

    public UpdateMyProfileHandler(IClientRepository clients, ICurrentUser user)
    {
        _clients = clients; _user = user;
    }

    public async Task<bool> Handle(UpdateMyProfileCommand request, CancellationToken ct)
    {
        var c = await _clients.GetByIdAsync(_user.Id, ct);

        if (c is null)
        {
            // Cliente ainda não existe no banco (telefone validado por OTP, mas
            // sem cadastro) — só nasce aqui, e só com nome preenchido. Sem nome,
            // não cria nada (regra: nunca existe Client sem nome).
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new DomainException("Informe seu nome para concluir o cadastro.");
            if (_user.TenantId is not { } tenantId)
                throw new UnauthorizedAccessException("Sessão inválida.");

            c = new Client { PhoneNumber = _user.Phone ?? "", Name = request.Name.Trim() };
            c.TenantId = tenantId;
            // Mesmo Id determinístico já usado como "sub" do JWT desde o OTP —
            // ver DeterministicGuid/VerifyClientOtpCommand.
            c.AssignDeterministicId(_user.Id);
            if (!string.IsNullOrWhiteSpace(request.Cpf)) c.Cpf = new string(request.Cpf.Where(char.IsDigit).ToArray());
            if (request.Email != null) c.Email = request.Email;
            await _clients.AddAsync(c, ct);
            return true;
        }

        if (!string.IsNullOrWhiteSpace(request.Name)) c.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Cpf)) c.Cpf = new string(request.Cpf.Where(char.IsDigit).ToArray());
        if (request.Email != null) c.Email = request.Email;
        await _clients.UpdateAsync(c, ct);
        return true;
    }
}
