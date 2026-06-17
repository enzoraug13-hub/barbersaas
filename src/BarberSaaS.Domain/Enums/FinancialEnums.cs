namespace BarberSaaS.Domain.Enums;

public enum TransactionType : byte
{
    Revenue = 0,
    Expense = 1
}

public enum TransactionCategory : byte
{
    Service      = 0,
    Product      = 1,
    Rent         = 2,
    Energy       = 3,
    Salary       = 4,
    Commission   = 5,
    Marketing    = 6,
    Equipment    = 7,
    Maintenance  = 8,
    Other        = 9
}

public enum TransactionStatus : byte
{
    Pending  = 0,
    Partial  = 1,
    Paid     = 2
}

public enum PaymentMethod : byte
{
    Cash   = 0,
    Pix    = 1,
    Credit = 2,
    Debit  = 3,
    Other  = 4
}

public enum SubscriptionStatus : byte
{
    Trial     = 0,
    Active    = 1,
    PastDue   = 2,
    Cancelled = 3,
    Suspended = 4
}

public enum BillingCycle : byte
{
    Monthly = 0,
    Yearly  = 1
}

public enum StockMovementType : byte
{
    Entry      = 0,
    Exit       = 1,
    Adjustment = 2,
    Sale       = 3
}

public enum CommissionType : byte
{
    Percentage = 0,
    Fixed      = 1
}

public enum GoalStatus : byte
{
    Active    = 0,
    Completed = 1,
    Cancelled = 2
}

public enum LoyaltyTransactionType : byte
{
    Credit     = 0,
    Debit      = 1,
    Expiration = 2
}

public enum DiscountType : byte
{
    Percentage = 0,
    Fixed      = 1
}
