'use client';

import { useEffect, useState } from 'react';
import { customersApi, Customer } from '@/services/api';
import { useAuth } from '@/services/auth';

export default function ClientesPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Customer | null>(null);

  const load = () => customersApi.list(search || undefined).then(setCustomers);

  useEffect(() => { if (user) load(); }, [search, user]);

  if (!user) return null;

  const handleDelete = async (id: string) => {
    if (confirm('Excluir cliente? Todas as ordens associadas serão perdidas.')) {
      await customersApi.delete(id);
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button onClick={() => { setShowForm(true); setEditData(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Novo Cliente
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />

      {showForm && (
        <CustomerForm
          editData={editData}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer">
            <div className="flex justify-between items-start">
              <div onClick={() => setSelected(selected?.id === c.id ? null : c)} className="flex-1">
                <h3 className="font-semibold text-gray-800">{c.name}</h3>
                {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
                {c.representante && <p className="text-sm text-gray-500">Rep: {c.representante}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditData(c); setShowForm(true); }} className="text-blue-600 text-sm hover:underline">Editar</button>
                <button onClick={() => handleDelete(c.id)} className="text-red-600 text-sm hover:underline">Excluir</button>
              </div>
            </div>

            {selected?.id === c.id && (
              <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                <p className="text-xs text-gray-400 mt-1">Cadastro: {new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </div>
        ))}
        {customers.length === 0 && (
          <p className="col-span-2 text-center text-gray-400 py-8">Nenhum cliente encontrado</p>
        )}
      </div>
    </div>
  );
}

function CustomerForm({ editData, onClose, onSaved }: { editData: Customer | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: editData?.name || '',
    phone: editData?.phone || '',
    representante: editData?.representante || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editData) {
      await customersApi.update(editData.id, form);
    } else {
      await customersApi.create(form);
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-10">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{editData ? 'Editar' : 'Novo'} Cliente</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(XX) XXXXX-XXXX" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Representante</label>
              <input type="text" value={form.representante} onChange={(e) => setForm({ ...form, representante: e.target.value })} placeholder="Nome do representante" className="w-full border rounded-lg px-3 py-2 text-sm" />
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
