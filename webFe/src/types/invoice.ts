export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  rate: number;
  total: number;
  tax?: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  branchId?: string | null;
  billingSessionId?: string | null;
  invoiceNumber: string;
  invoicePrefix: string;
  invoiceSerial: number;
  invoicePeriod?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerGstin?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  pdfUrl?: string | null;
  htmlSnapshot?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationInvoiceSettings {
  id: string;
  organizationId: string;
  enableInvoices: boolean;
  gstEnabled: boolean;
  invoicePrefix: string;
  invoiceBranchPrefix: boolean;
  invoiceResetCycle: 'never' | 'monthly' | 'yearly';
  invoicePadding: number;
  invoiceDisplayFormat: 'A4' | 'thermal';
  includeLogo: boolean;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceFromSaleDto {
  customerName?: string;
  customerPhone?: string;
  customerGstin?: string;
  forceSyncPdf?: boolean;
}

