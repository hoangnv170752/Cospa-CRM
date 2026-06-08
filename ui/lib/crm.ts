// CRM API Service
// Base URL for CRM backend
const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:5001/api';

// Get auth token from localStorage
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('crm_token');
}

// Set auth token to localStorage
export function setCrmToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('crm_token', token);
  }
}

// Remove auth token from localStorage
export function removeCrmToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('crm_token');
  }
}

// Common fetch wrapper with auth
export async function crmFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${CRM_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// =====================
// Types
// =====================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  phone?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  notes?: string;
  companyId?: string;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability?: number;
  expectedCloseDate?: string;
  notes?: string;
  contactId?: string;
  companyId?: string;
  contact?: Contact;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  type: 'supplier' | 'manufacturer' | 'distributor' | 'service_provider';
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  currency: string;
  rating?: number;
  status: 'pending' | 'active' | 'inactive' | 'blacklisted';
  notes?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  description?: string;
  type: 'purchase' | 'sales' | 'service' | 'maintenance' | 'subscription' | 'nda' | 'partnership';
  vendorId?: string;
  companyId?: string;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  renewalTermDays?: number;
  totalValue?: number;
  currency: string;
  paymentTerms?: string;
  slaLevel?: string;
  status: 'draft' | 'pending_approval' | 'active' | 'expired' | 'cancelled';
  tenantId: string;
  vendor?: Vendor;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  contactId?: string;
  dealId?: string;
  companyId?: string;
  contact?: Contact;
  deal?: Deal;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';
  category?: string;
  resolution?: string;
  deviceAssignmentId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CrmStats {
  companies: number;
  contacts: number;
  deals: {
    total: number;
    totalValue: number;
    byStage: Record<string, number>;
  };
  vendors: number;
  contracts: {
    total: number;
    active: number;
    expiringSoon: number;
  };
  tickets: {
    total: number;
    open: number;
    resolved: number;
  };
}

// =====================
// Company API
// =====================

export async function fetchCompanies(options: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<PaginatedResponse<Company>> {
  const { page = 1, limit = 20, search } = options;
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);

  return crmFetch<PaginatedResponse<Company>>(`/companies?${params}`);
}

export async function getCompany(id: string): Promise<Company> {
  return crmFetch<Company>(`/companies/${id}`);
}

export async function createCompany(data: Partial<Company>): Promise<Company> {
  return crmFetch<Company>('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
  return crmFetch<Company>(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(id: string): Promise<void> {
  return crmFetch<void>(`/companies/${id}`, {
    method: 'DELETE',
  });
}

// =====================
// Contact API
// =====================

export async function fetchContacts(options: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<PaginatedResponse<Contact>> {
  const { page = 1, limit = 20, search } = options;
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);

  return crmFetch<PaginatedResponse<Contact>>(`/contacts?${params}`);
}

export async function getContact(id: string): Promise<Contact> {
  return crmFetch<Contact>(`/contacts/${id}`);
}

export async function createContact(data: Partial<Contact>): Promise<Contact> {
  return crmFetch<Contact>('/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
  return crmFetch<Contact>(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteContact(id: string): Promise<void> {
  return crmFetch<void>(`/contacts/${id}`, {
    method: 'DELETE',
  });
}

// =====================
// Deal API
// =====================

export async function fetchDeals(options: {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
} = {}): Promise<PaginatedResponse<Deal>> {
  const { page = 1, limit = 20, search, stage } = options;
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);
  if (stage) params.append('stage', stage);

  return crmFetch<PaginatedResponse<Deal>>(`/deals?${params}`);
}

export async function getDeal(id: string): Promise<Deal> {
  return crmFetch<Deal>(`/deals/${id}`);
}

export async function createDeal(data: Partial<Deal>): Promise<Deal> {
  return crmFetch<Deal>('/deals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDeal(id: string, data: Partial<Deal>): Promise<Deal> {
  return crmFetch<Deal>(`/deals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDeal(id: string): Promise<void> {
  return crmFetch<void>(`/deals/${id}`, {
    method: 'DELETE',
  });
}

// =====================
// Vendor API
// =====================

export async function fetchVendors(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}): Promise<PaginatedResponse<Vendor>> {
  const { page = 1, limit = 20, search, status } = options;
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);
  if (status) params.append('status', status);

  return crmFetch<PaginatedResponse<Vendor>>(`/vendors?${params}`);
}

export async function getVendor(id: string): Promise<Vendor> {
  return crmFetch<Vendor>(`/vendors/${id}`);
}

export async function createVendor(data: Partial<Vendor>): Promise<Vendor> {
  return crmFetch<Vendor>('/vendors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor> {
  return crmFetch<Vendor>(`/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVendor(id: string): Promise<void> {
  return crmFetch<void>(`/vendors/${id}`, {
    method: 'DELETE',
  });
}

// =====================
// Contract API
// =====================

export async function fetchContracts(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
} = {}): Promise<PaginatedResponse<Contract>> {
  const { page = 1, limit = 20, search, status, type } = options;
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (type) params.append('type', type);

  return crmFetch<PaginatedResponse<Contract>>(`/contracts?${params}`);
}

export async function getContract(id: string): Promise<Contract> {
  return crmFetch<Contract>(`/contracts/${id}`);
}

export async function createContract(data: Partial<Contract>): Promise<Contract> {
  return crmFetch<Contract>('/contracts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateContract(id: string, data: Partial<Contract>): Promise<Contract> {
  return crmFetch<Contract>(`/contracts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteContract(id: string): Promise<void> {
  return crmFetch<void>(`/contracts/${id}`, {
    method: 'DELETE',
  });
}

// =====================
// Activity API
// =====================

export async function fetchActivities(options: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
} = {}): Promise<PaginatedResponse<Activity>> {
  const { page = 1, limit = 20, search, type } = options;
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);
  if (type) params.append('type', type);

  return crmFetch<PaginatedResponse<Activity>>(`/activities?${params}`);
}

export async function createActivity(data: Partial<Activity>): Promise<Activity> {
  return crmFetch<Activity>('/activities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateActivity(id: string, data: Partial<Activity>): Promise<Activity> {
  return crmFetch<Activity>(`/activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteActivity(id: string): Promise<void> {
  return crmFetch<void>(`/activities/${id}`, {
    method: 'DELETE',
  });
}

// =====================
// Service Ticket API
// =====================

export async function fetchServiceTickets(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
} = {}): Promise<PaginatedResponse<ServiceTicket>> {
  const { page = 1, limit = 20, search, status, priority } = options;
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);

  return crmFetch<PaginatedResponse<ServiceTicket>>(`/service-tickets?${params}`);
}

export async function createServiceTicket(data: Partial<ServiceTicket>): Promise<ServiceTicket> {
  return crmFetch<ServiceTicket>('/service-tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateServiceTicket(id: string, data: Partial<ServiceTicket>): Promise<ServiceTicket> {
  return crmFetch<ServiceTicket>(`/service-tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// =====================
// Stats API (for dashboard)
// =====================

export async function getCrmStats(): Promise<CrmStats> {
  // Fetch all stats in parallel
  const [companies, contacts, deals, vendors, contracts, tickets] = await Promise.all([
    fetchCompanies({ limit: 1 }),
    fetchContacts({ limit: 1 }),
    fetchDeals({ limit: 100 }),
    fetchVendors({ limit: 1 }),
    fetchContracts({ limit: 100 }),
    fetchServiceTickets({ limit: 100 }),
  ]);

  // Calculate deal stats
  const dealsByStage: Record<string, number> = {};
  let totalDealValue = 0;
  deals.data.forEach(deal => {
    dealsByStage[deal.stage] = (dealsByStage[deal.stage] || 0) + 1;
    totalDealValue += deal.value || 0;
  });

  // Calculate contract stats
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const activeContracts = contracts.data.filter(c => c.status === 'active').length;
  const expiringSoon = contracts.data.filter(c => {
    if (!c.endDate) return false;
    const endDate = new Date(c.endDate);
    return endDate > now && endDate < thirtyDaysLater;
  }).length;

  // Calculate ticket stats
  const openTickets = tickets.data.filter(t => ['open', 'in_progress'].includes(t.status)).length;
  const resolvedTickets = tickets.data.filter(t => ['resolved', 'closed'].includes(t.status)).length;

  return {
    companies: companies.total,
    contacts: contacts.total,
    deals: {
      total: deals.total,
      totalValue: totalDealValue,
      byStage: dealsByStage,
    },
    vendors: vendors.total,
    contracts: {
      total: contracts.total,
      active: activeContracts,
      expiringSoon,
    },
    tickets: {
      total: tickets.total,
      open: openTickets,
      resolved: resolvedTickets,
    },
  };
}

// =====================
// Email API
// =====================

export interface SendEmailResponse {
  success: boolean;
  message: string;
  totalContacts?: number;
  totalTenants?: number;
  successCount: number;
  failedCount: number;
  errors?: unknown[];
}

export interface SendContactsEmailData {
  contactIds?: string[];
  contacts?: { email: string; firstName?: string; lastName?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
}

export interface SendTenantsEmailData {
  tenantIds?: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
}

export async function sendContactsEmail(data: SendContactsEmailData): Promise<SendEmailResponse> {
  return crmFetch<SendEmailResponse>('/contacts/send-email', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendTenantsEmail(data: SendTenantsEmailData): Promise<SendEmailResponse> {
  return crmFetch<SendEmailResponse>('/tenants/send-email', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendSingleEmail(data: {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
}): Promise<{ success: boolean; id?: string }> {
  return crmFetch<{ success: boolean; id?: string }>('/emails/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
