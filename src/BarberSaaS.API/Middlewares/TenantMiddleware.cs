using BarberSaaS.Application.Common.Interfaces;

namespace BarberSaaS.API.Middlewares;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ICurrentTenant currentTenant)
    {
        // O tenant é SEMPRE derivado do JWT do usuário autenticado.
        // O antigo header "X-Tenant-Id" foi removido por ser um vetor de spoofing:
        // qualquer cliente poderia se passar por outro tenant e ler/alterar dados alheios.
        // Fluxos públicos (PublicController) resolvem o tenant pelo slug e não dependem deste middleware.
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var tenantClaim = context.User.FindFirst("tenant_id")?.Value;
            // Guid.Empty parseia com sucesso, mas "tenant zerado" NÃO é um tenant:
            // setá-lo desligaria o filtro global do EF do mesmo jeito que não setar.
            if (!string.IsNullOrEmpty(tenantClaim)
                && Guid.TryParse(tenantClaim, out var tenantIdFromClaim)
                && tenantIdFromClaim != Guid.Empty)
                currentTenant.SetTenant(tenantIdFromClaim);

            // Fail-closed: roles de barbearia SEM tenant no token rodariam com o
            // filtro global DESLIGADO (CurrentTenantId vazio = vê tudo). Isso só é
            // legítimo pro super admin (endpoints próprios, cross-tenant deliberado)
            // e pro client (portal do cliente resolve por slug/telefone). Qualquer
            // owner/admin/barber sem tenant é um token malformado — barra aqui.
            var role = context.User.FindFirst("role")?.Value;
            if (currentTenant.Id == Guid.Empty
                && role is "owner" or "admin" or "barber")
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { success = false, errors = new[] { "Sessão inválida. Entre novamente." } });
                return;
            }
        }

        await _next(context);
    }
}

public class CurrentTenant : ICurrentTenant
{
    public Guid    Id   { get; private set; } = Guid.Empty;
    public string? Slug { get; private set; }

    public void SetTenant(Guid tenantId, string? slug = null)
    {
        Id   = tenantId;
        Slug = slug;
    }
}

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _http;

    public CurrentUser(IHttpContextAccessor http) => _http = http;

    private System.Security.Claims.ClaimsPrincipal? User => _http.HttpContext?.User;

    public Guid    Id              => Guid.TryParse(User?.FindFirst("sub")?.Value, out var id) ? id : Guid.Empty;
    public string  Name            => User?.FindFirst("name")?.Value ?? "";
    public string  Email           => User?.FindFirst("email")?.Value ?? "";
    public string  Role            => User?.FindFirst("role")?.Value ?? "";
    public Guid?   TenantId        => Guid.TryParse(User?.FindFirst("tenant_id")?.Value, out var tid) ? tid : null;
    public string? IpAddress       => _http.HttpContext?.Connection.RemoteIpAddress?.ToString();
    public bool    IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;
    public string? Phone           => User?.FindFirst("phone")?.Value;
}
