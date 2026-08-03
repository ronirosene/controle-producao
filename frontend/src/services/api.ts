const BASE = '/api';

let authCallback: ((token: string | null) => void) | null = null;

export function setAuthToken(token: string | null) {
  if (authCallback) authCallback(token);
}

export function getAuthToken() {
  return null;
}

export function onAuthChange(cb: (token: string | null) => void) {
  authCallback = cb;
  return () => { authCallback = null; };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { ...headers, ...options?.headers as Record<string, string> },
    ...options,
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Não autorizado');
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ${res.status}: ${err}`);
  }
  return res.json();
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  representante?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  color?: string;
  fabric?: string;
  notes?: string;
  createdAt: string;
}

export interface ServiceOrderItem {
  id: string;
  serviceOrderId: string;
  productId: string;
  color?: string;
  fabric?: string;
  quantity: number;
  price?: number;
  chargeable?: boolean;
  problemDesc: string;
  resolution?: string;
  images?: string;
  createdAt: string;
  product: Product;
}

export interface ServiceOrder {
  id: string;
  pedido: number;
  customerId: string;
  entryDate: string;
  billingDate?: string;
  status: 'AGUARDANDO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'ENTREGUE' | 'CANCELADO' | 'AGUARDANDO_FINANCEIRO' | 'AGUARDANDO_AUT_CLIENTE' | 'AGUARDANDO_PRODUCAO';
  notes?: string;
  finishedImages?: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  items: ServiceOrderItem[];
  servicoId?: number;
}

export function getImageList(order: ServiceOrder | ServiceOrderItem): string[] {
  if ('images' in order && order.images) {
    try { return JSON.parse(order.images); } catch { return []; }
  }
  if ('attachments' in order && (order as any).attachments) {
    try { return JSON.parse((order as any).attachments); } catch { return []; }
  }
  if ('attachment' in order && (order as any).attachment) {
    return [(order as any).attachment];
  }
  return [];
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ id: string; email: string; name: string; role: string }>('/auth/me'),
};

export const customersApi = {
  list: (search?: string) => request<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  get: (id: string) => request<Customer>(`/customers/${id}`),
  create: (data: Partial<Customer>) => request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Customer>) => request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/customers/${id}`, { method: 'DELETE' }),
};

export const productsApi = {
  list: (search?: string) => request<Product[]>(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  get: (id: string) => request<Product>(`/products/${id}`),
  create: (data: Partial<Product>) => request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Product>) => request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
};

export const uploadApi = {
  upload: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('files', file);
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form, credentials: 'include' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erro ao enviar arquivo (${res.status}): ${text}`);
    }
    const data = await res.json();
    return { url: data.urls[0] };
  },
  uploadMultiple: async (files: File[]): Promise<string[]> => {
    // Send one image at a time so the backend never has to decode several large
    // photos concurrently on a memory-constrained machine.
    const urls: string[] = [];
    for (const file of files) {
      const { url } = await uploadApi.upload(file);
      urls.push(url);
    }
    return urls;
  },
};

export const serviceOrdersApi = {
  list: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return request<ServiceOrder[]>(`/service-orders${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<ServiceOrder>(`/service-orders/${id}`),
  create: (data: any) => request<ServiceOrder>('/service-orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<ServiceOrder>(`/service-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/service-orders/${id}`, { method: 'DELETE' }),
  createProductionService: (id: string) =>
    request<{ servicoId: number; message: string }>(`/service-orders/${id}/create-production-service`, { method: 'POST' }),
};

export const servicosApi = {
  list: () => request<any[]>('/servicos'),
  get: (id: number) => request<any>(`/servicos/${id}`),
  update: (id: number, data: any) => request<any>(`/servicos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/servicos/${id}`, { method: 'DELETE' }),
};

export const produtosApi = {
  dashboard: () => request<any>('/produtos/dashboard'),
  relatorio: () => request<any>('/produtos/relatorio'),
  posicaoAtual: () => request<any[]>('/produtos/posicao-atual'),
  mover: (id: number, data: any) => request<any>(`/produtos/${id}/mover`, { method: 'PUT', body: JSON.stringify(data) }),
  editar: (id: number, data: any) => request<any>(`/produtos/${id}/editar`, { method: 'PUT', body: JSON.stringify(data) }),
  estoque: (id: number, data: any) => request<any>(`/produtos/${id}/estoque`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/produtos/${id}`, { method: 'DELETE' }),
  create: (data: any) => request<any>('/produtos', { method: 'POST', body: JSON.stringify(data) }),
  observacoes: {
    list: () => request<any[]>('/produtos/observacoes'),
    update: (id: number, data: any) => request<any>(`/produtos/observacoes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/produtos/observacoes/${id}`, { method: 'DELETE' }),
  },
};

export const dashboardApi = {
  get: () => request<any>('/dashboard'),
};

export const assistenciaLogsApi = {
  list: () => request<any[]>('/assistencia/logs'),
};

export const assistenciaRegistersApi = {
  representantes: {
    list: (search?: string) => request<any[]>(`/assistencia/representantes${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    create: (nome: string) => request<any>('/assistencia/representantes', { method: 'POST', body: JSON.stringify({ nome }) }),
    update: (id: number, nome: string) => request<any>(`/assistencia/representantes/${id}`, { method: 'PUT', body: JSON.stringify({ nome }) }),
    delete: (id: number) => request<void>(`/assistencia/representantes/${id}`, { method: 'DELETE' }),
  },
  cores: {
    list: (search?: string) => request<any[]>(`/assistencia/cores${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    create: (nome: string) => request<any>('/assistencia/cores', { method: 'POST', body: JSON.stringify({ nome }) }),
    update: (id: number, nome: string) => request<any>(`/assistencia/cores/${id}`, { method: 'PUT', body: JSON.stringify({ nome }) }),
    delete: (id: number) => request<void>(`/assistencia/cores/${id}`, { method: 'DELETE' }),
  },
  detalhes: {
    list: (search?: string) => request<any[]>(`/assistencia/detalhes${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    create: (nome: string) => request<any>('/assistencia/detalhes', { method: 'POST', body: JSON.stringify({ nome }) }),
    update: (id: number, nome: string) => request<any>(`/assistencia/detalhes/${id}`, { method: 'PUT', body: JSON.stringify({ nome }) }),
    delete: (id: number) => request<void>(`/assistencia/detalhes/${id}`, { method: 'DELETE' }),
  },
};

export const usersApi = {
  list: () => request<any[]>('/users'),
};

export const backupApi = {
  list: () => request<any[]>('/backups'),
};

export const urgentesApi = {
  list: () => request<any[]>('/urgentes'),
  create: (data: { produto_id: number; data_despacho: string; observacao?: string }) =>
    request<any>('/urgentes', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/urgentes/${id}`, { method: 'DELETE' }),
};
