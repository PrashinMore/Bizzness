export type CustomerGender = 'MALE' | 'FEMALE' | 'OTHER' | null;
export type VisitType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type FeedbackStatus = 'OPEN' | 'RESOLVED';
export type LoyaltyTier = 'SILVER' | 'GOLD' | 'PLATINUM';

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email?: string | null;
  birthday?: string | null;
  gender?: CustomerGender;
  tags: string[];
  totalVisits: number;
  totalSpend: number;
  avgOrderValue: number;
  lastVisitAt?: string | null;
  createdAt: string;
  updatedAt: string;
  loyaltyAccount?: LoyaltyAccount;
}

export interface CustomerVisit {
  id: string;
  customerId: string;
  orderId?: string | null;
  outletId?: string | null;
  billAmount: number;
  visitType: VisitType;
  visitedAt: string;
  createdAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  createdByUserId: string;
  note: string;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CustomerFeedback {
  id: string;
  customerId: string;
  orderId?: string | null;
  rating: number;
  comment?: string | null;
  status: FeedbackStatus;
  createdAt: string;
}

export interface LoyaltyAccount {
  id: string;
  customerId: string;
  points: number;
  tier: LoyaltyTier;
  createdAt: string;
  updatedAt: string;
}

export interface CrmDashboardStats {
  totalCustomers: number;
  newCustomersLast7Days: number;
  repeatRate: number;
  avgVisitsPerCustomer: number;
}

export interface ListCustomersResponse {
  customers: Customer[];
  total: number;
}

