namespace BarberSaaS.Domain.Enums;

/// <summary>
/// Quem escreveu a mensagem de suporte. Só existem dois lados na conversa:
/// o dono da barbearia e o Trimly (super admin) — por isso o "lido" pode ficar
/// na própria mensagem (ReadAt): cada mensagem tem exatamente um destinatário.
/// </summary>
public enum SupportMessageAuthor : byte
{
    Owner = 0,
    SuperAdmin = 1
}
