namespace BarberSaaS.Domain.Exceptions;

public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
}

public class SlotUnavailableException : DomainException
{
    public SlotUnavailableException(string message = "O horário selecionado não está disponível.") : base(message) { }
}

public class TenantNotFoundException : DomainException
{
    public TenantNotFoundException(string identifier) : base($"Barbearia '{identifier}' não encontrada.") { }
}

public class EntityNotFoundException : DomainException
{
    public EntityNotFoundException(string entity, Guid id) : base($"{entity} com id '{id}' não encontrado.") { }
}

public class BusinessRuleException : DomainException
{
    public BusinessRuleException(string message) : base(message) { }
}

public class UnauthorizedTenantAccessException : DomainException
{
    public UnauthorizedTenantAccessException() : base("Acesso não autorizado a este tenant.") { }
}

public class FeatureNotAvailableException : DomainException
{
    public FeatureNotAvailableException(string feature)
        : base($"O recurso '{feature}' não está disponível no plano atual. Faça upgrade para continuar.") { }
}

public class ClientBlockedException : DomainException
{
    public ClientBlockedException()
        : base("Sua conta está bloqueada. Entre em contato com a barbearia para mais informações.") { }
}

public class ClientProfileIncompleteException : DomainException
{
    public ClientProfileIncompleteException()
        : base("Complete seu cadastro (nome e CPF) antes de continuar.") { }
}
