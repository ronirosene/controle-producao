'use client';

import { useEffect, useState, useCallback } from 'react';
import { servicosApi, urgentesApi } from '@/services/api';
import { useAuth } from '@/services/auth';

export default function UrgentesPage() {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<any[]>([]);
  const [urgentes, setUrgentes] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [servicoData, setServicoData] = useState<Record<number, any>>({});
  const [loadingServico, setLoadingServico] = useState<Set<number>>(new Set());
  const [newDates, setNewDates] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    servicosApi.list().then(setServicos);
    urgentesApi.list().then(setUrgentes);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const toggleExpand = async (servicoId: number) => {
    if (expandedId === servicoId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(servicoId);
    if (!servicoData[servicoId]) {
      setLoadingServico((prev) => new Set(prev).add(servicoId));
      try {
        const data = await servicosApi.get(servicoId);
        setServicoData((prev) => ({ ...prev, [servicoId]: data }));
      } catch { }
      setLoadingServico((prev) => { const n = new Set(prev); n.delete(servicoId); return n; });
    }
  };

  const getUrgente = (produtoId: number) => {
    return urgentes.find((u) => u.produtoId === produtoId);
  };

  const handleToggle = async (produtoId: number, checked: boolean) => {
    setSaving((prev) => new Set(prev).add(produtoId));
    try {
      if (checked) {
        const date = newDates[produtoId] || new Date().toISOString().split('T')[0];
        await urgentesApi.create({ produto_id: produtoId, data_despacho: date });
      } else {
        const item = getUrgente(produtoId);
        if (item) await urgentesApi.delete(item.id);
      }
      await urgentesApi.list().then(setUrgentes);
    } catch { }
    setSaving((prev) => { const n = new Set(prev); n.delete(produtoId); return n; });
  };

  if (!user) return null;

  const urgenteIds = new Set(urgentes.map((u) => u.produtoId));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Produtos Urgentes</h1>
        <span className="text-sm text-gray-500">{urgentes.length} produto(s) urgente(s)</span>
      </div>

      <div className="space-y-3">
        {servicos.map((s) => {
          const isExpanded = expandedId === s.id;
          const isLoading = loadingServico.has(s.id);
          const data = servicoData[s.id];
          const produtos = data?.produtos || [];
          const totalUrgente = produtos.filter((p: any) => p.produtosUrgentes?.length > 0).length;

          return (
            <div key={s.id} className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => toggleExpand(s.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
                  <span className="font-semibold text-gray-800">{s.nome}</span>
                  {totalUrgente > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>&#9888;</span> {totalUrgente}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{s.total_produtos || 0} produtos</span>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  {isLoading ? (
                    <div className="p-6 text-center text-sm text-gray-400">Carregando produtos...</div>
                  ) : produtos.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">Nenhum produto neste serviço</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50">
                          <tr className="text-gray-500 text-xs">
                            <th className="p-3 w-10">Urgente</th>
                            <th className="p-3">Produto</th>
                            <th className="p-3 w-20">Qtd</th>
                            <th className="p-3 w-44">Data Despacho</th>
                            <th className="p-3 w-20">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {produtos.map((p: any) => {
                            const urg = getUrgente(p.id);
                            const isUrg = !!urg;
                            const isSaving = saving.has(p.id);
                            return (
                              <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isUrg ? 'bg-red-50' : ''}`}>
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isUrg}
                                    disabled={isSaving}
                                    onChange={(e) => handleToggle(p.id, e.target.checked)}
                                    className="w-4 h-4 text-red-600 rounded cursor-pointer"
                                  />
                                </td>
                                <td className="p-3 font-medium">{p.nome}</td>
                                <td className="p-3 text-gray-500">{p.qtdTotal}</td>
                                <td className="p-3">
                                  <input
                                    type="date"
                                    value={urg ? urg.dataDespacho.split('T')[0] : (newDates[p.id] || '')}
                                    onChange={(e) => setNewDates((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                    className={`w-full border rounded px-2 py-1 text-xs ${isUrg ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                    disabled={isUrg && !newDates[p.id]}
                                  />
                                </td>
                                <td className="p-3">
                                  {isSaving ? (
                                    <span className="text-xs text-gray-400">salvando...</span>
                                  ) : isUrg ? (
                                    <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                                      <span>&#9888;</span> Urgente
                                    </span>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {servicos.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            Nenhum serviço encontrado
          </div>
        )}
      </div>
    </div>
  );
}