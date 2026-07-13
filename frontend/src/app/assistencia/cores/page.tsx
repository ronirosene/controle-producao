'use client';

import { useEffect, useState } from 'react';
import { assistenciaRegistersApi } from '@/services/api';
import { useAuth } from '@/services/auth';

export default function CoresPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const load = () => assistenciaRegistersApi.cores.list(search || undefined).then(setItems);
  useEffect(() => { if (user) load(); }, [search, user]);

  if (!user) return null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await assistenciaRegistersApi.cores.create(newName.trim());
    setNewName('');
    load();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await assistenciaRegistersApi.cores.update(id, editName.trim());
    setEditId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Excluir cor?')) {
      await assistenciaRegistersApi.cores.delete(id);
      load();
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Cores</h1>

      <div className="flex gap-2">
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova cor..." className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">Adicionar</button>
      </div>

      <input type="text" placeholder="Buscar..." value={search}
        onChange={(e) => setSearch(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b bg-gray-50">
            <tr className="text-gray-500">
              <th className="p-3">Nome</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  {editId === item.id ? (
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="border rounded px-2 py-1 text-sm w-full" />
                  ) : item.nome}
                </td>
                <td className="p-3 flex gap-2">
                  {editId === item.id ? (
                    <>
                      <button onClick={() => handleUpdate(item.id)} className="text-green-600 hover:underline text-sm">Salvar</button>
                      <button onClick={() => setEditId(null)} className="text-gray-500 hover:underline text-sm">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(item.id); setEditName(item.nome); }} className="text-blue-600 hover:underline text-sm">Editar</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline text-sm">Excluir</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-gray-400">Nenhuma cor cadastrada</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
