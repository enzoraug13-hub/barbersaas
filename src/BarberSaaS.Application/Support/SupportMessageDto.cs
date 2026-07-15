using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Application.Support;

/// <summary>
/// Mensagem da conversa como o frontend enxerga — mesma forma nos dois lados
/// (dono e super admin); quem muda é o filtro de quem pode ver. Author viaja
/// como string ("owner"/"superadmin") pra ficar auto-descritivo no JSON.
/// </summary>
public record SupportMessageDto(
    Guid Id,
    string Author,
    string Body,
    DateTime CreatedAt,
    DateTime? ReadAt)
{
    public static string AuthorName(SupportMessageAuthor author) =>
        author == SupportMessageAuthor.Owner ? "owner" : "superadmin";

    public static SupportMessageDto FromRow(SupportMessageRow row) =>
        new(row.Id, AuthorName(row.Author), row.Body, row.CreatedAt, row.ReadAt);
}
