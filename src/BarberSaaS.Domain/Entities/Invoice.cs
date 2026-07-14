using BarberSaaS.Domain.Common;
using BarberSaaS.Domain.Enums;

namespace BarberSaaS.Domain.Entities;

/// <summary>
/// Fatura que a barbearia (Tenant) paga AO TRIMLY. É receita do meu negócio —
/// nada a ver com o financeiro interno da barbearia (FinancialTransaction), que
/// é o dinheiro dos cortes dela.
///
/// Cobrança manual via Pix: nasce Open, o super admin marca Paid quando o
/// dinheiro cai, e pode anexar o comprovante. Só o super admin enxerga isto —
/// o TenantId serve pra saber DE QUEM é a fatura, não pra isolar acesso.
///
/// Não reaproveita SubscriptionPayment de propósito: aquela entidade (morta hoje)
/// foi desenhada pra gateway (ExternalPaymentId/FailureReason) e pendura em
/// Subscription, sem competência nem comprovante.
/// </summary>
public class Invoice : BaseEntity
{
    /// <summary>Ano da competência (mês de referência da cobrança). Ex.: 2026.</summary>
    public int CompetenceYear { get; set; }
    /// <summary>Mês da competência, 1–12.</summary>
    public int CompetenceMonth { get; set; }

    public decimal Amount { get; set; }
    public DateOnly DueDate { get; set; }

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Open;
    public DateTime? PaidAt { get; set; }

    /// <summary>
    /// Comprovante do Pix (opcional). Vem do POST /uploads (IFileStorage).
    /// ATENÇÃO: em produção o R2 ainda não está configurado, então o arquivo vive
    /// no disco efêmero do Railway e some no próximo deploy — por isso é opcional
    /// e a fatura nunca depende dele pra ser considerada paga.
    /// </summary>
    public string? ReceiptUrl { get; set; }

    public string? Notes { get; set; }

    public Tenant? Tenant { get; set; }
}
