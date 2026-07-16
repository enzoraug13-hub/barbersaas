using BarberSaaS.Domain.Common;

namespace BarberSaaS.Domain.Entities;

public class Client : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Cpf { get; set; }
    public string? Email { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? PhotoUrl { get; set; }

    // APOSENTADOS (colunas mantidas no banco, mas ninguém lê nem escreve):
    // pontos = LoyaltyWallet.TotalPoints (fonte da verdade, com extrato);
    // visitas = derivadas dos Appointments Completed. Ver ILoyaltyRepository.
    public int LoyaltyPoints { get; set; } = 0;
    public decimal WalletBalance { get; set; } = 0;
    public int TotalVisits { get; set; } = 0;
    public DateTime? LastVisitAt { get; set; }
    public bool IsBlocked { get; set; } = false;
    public string? BlockReason { get; set; }

    public Tenant? Tenant { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public LoyaltyWallet? LoyaltyWallet { get; set; }

    // Usado só na criação tardia do cliente (ver UpdateMyProfileCommand): o Id
    // precisa ser o mesmo Guid determinístico (telefone+tenant) já usado como
    // "sub" do JWT desde a verificação do OTP, antes do cliente existir no banco.
    public void AssignDeterministicId(Guid id) => Id = id;
}
