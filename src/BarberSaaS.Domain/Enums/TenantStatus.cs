namespace BarberSaaS.Domain.Enums;

/// <summary>
/// Status da CONTA da barbearia, controlado pelo super admin (venda ao vivo:
/// o super admin cria e suspende contas manualmente). Active = 0 de propósito:
/// tenants pré-existentes recebem o default e continuam funcionando.
/// </summary>
public enum TenantStatus : byte
{
    Active    = 0,
    Suspended = 1
}
