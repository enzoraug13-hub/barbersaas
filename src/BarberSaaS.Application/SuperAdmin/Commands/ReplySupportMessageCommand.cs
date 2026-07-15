using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Support;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BarberSaaS.Application.SuperAdmin.Commands;

/// <summary>
/// Resposta do super admin na conversa de uma barbearia. O TenantId é setado
/// EXPLICITAMENTE para o tenant alvo — o carimbo automático do SaveChanges usaria
/// o tenant do próprio super admin (o do JWT dele), que não é o da conversa.
/// </summary>
public record ReplySupportMessageCommand(Guid TenantId, string Body) : IRequest<SupportMessageDto>;

public class ReplySupportMessageValidator : AbstractValidator<ReplySupportMessageCommand>
{
    public ReplySupportMessageValidator()
    {
        RuleFor(x => x.TenantId).NotEmpty().WithMessage("Informe a barbearia.");
        RuleFor(x => x.Body).NotEmpty().WithMessage("Escreva a mensagem.").MaximumLength(2000);
    }
}

public class ReplySupportMessageHandler : IRequestHandler<ReplySupportMessageCommand, SupportMessageDto>
{
    private readonly ISupportMessageRepository _messages;
    private readonly ISuperAdminRepository _superAdmin;
    private readonly ILogger<ReplySupportMessageHandler> _logger;

    public ReplySupportMessageHandler(ISupportMessageRepository messages,
        ISuperAdminRepository superAdmin, ILogger<ReplySupportMessageHandler> logger)
    {
        _messages = messages; _superAdmin = superAdmin; _logger = logger;
    }

    public async Task<SupportMessageDto> Handle(ReplySupportMessageCommand request, CancellationToken ct)
    {
        var tenant = await _superAdmin.GetTenantAsync(request.TenantId, ct)
            ?? throw new Domain.Exceptions.DomainException("Barbearia não encontrada.");

        var message = new SupportMessage
        {
            TenantId = tenant.Id,
            Author = SupportMessageAuthor.SuperAdmin,
            Body = request.Body.Trim()
        };
        await _messages.AddAsync(message, ct);

        _logger.LogInformation("SUPER ADMIN: resposta de suporte {MessageId} para {TenantName}",
            message.Id, tenant.Name);

        return new SupportMessageDto(message.Id, SupportMessageDto.AuthorName(message.Author),
            message.Body, message.CreatedAt, message.ReadAt);
    }
}
