using BarberSaaS.Application.Common.Interfaces;
using Microsoft.Extensions.Hosting;

namespace BarberSaaS.Infrastructure;

/// <summary>
/// Adapter de IHostEnvironment para a Application (que não referencia Hosting).
/// </summary>
public class AppEnvironment : IAppEnvironment
{
    private readonly IHostEnvironment _env;
    public AppEnvironment(IHostEnvironment env) => _env = env;

    public bool IsDevelopment => _env.IsDevelopment();
}
