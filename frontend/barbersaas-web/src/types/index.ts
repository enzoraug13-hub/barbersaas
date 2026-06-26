export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
}

export interface Barber {
  id: string
  name: string
  photoUrl?: string
  bio?: string
  phone?: string
  isActive: boolean
  showInPublicPage: boolean
  displayOrder: number
  googleCalendarId?: string
  commissionType: number
  commissionValue: number
}

export interface Service {
  id: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  colorHex?: string
  isActive: boolean
  showInPublicPage: boolean
  displayOrder: number
}

export interface Client {
  id: string
  name: string
  phoneNumber: string
  email?: string
  totalVisits: number
  lastVisitAt?: string
  loyaltyPoints: number
  isBlocked: boolean
}

export interface Appointment {
  id: string
  clientName: string
  clientPhone: string
  barberName: string
  serviceName: string
  date: string
  startTime: string
  endTime: string
  finalPrice: number
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'NoShow'
  notes?: string
  isPaid: boolean
}

export interface Slot {
  start: string
  end: string
  label: string
  available: boolean
}

export interface DashboardData {
  totalRevenue: number
  totalExpense: number
  netProfit: number
  averageTicket: number
  totalAppointments: number
  cancelledCount: number
  completedCount: number
  uniqueClients: number
  cancellationRate: number
  topServices: { name: string; count: number; revenue: number }[]
  dailyRevenue: { date: string; revenue: number; expense: number; appointments: number }[]
}

export interface BusinessHour { dayOfWeek: number; isOpen: boolean; openTime: string | null; closeTime: string | null }

export interface TenantPublicInfo {
  tenantId: string
  businessName: string
  description?: string
  logoUrl?: string
  coverImageUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  phone?: string
  instagramUrl?: string
  whatsAppNumber?: string
  address?: string
  city?: string
  businessHours?: BusinessHour[]
}

export interface Goal {
  id: string
  name: string
  description?: string
  targetAmount: number
  currentAmount: number
  percentageComplete: number
  remainingAmount: number
  targetDate?: string
  status: string
  isCompleted: boolean
}

export interface ProductCategory {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  description?: string
  salePrice: number
  costPrice: number
  stockQuantity: number
  minStockAlert: number
  sku?: string
  isActive: boolean
  categoryId: string
  categoryName: string
  isLowStock: boolean
}

export interface FinancialTransaction {
  id: string
  type: string
  category: string
  description: string
  amount: number
  paidAmount: number
  status: string
  dueDate: string
  transactionDate: string
}
