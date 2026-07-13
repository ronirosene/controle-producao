'use client';

import { useEffect, useState, useCallback } from 'react';
import { serviceOrdersApi, customersApi, productsApi, uploadApi, getImageList, assistenciaRegistersApi, ServiceOrder, ServiceOrderItem, Customer, Product } from '@/services/api';
import { StatusBadge } from '@/app/types';
import { useAuth } from '@/services/auth';

export default function OrdensPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<ServiceOrder | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);

  const load = useCallback(() => {
    serviceOrdersApi.list({ search: search || undefined, status: statusFilter || undefined }).then(setOrders);
  }, [search, statusFilter]);

  useEffect(() => { if (user) load(); }, [load, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('nova') === 'true') setShowForm(true);
  }, []);

  if (!user) return null;

  const totalItems = (order: ServiceOrder) =>
    order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  const hasImages = (order: ServiceOrder) =>
    order.items?.some(i => getImageList(i).length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Assistência</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Nova Assistência
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar por representante, produto ou problema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos status</option>
          <option value="AGUARDANDO">Aguardando</option>
          <option value="AGUARDANDO_FINANCEIRO">Aguardando Financeiro</option>
          <option value="AGUARDANDO_AUT_CLIENTE">Aguardando Aut. Cliente</option>
          <option value="AUTORIZADO_CLIENTE">Autorizado pelo Cliente</option>
          <option value="EM_ANDAMENTO">Em Andamento</option>
          <option value="CONCLUIDO">Concluído</option>
          <option value="ENTREGUE">Entregue</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {showForm && (
        <OrderFormModal
          user={user}
          editId={editId}
          editPedido={editId ? orders.find(o => o.id === editId)?.pedido : undefined}
          onClose={() => { setShowForm(false); setEditId(null); }}
          onSaved={() => { setShowForm(false); setEditId(null); load(); }}
        />
      )}

      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onImageClick={(images, idx) => { setLightboxImages(images); setLightboxIndex(idx); }}
          onRefresh={load}
        />
      )}

      {lightboxIndex >= 0 && (
        <Lightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => { setLightboxIndex(-1); setLightboxImages([]); }}
          onPrev={() => setLightboxIndex((i) => (i > 0 ? i - 1 : lightboxImages.length - 1))}
          onNext={() => setLightboxIndex((i) => (i < lightboxImages.length - 1 ? i + 1 : 0))}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b bg-gray-50">
            <tr className="text-gray-500">
              <th className="p-3">Pedido</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Representante</th>
              <th className="p-3">Produtos</th>
              <th className="p-3">Qtd</th>
              <th className="p-3">Entrada</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Garantia</th>
              <th className="p-3">Status</th>
              <th className="p-3">Imagens</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const imgs = order.items?.flatMap(i => getImageList(i)) || [];
              const firstItem = order.items?.[0];
              const totalValue = order.items?.reduce((s, i) => s + (i.price || 0), 0) || 0;
              return (
                <tr key={order.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setDetailOrder(order)}>
                  <td className="p-3 font-mono font-bold text-gray-700">#{order.pedido}</td>
                  <td className="p-3 font-medium">{order.customer.name}</td>
                  <td className="p-3 text-gray-600">{order.customer.representante || '-'}</td>
                  <td className="p-3">{order.items?.length || 0} item(ns)</td>
                  <td className="p-3">{totalItems(order)}</td>
                  <td className="p-3">{new Date(order.entryDate).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    {totalValue > 0 ? `R$ ${totalValue.toFixed(2)}` :
                      order.items?.some(i => i.chargeable === false) ? <span className="text-green-500 text-xs">Gratuito</span> : '-'}
                  </td>
                  <td className="p-3">
                    <WarrantyBadge entryDate={order.entryDate} billingDate={order.billingDate} />
                  </td>
                  <td className="p-3"><StatusBadge status={order.status} /></td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {imgs.length > 0 ? (
                      <div className="flex -space-x-1">
                        {imgs.slice(0, 3).map((url, i) => (
                          <img key={i} src={url} alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
                        ))}
                        {imgs.length > 3 && <span className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white text-[10px] flex items-center justify-center text-gray-500">+{imgs.length - 3}</span>}
                      </div>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditId(order.id); setShowForm(true); }} className="text-blue-600 hover:underline mr-2">Editar</button>
                    <button onClick={() => { serviceOrdersApi.delete(order.id).then(load); }} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan={11} className="p-4 text-center text-gray-400">Nenhuma ordem encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WarrantyBadge({ entryDate, billingDate }: { entryDate: string; billingDate?: string }) {
  if (!billingDate) return <span className="text-xs text-gray-400">—</span>;
  const bill = new Date(billingDate);
  const entry = new Date(entryDate);
  const diffDays = Math.floor((entry.getTime() - bill.getTime()) / (1000 * 60 * 60 * 24));
  const inWarranty = diffDays <= 90;
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full ${inWarranty ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {inWarranty ? 'Em Garantia' : 'Fora de Garantia'}
    </span>
  );
}

function Lightbox({ images, currentIndex, onClose, onPrev, onNext }: { images: string[]; currentIndex: number; onClose: () => void; onPrev: () => void; onNext: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10">&times;</button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 text-white/70 hover:text-white text-4xl z-10">&lsaquo;</button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 text-white/70 hover:text-white text-4xl z-10">&rsaquo;</button>
          <div className="absolute bottom-4 text-white/60 text-sm z-10">{currentIndex + 1} / {images.length}</div>
        </>
      )}
      <img
        src={images[currentIndex]}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function OrderDetailModal({ order, onClose, onImageClick, onRefresh }: { order: ServiceOrder; onClose: () => void; onImageClick: (images: string[], idx: number) => void; onRefresh: () => void }) {
  const [creating, setCreating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    await serviceOrdersApi.update(order.id, { status: newStatus });
    onRefresh();
  };

  const getNextStatus = () => {
    const flow: Record<string, string> = {
      AGUARDANDO: 'AGUARDANDO_FINANCEIRO',
      AGUARDANDO_AUT_CLIENTE: 'AUTORIZADO_CLIENTE',
      AUTORIZADO_CLIENTE: 'EM_ANDAMENTO',
      EM_ANDAMENTO: 'CONCLUIDO',
      CONCLUIDO: 'ENTREGUE',
    };
    return flow[order.status];
  };

  const nextStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      AGUARDANDO_AUT_CLIENTE: 'Autorizado pelo Cliente',
    };
    return labels[status] || status.replace(/_/g, ' ');
  };

  const allNotChargeable = order.items?.every(i => i.chargeable === false) ?? false;
  const canCreateProduction = allNotChargeable || order.status === 'AUTORIZADO_CLIENTE';

  const handleCreateProduction = async () => {
    setCreating(true);
    try {
      const result = await serviceOrdersApi.createProductionService(order.id);
      alert(`Serviço de produção criado: ${result.message}`);
      window.location.href = `/servicos?servicoId=${result.servicoId}`;
    } catch (err: any) {
      alert(err.message || 'Erro ao criar serviço de produção');
    } finally {
      setCreating(false);
    }
  };

  const hasServicoVinculado = !!order.servicoId;

  const allImgs = order.items?.flatMap((item, itemIdx) =>
    getImageList(item).map((url, imgIdx) => ({ url, itemIdx, imgIdx }))
  ) || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Pedido #{order.pedido}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="font-medium">Cliente:</span> {order.customer.name}</div>
            <div><span className="font-medium">Representante:</span> {order.customer.representante || '-'}</div>
            <div><span className="font-medium">Entrada:</span> {new Date(order.entryDate).toLocaleDateString('pt-BR')}</div>
            <div><span className="font-medium">Faturamento:</span> {order.billingDate ? new Date(order.billingDate).toLocaleDateString('pt-BR') : '-'}</div>
            <div><span className="font-medium">Garantia:</span> <WarrantyBadge entryDate={order.entryDate} billingDate={order.billingDate} /></div>
            <div><span className="font-medium">Status:</span> <StatusBadge status={order.status} /></div>
          </div>

          {order.notes && <div><span className="font-medium">Obs:</span> {order.notes}</div>}

          <div className="border-t pt-3">
            <h3 className="font-medium mb-2">Produtos ({order.items?.length || 0})</h3>
            {order.items?.map((item, i) => (
              <div key={item.id} className="border rounded-lg p-3 mb-2 bg-gray-50">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">Produto:</span> {item.product.name}</div>
                  <div><span className="font-medium">Cor:</span> {item.color || '-'}</div>
                  <div><span className="font-medium">Detalhe:</span> {item.fabric || '-'}</div>
                  <div><span className="font-medium">Quantidade:</span> {item.quantity}</div>
                  <div><span className="font-medium">Valor:</span> {item.price ? `R$ ${item.price.toFixed(2)}` : '-'}</div>
                  <div><span className="font-medium">Cobrança:</span> {item.chargeable === true ? 'Sim' : item.chargeable === false ? 'Não (Gratuito)' : 'Pendente'}</div>
                </div>
                <div className="mt-2"><span className="font-medium">Problema:</span> {item.problemDesc}</div>
                {item.resolution && <div className="mt-1"><span className="font-medium">Solução:</span> {item.resolution}</div>}
                {getImageList(item).length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {getImageList(item).map((url, idx) => (
                      <img key={idx} src={url} alt="" className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                        onClick={() => onImageClick(getImageList(item), idx)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {getNextStatus() && (
              <button
                onClick={() => handleStatusChange(getNextStatus())}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm"
              >
                {nextStatusLabel(getNextStatus())}
              </button>
            )}

            {canCreateProduction && (
              <button
                onClick={handleCreateProduction}
                disabled={creating}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
              >
                {creating ? 'Criando...' : hasServicoVinculado ? 'Recriar Serviço de Produção' : 'Criar Serviço de Produção'}
              </button>
            )}

            {hasServicoVinculado && (
              <a
                href={`/servicos?servicoId=${order.servicoId}`}
                className="w-full block text-center bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm"
              >
                Ver Serviço de Produção
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Multi-Product Form ─── */

interface ItemForm {
  _key: string;
  productName: string;
  productColor: string;
  productFabric: string;
  quantity: number;
  problemDesc: string;
  resolution: string;
  price: string;
  chargeable: string;
  existingImages: string[];
  newImageFiles: File[];
  newImagePreviews: string[];
}

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function createEmptyItem(): ItemForm {
  return {
    _key: Math.random().toString(36).slice(2, 9),
    productName: '',
    productColor: '',
    productFabric: '',
    quantity: 1,
    problemDesc: '',
    resolution: '',
    price: '',
    chargeable: 'sim',
    existingImages: [],
    newImageFiles: [],
    newImagePreviews: [],
  };
}

const FINANCEIRO_EMAIL = 'financeiro@moveispelinson.com.br';

function OrderFormModal({ user, editId, editPedido, onClose, onSaved }: { user: any; editId: string | null; editPedido?: number; onClose: () => void; onSaved: () => void }) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCustomers, setShowCustomers] = useState(false);
  const [showProducts, setShowProducts] = useState<number>(-1);
  const [customerRepresentante, setCustomerRepresentante] = useState('');
  const [registerCores, setRegisterCores] = useState<any[]>([]);
  const [registerDetalhes, setRegisterDetalhes] = useState<any[]>([]);
  const [showCores, setShowCores] = useState<number>(-1);
  const [showDetalhes, setShowDetalhes] = useState<number>(-1);
  const [uploading, setUploading] = useState(false);

  const [header, setHeader] = useState({
    customerName: '',
    pedido: '',
    entryDate: toLocalDatetime(new Date()),
    billingDate: '',
    notes: '',
  });

  const [items, setItems] = useState<ItemForm[]>([createEmptyItem()]);

  useEffect(() => {
    if (editId) {
      serviceOrdersApi.get(editId).then((order) => {
        setCustomerRepresentante(order.customer.representante || '');
        setHeader({
          customerName: order.customer.name,
          pedido: order.pedido?.toString() || '',
          entryDate: toLocalDatetime(new Date(order.entryDate)),
          billingDate: order.billingDate ? toLocalDate(new Date(order.billingDate)) : '',
          notes: order.notes || '',
        });
        setItems(order.items?.map((item: ServiceOrderItem) => ({
          _key: item.id,
          productName: item.product.name,
          productColor: item.color || '',
          productFabric: item.fabric || '',
          quantity: item.quantity,
          problemDesc: item.problemDesc,
          resolution: item.resolution || '',
          price: item.price?.toString() || '',
          chargeable: item.chargeable === true ? 'sim' : item.chargeable === false ? 'nao' : '',
          existingImages: getImageList(item),
          newImageFiles: [],
          newImagePreviews: [],
        })) || [createEmptyItem()]);
      });
    }
  }, [editId]);

  const searchCustomers = useCallback(async (q: string) => {
    if (q.length < 1) { setCustomers([]); return; }
    const res = await customersApi.list(q);
    setCustomers(res);
  }, []);

  const searchProducts = useCallback(async (q: string) => {
    if (q.length < 1) { setProducts([]); return; }
    const res = await productsApi.list(q);
    setProducts(res);
  }, []);

  const searchCores = useCallback(async (q: string) => {
    if (q.length < 1) { setRegisterCores([]); return; }
    const res = await assistenciaRegistersApi.cores.list(q);
    setRegisterCores(res);
  }, []);

  const searchDetalhes = useCallback(async (q: string) => {
    if (q.length < 1) { setRegisterDetalhes([]); return; }
    const res = await assistenciaRegistersApi.detalhes.list(q);
    setRegisterDetalhes(res);
  }, []);

  const handleItemFiles = (idx: number, files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], newImageFiles: [...next[idx].newImageFiles, ...newFiles] };
      return next;
    });
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        setItems(prev => {
          const next = [...prev];
          const item = next[idx];
          if (!item.newImagePreviews.includes(reader.result as string)) {
            item.newImagePreviews = [...item.newImagePreviews, reader.result as string];
          }
          return [...next];
        });
      };
      reader.readAsDataURL(f);
    });
  };

  const removeNewImage = (itemIdx: number, imgIdx: number) => {
    setItems(prev => {
      const next = [...prev];
      next[itemIdx] = {
        ...next[itemIdx],
        newImageFiles: next[itemIdx].newImageFiles.filter((_, i) => i !== imgIdx),
        newImagePreviews: next[itemIdx].newImagePreviews.filter((_, i) => i !== imgIdx),
      };
      return next;
    });
  };

  const removeExistingImage = (itemIdx: number, imgIdx: number) => {
    setItems(prev => {
      const next = [...prev];
      next[itemIdx] = {
        ...next[itemIdx],
        existingImages: next[itemIdx].existingImages.filter((_, i) => i !== imgIdx),
      };
      return next;
    });
  };

  const addItem = () => setItems(prev => [...prev, createEmptyItem()]);
  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const processedItems = await Promise.all(items.map(async (item) => {
      let urls = [...item.existingImages];
      if (item.newImageFiles.length > 0) {
        const newUrls = await uploadApi.uploadMultiple(item.newImageFiles);
        urls = [...urls, ...newUrls];
      }
      return {
        _key: item._key,
        productName: item.productName,
        productColor: item.productColor || undefined,
        productFabric: item.productFabric || undefined,
        quantity: item.quantity,
        problemDesc: item.problemDesc,
        resolution: item.resolution || undefined,
        price: item.price ? parseFloat(item.price) : undefined,
        chargeable: item.chargeable === 'sim' ? true : item.chargeable === 'nao' ? false : undefined,
        images: urls.length > 0 ? JSON.stringify(urls) : undefined,
      };
    }));

    if (editId) {
      const existing = await serviceOrdersApi.get(editId);
      const existingItemIds = new Set(existing.items?.map(i => i.id) || []);
      const currentKeys = new Set(processedItems.map(i => i._key));
      const toDelete = existing.items?.filter(i => !currentKeys.has(i.id)).map(i => i.id) || [];

      const itemsPayload = [
        ...processedItems.filter(i => existingItemIds.has(i._key)).map(i => ({
          id: i._key,
          productName: i.productName,
          productColor: i.productColor,
          productFabric: i.productFabric,
          quantity: i.quantity,
          problemDesc: i.problemDesc,
          resolution: i.resolution,
          price: i.price,
          chargeable: i.chargeable,
          images: i.images,
        })),
        ...processedItems.filter(i => !existingItemIds.has(i._key)).map(i => ({
          productName: i.productName,
          productColor: i.productColor,
          productFabric: i.productFabric,
          quantity: i.quantity,
          problemDesc: i.problemDesc,
          price: i.price,
          chargeable: i.chargeable,
          images: i.images,
        })),
        ...toDelete.map(id => ({ _delete: id })),
      ];

      await serviceOrdersApi.update(editId, {
        pedido: header.pedido ? parseInt(header.pedido) : undefined,
        customerName: header.customerName,
        entryDate: header.entryDate,
        billingDate: header.billingDate || undefined,
        notes: header.notes || undefined,
        items: itemsPayload,
      });
    } else {
      await serviceOrdersApi.create({
        pedido: header.pedido ? parseInt(header.pedido) : undefined,
        customerName: header.customerName,
        entryDate: header.entryDate,
        billingDate: header.billingDate || undefined,
        notes: header.notes || undefined,
        items: processedItems.map(i => ({
          productName: i.productName,
          productColor: i.productColor,
          productFabric: i.productFabric,
          quantity: i.quantity,
          problemDesc: i.problemDesc,
          price: i.price,
          chargeable: i.chargeable,
          images: i.images,
        })),
      });
    }

    setUploading(false);
    onSaved();
    } catch (err: any) {
      setUploading(false);
      alert(err.message || 'Erro ao salvar pedido de assistência');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-6 pb-6">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 pb-0 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Novo'} Pedido de Assistência</h2>
            {editPedido && <span className="text-sm text-gray-400">Pedido #{editPedido}</span>}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* ── Header ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pedido (Mário)</label>
              <input type="number" value={header.pedido}
                onChange={(e) => setHeader({ ...header, pedido: e.target.value })}
                placeholder="Número do pedido" className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Faturamento</label>
              <input type="date" value={header.billingDate}
                onChange={(e) => setHeader({ ...header, billingDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <input type="text" value={header.customerName}
                onChange={(e) => { setHeader({ ...header, customerName: e.target.value }); setShowCustomers(true); searchCustomers(e.target.value); }}
                onFocus={() => setShowCustomers(true)}
                onBlur={() => setTimeout(() => setShowCustomers(false), 200)}
                placeholder="Digite o nome do cliente" className="w-full border rounded-lg px-3 py-2 text-sm" required />
              {showCustomers && customers.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                  {customers.map((c) => (
                    <button type="button" key={c.id}
                      onClick={() => { setHeader({ ...header, customerName: c.name }); setCustomerRepresentante(c.representante || ''); setShowCustomers(false); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50">
                      {c.name} {c.representante ? `- Rep: ${c.representante}` : ''}
                    </button>
                  ))}
                </div>
              )}
              {customerRepresentante && <p className="text-xs text-gray-500 mt-1">Representante: {customerRepresentante}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data/Hora Entrada *</label>
              <input type="datetime-local" value={header.entryDate}
                onChange={(e) => setHeader({ ...header, entryDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={header.notes}
              onChange={(e) => setHeader({ ...header, notes: e.target.value })}
              placeholder="Observações adicionais" className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
          </div>

          {/* ── Items ── */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">Produtos</h3>
              <button type="button" onClick={addItem}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 border font-medium">
                + Adicionar Produto
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={item._key} className="border rounded-lg p-4 mb-3 bg-gray-50 relative">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Produto #{idx + 1}</h4>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium">Remover</button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
                    <input type="text" value={item.productName}
                      onChange={(e) => {
                        const next = [...items]; next[idx] = { ...next[idx], productName: e.target.value };
                        setItems(next); setShowProducts(idx); searchProducts(e.target.value);
                      }}
                      onFocus={() => setShowProducts(idx)}
                      onBlur={() => setTimeout(() => setShowProducts(-1), 200)}
                      placeholder="Nome do produto" className="w-full border rounded-lg px-3 py-2 text-sm" required />
                    {showProducts === idx && products.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                        {products.map((p) => (
                          <button type="button" key={p.id}
                            onClick={() => {
                              const next = [...items]; next[idx] = { ...next[idx], productName: p.name, productColor: p.color || '', productFabric: p.fabric || '' };
                              setItems(next); setShowProducts(-1);
                            }}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50">
                            {p.name} {p.color ? `- ${p.color}` : ''} {p.fabric ? `[${p.fabric}]` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cor</label>
                    <input type="text" value={item.productColor}
                      onChange={(e) => {
                        const next = [...items]; next[idx] = { ...next[idx], productColor: e.target.value };
                        setItems(next); setShowCores(idx); searchCores(e.target.value);
                      }}
                      onFocus={() => setShowCores(idx)}
                      onBlur={() => setTimeout(() => setShowCores(-1), 200)}
                      placeholder="Cor" className="w-full border rounded-lg px-3 py-2 text-sm" />
                    {showCores === idx && registerCores.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                        {registerCores.map((c) => (
                          <button type="button" key={c.id}
                            onClick={() => { const next = [...items]; next[idx] = { ...next[idx], productColor: c.nome }; setItems(next); setShowCores(-1); }}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50">{c.nome}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Detalhe</label>
                    <input type="text" value={item.productFabric}
                      onChange={(e) => {
                        const next = [...items]; next[idx] = { ...next[idx], productFabric: e.target.value };
                        setItems(next); setShowDetalhes(idx); searchDetalhes(e.target.value);
                      }}
                      onFocus={() => setShowDetalhes(idx)}
                      onBlur={() => setTimeout(() => setShowDetalhes(-1), 200)}
                      placeholder="Detalhe" className="w-full border rounded-lg px-3 py-2 text-sm" />
                    {showDetalhes === idx && registerDetalhes.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                        {registerDetalhes.map((d) => (
                          <button type="button" key={d.id}
                            onClick={() => { const next = [...items]; next[idx] = { ...next[idx], productFabric: d.nome }; setItems(next); setShowDetalhes(-1); }}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50">{d.nome}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade</label>
                    <input type="number" value={item.quantity}
                      onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], quantity: parseInt(e.target.value) || 1 }; setItems(next); }}
                      min={1} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  {(editId || item.price || item.chargeable) && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
                        {user?.email === FINANCEIRO_EMAIL ? (
                          <input type="number" step="0.01" value={item.price}
                            onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], price: e.target.value }; setItems(next); }}
                            placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        ) : (
                          <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                            {item.price ? `R$ ${parseFloat(item.price).toFixed(2)}` : '-'}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cobrar?</label>
                        {user?.email === FINANCEIRO_EMAIL ? (
                          <select value={item.chargeable}
                            onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], chargeable: e.target.value }; setItems(next); }}
                            className="w-full border rounded-lg px-3 py-2 text-sm">
                            <option value="">Pendente</option>
                            <option value="sim">Sim</option>
                            <option value="nao">Não (Gratuito)</option>
                          </select>
                        ) : (
                          <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                            {item.chargeable === 'sim' ? 'Sim' : item.chargeable === 'nao' ? 'Não (Gratuito)' : 'Pendente'}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Solução</label>
                        <input type="text" value={item.resolution}
                          onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], resolution: e.target.value }; setItems(next); }}
                          placeholder="Solução aplicada" className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descrição do Problema *</label>
                  <textarea value={item.problemDesc}
                    onChange={(e) => { const next = [...items]; next[idx] = { ...next[idx], problemDesc: e.target.value }; setItems(next); }}
                    placeholder="Descreva o problema" className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} required />
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Imagens do Produto</label>
                  <input type="file" accept="image/*" multiple
                    onChange={(e) => handleItemFiles(idx, e.target.files)}
                    className="text-sm w-full" />
                  {(item.newImagePreviews.length > 0 || item.existingImages.length > 0) && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {item.existingImages.map((url, i) => (
                        <div key={`e-${i}`} className="relative group">
                          <img src={url} alt="" className="w-full h-20 object-cover rounded border" />
                          <button type="button" onClick={() => removeExistingImage(idx, i)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100">&times;</button>
                        </div>
                      ))}
                      {item.newImagePreviews.map((preview, i) => (
                        <div key={`n-${i}`} className="relative group">
                          <img src={preview} alt="" className="w-full h-20 object-cover rounded border" />
                          <button type="button" onClick={() => removeNewImage(idx, i)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100">&times;</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={uploading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {uploading ? 'Enviando...' : editId ? 'Salvar' : 'Criar'} Pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
