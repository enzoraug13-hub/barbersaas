using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Support.Commands;

/// <summary>
/// Dono envia uma mensagem ao Trimly ("queria que adicionasse tal coisa").
/// O TenantId da mensagem é carimbado pelo SaveChanges com o tenant do JWT —
/// nada vem do request além do texto.
/// </summary>
public record SendSupportMessageCommand(string Body) : IRequest<SupportMessageDto>;

public class SendSupportMessageValidator : AbstractValidator<SendSupportMessageCommand>
{
    public SendSupportMessageValidator()
    {
        RuleFor(x => x.Body).NotEmpty().WithMessage("Escreva a mensagem.").MaximumLength(2000);
    }
}

public class SendSupportMessageHandler : IRequestHandler<SendSupportMessageCommand, SupportMessageDto>
{
    private readonly ISupportMessageRepository _messages;

    public SendSupportMessageHandler(ISupportMessageRepository messages) => _messages = messages;

    public async Task<SupportMessageDto> Handle(SendSupportMessageCommand request, CancellationToken ct)
    {
        var message = new SupportMessage
        {
            Author = SupportMessageAuthor.Owner,
            Body = request.Body.Trim()
        };
        await _messages.AddAsync(message, ct);

        return new SupportMessageDto(message.Id, SupportMessageDto.AuthorName(message.Author),
            message.Body, message.CreatedAt, message.ReadAt);
    }
}
