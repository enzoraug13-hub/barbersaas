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
            if (!string.IsNullOrEmpty(tenantClaim) && Guid.TryParse(tenantClaim, out var tenantIdFromClaim))
                currentTenant.SetTenant(tenantIdFromClaim);
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
}
