namespace BarberSaaS.Domain.Enums;

/// <summary>
/// Cobrança manual (Pix): a fatura nasce Open e o super admin marca Paid ao
/// receber. Sem gateway — não há estado "processando"/"falhou".
/// </summary>
public enum InvoiceStatus : byte
{
    Open = 0,
    Paid = 1
}
