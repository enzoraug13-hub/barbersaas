using BarberSaaS.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace BarberSaaS.Infrastructure.ExternalServices;

public class AuthOptions : IAuthOptions
{
    public bool RequireEmailConfirmation { get; }
    public string FrontendUrl { get; }

    public AuthOptions(IConfiguration config)
    {
        RequireEmailConfirmation = config.GetValue("Auth:RequireEmailConfirmation", false);
        FrontendUrl = (config["App:FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');
    }
}
