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
using BarberSaaS.Infrastructure.Reservations;
using Hangfire;
using Hangfire.PostgreSql;
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
        // EF Core — detecta SQLite (dev), PostgreSQL (Railway) ou SQL Server (Azure).
        // Aceita DATABASE_URL em formato URI (Railway) — ver ConnectionStringResolver.
        var connStr  = ConnectionStringResolver.Resolve(config);
        var provider = ConnectionStringResolver.Detect(connStr);

        // Npgsql 6+ exige DateTime com Kind=Utc para 'timestamp with time zone'. O app trata
        // datas como naïve (mesma semântica do datetime2 do SQL Server e do SQLite), então
        // usamos o comportamento legado: DateTime -> 'timestamp without time zone', sem
        // exigência de Kind. Precisa ser setado antes de qualquer uso do Npgsql.
        if (provider == DatabaseProvider.PostgreSql)
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        services.AddDbContext<AppDbContext>(opt =>
        {
            switch (provider)
            {
                case DatabaseProvider.Sqlite:
                    opt.UseSqlite(connStr, sq => sq.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
                    break;
                case DatabaseProvider.PostgreSql:
                    opt.UseNpgsql(connStr, sq => sq.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
                    break;
                default:
                    opt.UseSqlServer(connStr, sq => sq.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
                    break;
            }
        });

        // Repositories
        services.AddScoped<IUserRepository,        UserRepository>();
        services.AddScoped<ITenantRepository,      TenantRepository>();
        services.AddScoped<IBarberRepository,      BarberRepository>();
        services.AddScoped<IClientRepository,      ClientRepository>();
        services.AddScoped<IServiceRepository,     ServiceRepository>();
        services.AddScoped<IBarberServiceRepository, BarberServiceRepository>();
        services.AddScoped<IFinancialRepository,   FinancialRepository>();
        services.AddScoped<IGoalRepository,        GoalRepository>();
        services.AddScoped<IProductRepository,     ProductRepository>();
        services.AddScoped<IProductCategoryRepository, ProductCategoryRepository>();
        services.AddScoped<IStockMovementRepository,   StockMovementRepository>();
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
        services.AddSingleton<IAuthOptions, BarberSaaS.Infrastructure.ExternalServices.AuthOptions>();
        services.AddScoped<ICnpjLookupService, BarberSaaS.Infrastructure.ExternalServices.BrasilApiCnpjService>();

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
            services.AddSingleton<ISlotReservationService, RedisSlotReservationService>();
            services.AddSingleton<IOtpChallengeService, RedisOtpChallengeService>();
        }
        else
        {
            services.AddScoped<ICacheService, NoOpCacheService>();
            // Dev sem Redis configurado: fallback em memória só pra reservas (ver
            // comentário em InMemorySlotReservationService.cs). Configure
            // ConnectionStrings:Redis em appsettings.Development.json se quiser
            // testar com Redis de verdade (docker run -p 6379:6379 redis, depois
            // "Redis": "localhost:6379").
            services.AddSingleton<ISlotReservationService, InMemorySlotReservationService>();
            services.AddSingleton<IOtpChallengeService, InMemoryOtpChallengeService>();
        }

        // Hangfire — InMemory em dev (SQLite), PostgreSql no Railway, SqlServer no Azure
        services.AddHangfire(cfg =>
        {
            cfg.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
               .UseSimpleAssemblyNameTypeSerializer()
               .UseRecommendedSerializerSettings();
            switch (provider)
            {
                case DatabaseProvider.Sqlite:
                    cfg.UseInMemoryStorage();
                    break;
                case DatabaseProvider.PostgreSql:
                    cfg.UsePostgreSqlStorage(o => o.UseNpgsqlConnection(connStr));
                    break;
                default:
                    cfg.UseSqlServerStorage(connStr, new SqlServerStorageOptions
                    {
                        CommandBatchMaxTimeout     = TimeSpan.FromMinutes(5),
                        SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                        QueuePollInterval          = TimeSpan.Zero,
                        UseRecommendedIsolationLevel = true,
                        DisableGlobalLocks         = true
                    });
                    break;
            }
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
