using BarberSaaS.Application.Barbers.Commands;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Dashboard.Queries;
using BarberSaaS.Domain.Interfaces.Services;
using BarberSaaS.Infrastructure.BackgroundJobs;
using BarberSaaS.Infrastructure.Cache;
using BarberSaaS.Infrastructure.Domain;
using BarberSaaS.Infrastructure.ExternalServices.Email;
using BarberSaaS.Infrastructure.ExternalServices.GoogleCalendar;
using BarberSaaS.Infrastructure.Identity;
using BarberSaaS.Infrastructure.Persistence;
using BarberSaaS.Infrastructure.Persistence.Repositories;
using Hangfire;
using Hangfire.SqlServer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace BarberSaaS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // EF Core — detecta SQLite (dev) ou SQL Server (prod)
        var connStr = config.GetConnectionString("Default")!;
        var isSqlite = connStr.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase);
        services.AddDbContext<AppDbContext>(opt =>
        {
            if (isSqlite)
                opt.UseSqlite(connStr, sq => sq.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
            else
                opt.UseSqlServer(connStr, sq => sq.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
        });

        // Repositories
        services.AddScoped<IUserRepository,        UserRepository>();
        services.AddScoped<ITenantRepository,      TenantRepository>();
        services.AddScoped<IBarberRepository,      BarberRepository>();
        services.AddScoped<IClientRepository,      ClientRepository>();
        services.AddScoped<IServiceRepository,     ServiceRepository>();
        services.AddScoped<IFinancialRepository,   FinancialRepository>();
        services.AddScoped<IGoalRepository,        GoalRepository>();
        services.AddScoped<IProductRepository,     ProductRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IPlanRepository,        PlanRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<WorkScheduleRepository>();
        services.AddScoped<IWorkScheduleRepository>(sp => sp.GetRequiredService<WorkScheduleRepository>());
        services.AddScoped<IWorkScheduleWriteRepository>(sp => sp.GetRequiredService<WorkScheduleRepository>());

        services.AddScoped<AppointmentRepository>();
        services.AddScoped<IAppointmentRepositoryFull>(sp => sp.GetRequiredService<AppointmentRepository>());
        services.AddScoped<IAppointmentRepositoryApp>(sp  => sp.GetRequiredService<AppointmentRepository>());

        services.AddScoped<IDashboardRepository, DashboardRepository>();

        // Identity
        services.AddScoped<IJwtService,      JwtService>();
        services.AddScoped<IPasswordHasher,  PasswordHasher>();

        // Domain Services
        services.AddScoped<ISlotGeneratorService, SlotGeneratorService>();

        // External Services
        services.AddScoped<IGoogleCalendarService, GoogleCalendarService>();
        services.AddScoped<IEmailService,          EmailService>();

        // SMS (login do cliente por OTP): Twilio se configurado, senão stub de log (dev).
        services.AddHttpClient();
        if (!string.IsNullOrEmpty(config["Sms:Twilio:AccountSid"]))
            services.AddScoped<ISmsService, BarberSaaS.Infrastructure.ExternalServices.Sms.TwilioSmsService>();
        else
            services.AddScoped<ISmsService, BarberSaaS.Infrastructure.ExternalServices.Sms.LogSmsService>();

        // Notifications
        services.AddScoped<INotificationDispatcher, NotificationDispatcher>();
        services.AddScoped<NotificationProcessor>();
        services.AddScoped<ReminderJob>();

        // Redis
        var redisConn = config.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConn))
        {
            services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConn));
            services.AddScoped<ICacheService, RedisCacheService>();
        }
        else
        {
            services.AddScoped<ICacheService, NoOpCacheService>();
        }

        // Hangfire — usa InMemory em dev (SQLite) ou SQL Server em prod
        services.AddHangfire(cfg =>
        {
            cfg.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
               .UseSimpleAssemblyNameTypeSerializer()
               .UseRecommendedSerializerSettings();
            if (isSqlite)
                cfg.UseInMemoryStorage();
            else
                cfg.UseSqlServerStorage(connStr, new SqlServerStorageOptions
                {
                    CommandBatchMaxTimeout     = TimeSpan.FromMinutes(5),
                    SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                    QueuePollInterval          = TimeSpan.Zero,
                    UseRecommendedIsolationLevel = true,
                    DisableGlobalLocks         = true
                });
        });
        services.AddHangfireServer();

        return services;
    }
}

// Fallback quando Redis não está configurado
public class NoOpCacheService : ICacheService
{
    public Task<T?> GetAsync<T>(string key) where T : class => Task.FromResult<T?>(null);
    public Task SetAsync<T>(string key, T value, TimeSpan expiry) where T : class => Task.CompletedTask;
    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiry) where T : class => await factory();
    public Task RemoveAsync(string key) => Task.CompletedTask;
    public Task RemoveByPatternAsync(string pattern) => Task.CompletedTask;
}
