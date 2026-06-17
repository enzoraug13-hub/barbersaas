using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Services.Commands;

public record CreateServiceCommand(
    Guid TenantId,
    string Name,
    string? Description,
    int DurationMinutes,
    decimal Price,
    string? ColorHex,
    bool ShowInPublicPage = true) : IRequest<ServiceDto>;

public record ServiceDto(Guid Id, string Name, string? Description, int DurationMinutes, decimal Price, string? ColorHex, bool IsActive, bool ShowInPublicPage, int DisplayOrder);

public class CreateServiceValidator : AbstractValidator<CreateServiceCommand>
{
    public CreateServiceValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DurationMinutes).GreaterThan(0).LessThanOrEqualTo(480);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
    }
}

public class CreateServiceHandler : IRequestHandler<CreateServiceCommand, ServiceDto>
{
    private readonly IServiceRepository _services;

    public CreateServiceHandler(IServiceRepository services) => _services = services;

    public async Task<ServiceDto> Handle(CreateServiceCommand request, CancellationToken ct)
    {
        var service = new Service
        {
            TenantId        = request.TenantId,
            Name            = request.Name,
            Description     = request.Description,
            DurationMinutes = request.DurationMinutes,
            Price           = request.Price,
            ColorHex        = request.ColorHex,
            ShowInPublicPage = request.ShowInPublicPage
        };
        await _services.AddAsync(service, ct);
        return new ServiceDto(service.Id, service.Name, service.Description, service.DurationMinutes, service.Price, service.ColorHex, service.IsActive, service.ShowInPublicPage, service.DisplayOrder);
    }
}
