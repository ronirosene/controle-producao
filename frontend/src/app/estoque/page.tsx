'use client';

import { useEffect, useState } from 'react';
import { produtosApi, servicosApi } from '@/services/api';
import { useAuth } from '@/services/auth';

const SETORES = ['marcenaria', 'lixa', 'pintura', 'embalagem'];

export default function PesquisaPage() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [moveForm, setMoveForm] = useState<any>(null);
  const [search, setSearch] = useState('');

  const load = () => produtosApi.posicaoAtual().then(setProdutos);

  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return null;

  const filtered = search
    ? produtos.filter((p) =>
        (p.produto_nome || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.servico_nome || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.setor || '').toLowerCase().includes(search.toLowerCase())
      )
    : produtos;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Pesquisa</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Novo Produto
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por produto, serviço ou setor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />

      {showForm && (
        <NovoProdutoForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {moveForm && (
        <MoverForm
          produto={moveForm}
          onClose={() => setMoveForm(null)}
          onSaved={() => { setMoveForm(null); load(); }}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b bg-gray-50">
            <tr className="text-gray-500">
              <th className="p-3">Serviço</th>
              <th className="p-3">Produto</th>
              <th className="p-3">Qtd Total</th>
              <th className="p-3">Setor</th>
              <th className="p-3">Qtd</th>
              <th className="p-3">Dias no Setor</th>
              <th className="p-3">Obs</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const sectorColor: Record<string, string> = {
                marcenaria: 'bg-yellow-100 text-yellow-800',
                lixa: 'bg-orange-100 text-orange-800',
                pintura: 'bg-purple-100 text-purple-800',
                embalagem: 'bg-green-100 text-green-800',
              };
              return (
                <tr key={p.produto_id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{p.servico_nome}</td>
                  <td className="p-3">{p.produto_nome}</td>
                  <td className="p-3">{p.qtd_total}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sectorColor[p.setor] || 'bg-gray-100'}`}>
                      {p.setor}
                    </span>
                  </td>
                  <td className="p-3 font-bold">{p.quantidade}</td>
                  <td className="p-3">{p.dias_no_setor != null ? `${p.dias_no_setor}d` : '-'}</td>
                  <td className="p-3 text-gray-500 max-w-[150px] truncate">{p.observacao || '-'}</td>
                  <td className="p-3">
                    <button
                      onClick={() => setMoveForm(p)}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      Mover
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-gray-400">Nenhum produto encontrado nos setores</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NovoServicoSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [servicos, setServicos] = useState<any[]>([]);
  useEffect(() => { servicosApi.list().then(setServicos); }, []);
  return (
    <select value={value || ''} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
      <option value="">Selecione um serviço</option>
      {servicos.map((s) => (
        <option key={s.id} value={s.id}>{s.nome}</option>
      ))}
    </select>
  );
}

function NovoProdutoForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ servico_id: 0, nome: '', cor: '', detalhe: '', observacao: '', qtd_total: 1 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.servico_id) { alert('Selecione um serviço'); return; }
    await produtosApi.create(form);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-10">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Novo Produto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Serviço *</label>
            <NovoServicoSelect value={form.servico_id} onChange={(v) => setForm({ ...form, servico_id: v })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Produto *</label>
            <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Cor</label>
              <input type="text" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Detalhe</label>
              <input type="text" value={form.detalhe} onChange={(e) => setForm({ ...form, detalhe: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade</label>
            <input type="number" value={form.qtd_total} onChange={(e) => setForm({ ...form, qtd_total: parseInt(e.target.value) || 1 })} min={1} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observação</label>
            <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Criar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoverForm({ produto, onClose, onSaved }: { produto: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    setor_origem: produto.setor || '',
    setor_destino: '',
    quantidade: produto.quantidade || 1,
    observacao: '',
  });

  const destinos = SETORES.filter((s) => s !== form.setor_origem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.setor_destino) { alert('Selecione o setor de destino'); return; }
    try {
      await produtosApi.mover(produto.produto_id, form);
      onSaved();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-10">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Mover: {produto.produto_nome}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Serviço: <strong>{produto.servico_nome}</strong> | Setor atual: <strong>{produto.setor}</strong> | Qtd: <strong>{produto.quantidade}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Setor de Origem</label>
            <input type="text" value={form.setor_origem} disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Setor de Destino *</label>
            <select value={form.setor_destino} onChange={(e) => setForm({ ...form, setor_destino: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Selecione...</option>
              {destinos.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade</label>
            <input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: parseInt(e.target.value) || 1 })} min={1} max={produto.quantidade} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observação</label>
            <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Motivo da movimentação" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Mover</button>
          </div>
        </form>
      </div>
    </div>
  );
}
