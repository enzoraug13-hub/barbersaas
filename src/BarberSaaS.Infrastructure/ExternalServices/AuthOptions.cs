using BarberSaaS.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace BarberSaaS.Infrastructure.ExternalServices;

public class AuthOptions : IAuthOptions
{
    public bool RequireEmailConfirmation { get; }
    public string FrontendUrl { get; }
    public bool PublicRegistrationEnabled { get; }

    public AuthOptions(IConfiguration config)
    {
        RequireEmailConfirmation = config.GetValue("Auth:RequireEmailConfirmation", false);
        FrontendUrl = (config["App:FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');
        // Default FALSE (fail-closed): ausência de configuração = cadastro público
        // desligado. Reativar exige opt-in explícito.
        PublicRegistrationEnabled = config.GetValue("Auth:PublicRegistrationEnabled", false);
    }
}
