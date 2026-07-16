using BarberSaaS.Application.Common.DTOs;
using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Application.Settings.Queries;
using BarberSaaS.Domain.Entities;
using BarberSaaS.Domain.Enums;
using BarberSaaS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BarberSaaS.API.Controllers.v1;

// Endpoint isolado pra gerar/limpar um tenant fictício, rico em dados, só pra
// gravar vídeo/print de apresentação — sem tocar em nenhum tenant real.
// Nunca roda em produção (404 oculto) e exige uma chave compartilhada
// (DemoSeed:Key, fora do JWT normal) porque não passa por [Authorize]: sem
// token, o filtro multi-tenant do AppDbContext fica desligado de propósito
// (CurrentTenantId == Guid.Empty), o que é exatamente o que essa ferramenta
// precisa pra ler/escrever um tenant arbitrário por fora do fluxo normal.
[ApiController]
[Route("api/v1/admin/demo-seed")]
public class DemoSeedController : ControllerBase
{
    private const string DemoSlug = "demo-apresentacao";
    private const string OwnerEmail = "apresentacao@barbersaas.com";
    private const string OwnerPassword = "Apresenta@2026!";

    private readonly AppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    public DemoSeedController(AppDbContext db, IPasswordHasher hasher, IWebHostEnvironment env, IConfiguration config)
    {
        _db = db; _hasher = hasher; _env = env; _config = config;
    }

    private IActionResult? CheckAccess()
    {
        if (_env.IsProduction()) return NotFound();

        var expectedKey = _config["DemoSeed:Key"];
        if (string.IsNullOrWhiteSpace(expectedKey))
            return StatusCode(500, ApiResponse<object>.Fail("DemoSeed:Key não configurada (appsettings.Development.json)."));

        var providedKey = Request.Headers["X-Demo-Seed-Key"].ToString();
        if (providedKey != expectedKey) return Unauthorized(ApiResponse<object>.Fail("Chave inválida."));

        return null;
    }

    [HttpPost("seed")]
    public async Task<IActionResult> Seed(CancellationToken ct)
    {
        var access = CheckAccess();
        if (access != null) return access;

        var already = await _db.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Slug == DemoSlug, ct);
        if (already)
            return Conflict(ApiResponse<object>.Fail(
                "Já existe um tenant de demo. Limpe antes (DELETE /api/v1/admin/demo-seed/seed) antes de gerar de novo."));

        var plan = await _db.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Slug == "profissional", ct);

        var rng = new Random(20260623);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // --- Tenant + Settings ---------------------------------------------------
        var tenant = new Tenant { Name = "Barbearia Império", Slug = DemoSlug, IsActive = true };

        var businessHours = Enumerable.Range(0, 7)
            .Select(d => new BusinessHourDto(d, d != 0, "09:00", "19:00"))
            .ToList();

        var settings = new TenantSettings
        {
            TenantId = tenant.Id,
            BusinessName = "Barbearia Império",
            Description = "Tradição e estilo desde sempre. Cortes, barba e cuidados premium.",
            Address = "Av. Paulista, 1500 - Bela Vista",
            City = "São Paulo",
            State = "SP",
            ZipCode = "01310-100",
            Phone = "+5511988887777",
            InstagramUrl = "https://instagram.com/barbeariaimperio",
            WhatsAppNumber = "+5511988887777",
            PrimaryColor = "#1a1410",
            SecondaryColor = "#d4af37",
            AccentColor = "#ffffff",
            AllowOnlineBooking = true,
            PublicSlug = DemoSlug,
            BusinessHoursJson = JsonSerializer.Serialize(businessHours)
        };
        tenant.Settings = settings;

        if (plan != null)
        {
            tenant.Subscription = new Subscription
            {
                TenantId = tenant.Id,
                PlanId = plan.Id,
                Status = SubscriptionStatus.Active,
                CurrentPeriodStart = today.AddDays(-15),
                CurrentPeriodEnd = today.AddDays(15),
            };
        }

        var owner = new User
        {
            TenantId = tenant.Id,
            Name = "Ricardo Almeida (Dono)",
            Email = OwnerEmail,
            PasswordHash = _hasher.Hash(OwnerPassword),
            Role = UserRole.Owner,
            IsActive = true,
            EmailVerified = true
        };

        _db.Tenants.Add(tenant);
        _db.Users.Add(owner);
        await _db.SaveChangesAsync(ct);

        // --- Barbeiros -------------------------------------------------------------
        var barberNames = new[] { "Carlos Mendes", "Felipe Souza", "Bruno Lima", "André Costa", "Diego Ferreira" };
        var barbers = new List<Barber>();
        foreach (var name in barberNames)
        {
            var barberUser = new User
            {
                TenantId = tenant.Id,
                Name = name,
                Email = $"{Slugify(name)}@barbeariaimperio.com",
                PasswordHash = _hasher.Hash(Guid.NewGuid().ToString("N")),
                Role = UserRole.Barber,
                IsActive = true,
                EmailVerified = true
            };
            _db.Users.Add(barberUser);
            await _db.SaveChangesAsync(ct);

            var barber = new Barber
            {
                TenantId = tenant.Id,
                UserId = barberUser.Id,
                Name = name,
                Bio = "Especialista em cortes modernos e clássicos.",
                CommissionType = CommissionType.Percentage,
                CommissionValue = 40,
                IsActive = true,
                ShowInPublicPage = true,
                DisplayOrder = barbers.Count
            };
            barbers.Add(barber);
        }
        _db.Barbers.AddRange(barbers);
        await _db.SaveChangesAsync(ct);

        // Expediente seg-sáb 09:00-19:00 pra "Performance por Cadeira" calcular ocupação.
        foreach (var barber in barbers)
        {
            var schedule = new WorkSchedule { TenantId = tenant.Id, BarberId = barber.Id, IsActive = true };
            _db.WorkSchedules.Add(schedule);
            await _db.SaveChangesAsync(ct);

            var shifts = Enumerable.Range(1, 6) // Monday..Saturday
                .Select(d => new WorkShift
                {
                    TenantId = tenant.Id,
                    WorkScheduleId = schedule.Id,
                    DayOfWeek = (DayOfWeek)d,
                    StartTime = new TimeOnly(9, 0),
                    EndTime = new TimeOnly(19, 0),
                    IsActive = true
                });
            _db.WorkShifts.AddRange(shifts);
        }
        await _db.SaveChangesAsync(ct);

        // --- Serviços ----------------------------------------------------------------
        var serviceDefs = new (string Name, int Duration, decimal Price, string Color)[]
        {
            ("Corte Clássico",        30, 45m,  "#d4af37"),
            ("Corte + Barba",         50, 75m,  "#b8860b"),
            ("Barba Completa",        25, 40m,  "#8b6914"),
            ("Combo Império",         70, 110m, "#1a1410"),
            ("Sobrancelha",           15, 25m,  "#a0522d"),
            ("Pezinho",               15, 20m,  "#cd853f"),
            ("Hidratação Capilar",    40, 60m,  "#deb887"),
            ("Coloração",             60, 90m,  "#704214"),
        };
        var services = serviceDefs.Select((s, i) => new Service
        {
            TenantId = tenant.Id,
            Name = s.Name,
            DurationMinutes = s.Duration,
            Price = s.Price,
            ColorHex = s.Color,
            IsActive = true,
            ShowInPublicPage = true,
            DisplayOrder = i
        }).ToList();
        _db.Services.AddRange(services);
        await _db.SaveChangesAsync(ct);

        // Todo barbeiro atende todos os serviços (simplifica geração dos agendamentos).
        foreach (var barber in barbers)
            foreach (var service in services)
                _db.BarberServices.Add(new BarberService { TenantId = tenant.Id, BarberId = barber.Id, ServiceId = service.Id });
        await _db.SaveChangesAsync(ct);

        // --- Produtos ------------------------------------------------------------------
        var category = new ProductCategory { TenantId = tenant.Id, Name = "Cuidados Masculinos", IsActive = true };
        _db.ProductCategories.Add(category);
        await _db.SaveChangesAsync(ct);

        var productDefs = new (string Name, decimal Sale, decimal Cost, int Stock)[]
        {
            ("Pomada Modeladora Matte",  45m, 20m, 32),
            ("Óleo para Barba Premium",  38m, 16m, 24),
            ("Shampoo Anticaspa 300ml",  29m, 12m, 40),
            ("Balm Hidratante de Barba", 42m, 18m, 18),
            ("Navalha Profissional",     65m, 30m, 10),
            ("Kit Barba Completo",       119m, 55m, 12),
        };
        _db.Products.AddRange(productDefs.Select(p => new Product
        {
            TenantId = tenant.Id,
            CategoryId = category.Id,
            Name = p.Name,
            SalePrice = p.Sale,
            CostPrice = p.Cost,
            StockQuantity = p.Stock,
            IsActive = true
        }));
        await _db.SaveChangesAsync(ct);

        // --- Clientes --------------------------------------------------------------------
        var clientNames = new[]
        {
            "João Pedro Silva","Lucas Oliveira","Gabriel Santos","Matheus Souza","Rafael Costa",
            "Pedro Henrique Lima","Gustavo Ferreira","Thiago Almeida","Vinícius Rodrigues","Eduardo Carvalho",
            "Bruno Gonçalves","Daniel Barbosa","Marcelo Pereira","Felipe Araújo","André Ribeiro",
            "Fernando Martins","Rodrigo Nascimento","Leonardo Dias","Alexandre Cardoso","Diego Teixeira",
            "Caio Moreira","Igor Castro","Renato Pinto","Vitor Monteiro","Otávio Correia",
            "Henrique Gomes","Murilo Azevedo","Tiago Cavalcanti","Wesley Freitas","Júlio Rezende",
            "Marcos Vinícius Andrade","Carlos Eduardo Tavares","Paulo Roberto Nunes","Ricardo Fonseca","Anderson Macedo"
        };
        var clients = clientNames.Select((name, i) => new Client
        {
            TenantId = tenant.Id,
            Name = name,
            PhoneNumber = $"+551199{(90000000 + i * 137):D8}",
            Email = $"{Slugify(name)}@exemplo.com",
            // Client.LoyaltyPoints/WalletBalance/TotalVisits estão APOSENTADOS (fonte da
            // verdade: LoyaltyWallet + Appointments Completed — ver ILoyaltyRepository).
            // Semear valores aqui criaria dado que a UI nunca lê e divergiria da wallet.
        }).ToList();
        _db.Clients.AddRange(clients);
        await _db.SaveChangesAsync(ct);

        // --- Agendamentos + financeiro ---------------------------------------------
        var paymentMethods = new[] { PaymentMethod.Pix, PaymentMethod.Credit, PaymentMethod.Debit, PaymentMethod.Cash };
        var appointments = new List<Appointment>();
        var revenueTx = new List<FinancialTransaction>();

        for (var date = today.AddDays(-30); date <= today.AddDays(5); date = date.AddDays(1))
        {
            if (date.DayOfWeek == DayOfWeek.Sunday) continue; // fechado

            foreach (var barber in barbers)
            {
                var apptsToday = rng.Next(2, 5);
                var usedSlots = new HashSet<int>();

                for (var n = 0; n < apptsToday; n++)
                {
                    var slotIndex = rng.Next(0, 18); // 09:00..18:30 em passos de 30min
                    if (!usedSlots.Add(slotIndex)) continue;

                    var start = new TimeOnly(9, 0).AddMinutes(slotIndex * 30);
                    var service = services[rng.Next(services.Count)];
                    var end = start.AddMinutes(service.DurationMinutes);
                    if (end > new TimeOnly(19, 0)) continue;

                    var client = clients[rng.Next(clients.Count)];

                    AppointmentStatus status;
                    if (date < today) status = rng.NextDouble() switch { var p when p < 0.78 => AppointmentStatus.Completed, var p when p < 0.90 => AppointmentStatus.Cancelled, _ => AppointmentStatus.NoShow };
                    else if (date == today) status = start < TimeOnly.FromDateTime(DateTime.UtcNow) ? AppointmentStatus.Completed : AppointmentStatus.Confirmed;
                    else status = rng.NextDouble() < 0.7 ? AppointmentStatus.Confirmed : AppointmentStatus.Pending;

                    var appt = Appointment.Create(tenant.Id, barber.Id, client.Id, service.Id, date, start, end, service.Price);
                    appt.Status = status;
                    if (status == AppointmentStatus.Completed)
                    {
                        appt.IsPaid = true;
                        appt.PaidAt = date.ToDateTime(end);
                        appt.PaymentMethod = paymentMethods[rng.Next(paymentMethods.Length)];
                        appt.CompletedAt = date.ToDateTime(end);
                    }
                    appointments.Add(appt);
                }
            }
        }
        _db.Appointments.AddRange(appointments);
        await _db.SaveChangesAsync(ct);

        // Receita: uma transação por agendamento concluído.
        foreach (var appt in appointments.Where(a => a.Status == AppointmentStatus.Completed))
        {
            var tx = new FinancialTransaction
            {
                TenantId = tenant.Id,
                Type = TransactionType.Revenue,
                Category = TransactionCategory.Service,
                Description = "Receita de atendimento",
                Amount = appt.FinalPrice,
                PaidAmount = appt.FinalPrice,
                Status = TransactionStatus.Paid,
                AppointmentId = appt.Id,
                BarberId = appt.BarberId,
                CreatedByUserId = owner.Id,
                DueDate = appt.Date,
                TransactionDate = appt.Date,
                PaidAt = appt.PaidAt
            };
            revenueTx.Add(tx);
        }
        _db.FinancialTransactions.AddRange(revenueTx);
        await _db.SaveChangesAsync(ct);

        foreach (var tx in revenueTx)
        {
            _db.FinancialPayments.Add(new FinancialPayment
            {
                TenantId = tenant.Id,
                TransactionId = tx.Id,
                Amount = tx.Amount,
                PaymentMethod = paymentMethods[rng.Next(paymentMethods.Length)],
                PaidAt = tx.PaidAt ?? DateTime.UtcNow,
                RegisteredByUserId = owner.Id
            });
        }

        // Receita extra de venda de produtos (não vinculada a agendamento).
        for (var date = today.AddDays(-28); date <= today; date = date.AddDays(7))
        {
            _db.FinancialTransactions.Add(new FinancialTransaction
            {
                TenantId = tenant.Id,
                Type = TransactionType.Revenue,
                Category = TransactionCategory.Product,
                Description = "Venda de produtos no balcão",
                Amount = rng.Next(120, 420),
                PaidAmount = rng.Next(120, 420),
                Status = TransactionStatus.Paid,
                CreatedByUserId = owner.Id,
                DueDate = date,
                TransactionDate = date,
                PaidAt = date.ToDateTime(new TimeOnly(18, 0))
            });
        }

        // Despesas: aluguel e energia mensais, marketing e manutenção pontuais.
        var rentDate = today.AddDays(-(today.Day - 1)); // dia 1 do mês corrente
        var expenseDefs = new (TransactionCategory Cat, string Desc, decimal Amount, DateOnly Date)[]
        {
            (TransactionCategory.Rent,        "Aluguel do salão",            3200m, rentDate),
            (TransactionCategory.Energy,      "Conta de energia",            480m,  rentDate.AddDays(5)),
            (TransactionCategory.Marketing,   "Anúncios redes sociais",      350m,  today.AddDays(-10)),
            (TransactionCategory.Equipment,   "Compra de máquinas de corte", 890m,  today.AddDays(-20)),
            (TransactionCategory.Maintenance, "Manutenção do ar-condicionado", 220m, today.AddDays(-15)),
        };
        foreach (var e in expenseDefs)
        {
            _db.FinancialTransactions.Add(new FinancialTransaction
            {
                TenantId = tenant.Id,
                Type = TransactionType.Expense,
                Category = e.Cat,
                Description = e.Desc,
                Amount = e.Amount,
                PaidAmount = e.Amount,
                Status = TransactionStatus.Paid,
                CreatedByUserId = owner.Id,
                DueDate = e.Date,
                TransactionDate = e.Date,
                PaidAt = e.Date.ToDateTime(new TimeOnly(10, 0))
            });
        }

        // Comissão por barbeiro (despesa), proporcional à receita gerada.
        foreach (var barber in barbers)
        {
            var barberRevenue = revenueTx.Where(t => t.BarberId == barber.Id).Sum(t => t.Amount);
            if (barberRevenue <= 0) continue;
            _db.FinancialTransactions.Add(new FinancialTransaction
            {
                TenantId = tenant.Id,
                Type = TransactionType.Expense,
                Category = TransactionCategory.Commission,
                Description = $"Comissão - {barber.Name}",
                Amount = Math.Round(barberRevenue * 0.4m, 2),
                PaidAmount = Math.Round(barberRevenue * 0.4m, 2),
                Status = TransactionStatus.Paid,
                BarberId = barber.Id,
                CreatedByUserId = owner.Id,
                DueDate = today,
                TransactionDate = today,
                PaidAt = today.ToDateTime(new TimeOnly(19, 0))
            });
        }

        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(new
        {
            slug = DemoSlug,
            publicUrl = $"/{DemoSlug}",
            login = new { email = OwnerEmail, password = OwnerPassword },
            counts = new
            {
                barbers = barbers.Count,
                services = services.Count,
                products = productDefs.Length,
                clients = clients.Count,
                appointments = appointments.Count,
                completedAppointments = appointments.Count(a => a.Status == AppointmentStatus.Completed)
            }
        }, "Tenant de demo criado com sucesso."));
    }

    [HttpDelete("seed")]
    public async Task<IActionResult> Cleanup(CancellationToken ct)
    {
        var access = CheckAccess();
        if (access != null) return access;

        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Slug == DemoSlug, ct);
        if (tenant is null)
            return Ok(ApiResponse<object>.Ok(new { removed = false }, "Não existe tenant de demo para limpar."));

        var tenantId = tenant.Id;

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        await _db.FinancialPayments.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.FinancialTransactions.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.ProductSaleItems.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.ProductSales.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.StockMovements.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.Products.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.ProductCategories.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.Appointments.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.BarberServices.Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.ShiftBreaks.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.WorkShifts.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.WorkSchedules.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.DaysOff.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.Barbers.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.Services.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.Clients.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.Users.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.Subscriptions.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.TenantSettings.IgnoreQueryFilters().Where(x => x.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await _db.Tenants.IgnoreQueryFilters().Where(x => x.Id == tenantId).ExecuteDeleteAsync(ct);

        await tx.CommitAsync(ct);

        return Ok(ApiResponse<object>.Ok(new { removed = true }, "Tenant de demo e todos os dados vinculados foram removidos."));
    }

    private static string Slugify(string name) =>
        name.ToLowerInvariant()
            .Replace(" ", ".")
            .Replace("á", "a").Replace("ã", "a").Replace("â", "a")
            .Replace("é", "e").Replace("ê", "e")
            .Replace("í", "i")
            .Replace("ó", "o").Replace("ô", "o")
            .Replace("ú", "u")
            .Replace("ç", "c");
}
