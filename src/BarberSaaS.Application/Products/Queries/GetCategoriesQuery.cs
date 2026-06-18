using BarberSaaS.Application.Common.Interfaces;
using MediatR;

namespace BarberSaaS.Application.Products.Queries;

public record GetCategoriesQuery : IRequest<IReadOnlyList<CategoryDto>>;

public record CategoryDto(Guid Id, string Name);

public class GetCategoriesHandler : IRequestHandler<GetCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    private readonly IProductCategoryRepository _categories;

    public GetCategoriesHandler(IProductCategoryRepository categories) => _categories = categories;

    public async Task<IReadOnlyList<CategoryDto>> Handle(GetCategoriesQuery request, CancellationToken ct)
    {
        var cats = await _categories.FindAsync(c => c.IsActive, ct);
        return cats.OrderBy(c => c.Name).Select(c => new CategoryDto(c.Id, c.Name)).ToList();
    }
}
