'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { produtosApi } from '@/services/api';
import { useAuth } from '@/services/auth';

export default function ObservacoesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [obs, setObs] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const load = () => produtosApi.observacoes.list().then(setObs);

  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return null;

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta observação?')) return;
    await produtosApi.observacoes.delete(id);
    load();
  };

  const handleEdit = async () => {
    if (!editId || !editText.trim()) return;
    await produtosApi.observacoes.update(editId, { observacao: editText });
    setEditId(null);
    setEditText('');
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Observações Pendentes</h1>
      </div>

      <div className="space-y-3">
        {obs.map((o) => (
          <div key={o.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">
                    {o.created_at ? new Date(o.created_at + 'Z').toLocaleString('pt-BR') : ''}
                  </span>
                  {o.data_saida && (
                    <span className="text-xs text-gray-400">| Saída: {o.data_saida}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {o.produto?.servico?.nome || 'Serviço'}
                  </span>
                  <span className="text-xs font-medium text-gray-600">
                    {o.produto?.nome || 'Produto'}
                  </span>
                  <span className="text-xs text-gray-400">| Setor: {o.setor}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{o.observacao}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/servicos?servicoId=${o.produto?.servicoId}&produtoId=${o.produto?.id}`)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-300 hover:border-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg transition text-center"
                >
                  Ir para
                </button>
                <button
                  onClick={() => { setEditId(o.id); setEditText(o.observacao); }}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(o.id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
        {obs.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            Nenhuma observação pendente
          </div>
        )}
      </div>

      {editId !== null && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-10">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Editar Observação</h2>
              <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={4}
            />
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setEditId(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleEdit} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
