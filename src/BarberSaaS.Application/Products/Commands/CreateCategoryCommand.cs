using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Products.Queries;
using BarberSaaS.Domain.Entities;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Products.Commands;

public record CreateCategoryCommand(string Name) : IRequest<CategoryDto>;

public class CreateCategoryValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryValidator() => RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
}

public class CreateCategoryHandler : IRequestHandler<CreateCategoryCommand, CategoryDto>
{
    private readonly IProductCategoryRepository _categories;

    public CreateCategoryHandler(IProductCategoryRepository categories) => _categories = categories;

    public async Task<CategoryDto> Handle(CreateCategoryCommand request, CancellationToken ct)
    {
        var category = new ProductCategory { Name = request.Name };
        await _categories.AddAsync(category, ct);
        return new CategoryDto(category.Id, category.Name);
    }
}
