using BarberSaaS.Application.Common.Interfaces;
using BarberSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberSaaS.Infrastructure.Persistence.Repositories;

public class BarberGoogleCredentialRepository : IBarberGoogleCredentialRepository
{
    private readonly AppDbContext _db;

    public BarberGoogleCredentialRepository(AppDbContext db) => _db = db;

    public Task<BarberGoogleCredential?> GetByBarberIdAsync(Guid barberId, CancellationToken ct = default)
        => _db.BarberGoogleCredentials.FirstOrDefaultAsync(c => c.BarberId == barberId, ct);

    public async Task AddAsync(BarberGoogleCredential credential, CancellationToken ct = default)
    {
        _db.BarberGoogleCredentials.Add(credential);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(BarberGoogleCredential credential, CancellationToken ct = default)
    {
        _db.BarberGoogleCredentials.Update(credential);
        await _db.SaveChangesAsync(ct);
    }

    // Hard delete DE PROPÓSITO (sem soft-delete): tokens revogados/substituídos não
    // podem permanecer no banco, e uma linha soft-deleted conflitaria com o índice
    // único de BarberId na reconexão. IgnoreQueryFilters garante a limpeza mesmo de
    // uma linha órfã soft-deleted — o BarberId já foi validado contra o tenant no handler.
    public async Task DeleteByBarberIdAsync(Guid barberId, CancellationToken ct = default)
    {
        var rows = await _db.BarberGoogleCredentials
            .IgnoreQueryFilters()
            .Where(c => c.BarberId == barberId)
            .ToListAsync(ct);
        if (rows.Count == 0) return;
        _db.BarberGoogleCredentials.RemoveRange(rows);
        await _db.SaveChangesAsync(ct);
    }
}
