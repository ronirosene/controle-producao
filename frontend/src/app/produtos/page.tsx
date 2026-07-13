'use client';

import { useEffect, useState } from 'react';
import { productsApi, Product } from '@/services/api';
import { useAuth } from '@/services/auth';

export default function ProdutosPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Product | null>(null);

  const load = () => productsApi.list(search || undefined).then(setProducts);

  useEffect(() => { if (user) load(); }, [search, user]);

  if (!user) return null;

  const handleDelete = async (id: string) => {
    if (confirm('Excluir produto?')) {
      await productsApi.delete(id);
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
        <button onClick={() => { setShowForm(true); setEditData(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Novo Produto
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar produto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />

      {showForm && (
        <ProductForm
          editData={editData}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div onClick={() => setSelected(selected?.id === p.id ? null : p)} className="flex-1 cursor-pointer">
                <h3 className="font-semibold text-gray-800">{p.name}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditData(p); setShowForm(true); }} className="text-blue-600 text-sm hover:underline">Editar</button>
                <button onClick={() => handleDelete(p.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
              </div>
            </div>
            {selected?.id === p.id && (
              <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                {p.notes && <p>Obs: {p.notes}</p>}
                <p className="text-xs text-gray-400 mt-1">Cadastro: {new Date(p.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && (
          <p className="col-span-3 text-center text-gray-400 py-8">Nenhum produto encontrado</p>
        )}
      </div>
    </div>
  );
}

function ProductForm({ editData, onClose, onSaved }: { editData: Product | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: editData?.name || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editData) {
      await productsApi.update(editData.id, form);
    } else {
      await productsApi.create(form);
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-10">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{editData ? 'Editar' : 'Novo'} Produto</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>


            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editData ? 'Salvar' : 'Criar'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
