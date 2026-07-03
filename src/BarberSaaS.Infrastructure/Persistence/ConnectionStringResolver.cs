using Microsoft.Extensions.Configuration;
using Npgsql;

namespace BarberSaaS.Infrastructure.Persistence;

public enum DatabaseProvider
{
    Sqlite,
    SqlServer,
    PostgreSql
}

/// <summary>
/// Resolve e normaliza a connection string do banco principal.
/// <para>
/// Fontes, em ordem: <c>ConnectionStrings:Default</c> (env var <c>ConnectionStrings__Default</c>)
/// e, se vazia, <c>DATABASE_URL</c> — que o Railway injeta no formato URI
/// (<c>postgresql://user:pass@host:port/db</c>). O Npgsql só aceita o formato
/// keyword (<c>Host=...;Username=...</c>), então URIs são convertidas aqui.
/// </para>
/// </summary>
public static class ConnectionStringResolver
{
    public static string Resolve(IConfiguration config)
    {
        var raw = config.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(raw))
            raw = config["DATABASE_URL"];
        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException(
                "Connection string não configurada. Defina ConnectionStrings__Default ou DATABASE_URL.");
        return Normalize(raw);
    }

    /// <summary>
    /// Converte URI <c>postgres://</c>/<c>postgresql://</c> para o formato keyword do Npgsql.
    /// Connection strings que já estão em formato keyword passam intocadas.
    /// </summary>
    public static string Normalize(string connStr)
    {
        if (!connStr.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !connStr.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            return connStr;

        var uri = new Uri(connStr);
        var userInfo = uri.UserInfo.Split(':', 2);

        // O builder cuida do escaping (senha com ';', aspas etc.).
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
            Username = Uri.UnescapeDataString(userInfo[0])
        };
        if (userInfo.Length > 1)
            builder.Password = Uri.UnescapeDataString(userInfo[1]);

        // Query string (ex.: ?sslmode=require) — repassada como keywords do Npgsql.
        foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = pair.Split('=', 2);
            var key = Uri.UnescapeDataString(kv[0]);
            if (key.Equals("sslmode", StringComparison.OrdinalIgnoreCase))
                key = "SSL Mode";
            builder[key] = kv.Length > 1 ? Uri.UnescapeDataString(kv[1]) : "";
        }

        return builder.ConnectionString;
    }

    /// <summary>
    /// SQLite começa com <c>Data Source=</c>; PostgreSQL tem <c>Host=</c> (ou veio como URI);
    /// qualquer outra coisa (<c>Server=...</c>) é SQL Server.
    /// </summary>
    public static DatabaseProvider Detect(string connStr)
    {
        if (connStr.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase) ||
            connStr.StartsWith("DataSource=", StringComparison.OrdinalIgnoreCase) ||
            connStr.StartsWith("Filename=", StringComparison.OrdinalIgnoreCase))
            return DatabaseProvider.Sqlite;

        if (connStr.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            connStr.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) ||
            connStr.Contains("Host=", StringComparison.OrdinalIgnoreCase))
            return DatabaseProvider.PostgreSql;

        return DatabaseProvider.SqlServer;
    }
}
