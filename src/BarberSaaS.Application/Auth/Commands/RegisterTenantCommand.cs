using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using FluentValidation;
using MediatR;

namespace BarberSaaS.Application.Auth.Commands;

public record RegisterTenantCommand(
    string BusinessName,
    string OwnerName,
    string Email,
    string Password,
    string Phone) : IRequest<RegisterTenantResult>;

public record RegisterTenantResult(Guid TenantId, string Slug, string AccessToken, string RefreshToken, UserDto User);

public class RegisterTenantValidator : AbstractValidator<RegisterTenantCommand>
{
    public RegisterTenantValidator()
    {
        RuleFor(x => x.BusinessName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.OwnerName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.Phone).NotEmpty();
    }
}

public class RegisterTenantHandler : IRequestHandler<RegisterTenantCommand, RegisterTenantResult>
{
    private readonly ITenantRepository _tenants;
    private readonly IUserRepository _users;
    private readonly IPlanRepository _plans;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtService _jwt;
    private readonly IRefreshTokenRepository _refreshTokens;

    public RegisterTenantHandler(
        ITenantRepository tenants, IUserRepository users, IPlanRepository plans,
        IPasswordHasher hasher, IJwtService jwt, IRefreshTokenRepository refreshTokens)
    {
        _tenants = tenants; _users = users; _plans = plans;
        _hasher = hasher; _jwt = jwt; _refreshTokens = refreshTokens;
    }

    public async Task<RegisterTenantResult> Handle(RegisterTenantCommand request, CancellationToken ct)
    {
        var slug = GenerateSlug(request.BusinessName);
        var slugExists = await _tenants.SlugExistsAsync(slug, ct);
        if (slugExists) slug = $"{slug}-{Guid.NewGuid().ToString()[..4]}";

        var emailExists = await _users.EmailExistsAsync(request.Email, ct);
        if (emailExists) throw new InvalidOperationException("Este e-mail já está cadastrado.");

        var freePlan = await _plans.GetBySlugAsync("gratuito", ct)
            ?? throw new InvalidOperationException("Plano gratuito não encontrado.");

        var tenant = new Tenant { Name = request.BusinessName, Slug = slug };
        var settings = new TenantSettings
        {
            TenantId     = tenant.Id,
            BusinessName = request.BusinessName,
            Phone        = request.Phone,
            PublicSlug   = slug
        };
        tenant.Settings = settings;

        var trialEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14));
        var subscription = new Subscription
        {
            TenantId           = tenant.Id,
            PlanId             = freePlan.Id,
            Status             = SubscriptionStatus.Trial,
            CurrentPeriodStart = DateOnly.FromDateTime(DateTime.UtcNow),
            CurrentPeriodEnd   = trialEnd,
            TrialEndsAt        = trialEnd
        };
        tenant.Subscription = subscription;

        var owner = new User
        {
            TenantId     = tenant.Id,
            Name         = request.OwnerName,
            Email        = request.Email,
            PasswordHash = _hasher.Hash(request.Password),
            Role         = UserRole.Owner,
            IsActive     = true,
            EmailVerified = true
        };

        await _tenants.AddAsync(tenant, ct);
        await _users.AddAsync(owner, ct);

        var tokens = _jwt.GenerateTokens(owner.Id, owner.Email, owner.Name, "owner", tenant.Id);
        await _refreshTokens.AddAsync(new RefreshToken
        {
            UserId    = owner.Id,
            TenantId  = tenant.Id,
            TokenHash = LoginCommandHandler.HashToken(tokens.RefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        }, ct);

        return new RegisterTenantResult(tenant.Id, slug, tokens.AccessToken, tokens.RefreshToken,
            new UserDto(owner.Id, owner.Name, owner.Email, "owner", tenant.Id));
    }

    private static string GenerateSlug(string name) =>
        System.Text.RegularExpressions.Regex.Replace(
            name.ToLower().Normalize(System.Text.NormalizationForm.FormD),
            @"[^a-z0-9\s-]", "").Trim().Replace(" ", "-");
}
