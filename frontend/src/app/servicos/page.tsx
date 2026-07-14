'use client';

import { useEffect, useState } from 'react';
import { servicosApi, produtosApi } from '@/services/api';
import { useAuth } from '@/services/auth';

const SETORES_ORDEM = ['marcenaria', 'lixa', 'pintura', 'embalagem'];
const SETOR_LABELS: Record<string, string> = {
  marcenaria: 'Marcenaria',
  lixa: 'Lixa',
  pintura: 'Pintura',
  embalagem: 'Embalagem',
};
const SETOR_COLORS: Record<string, string> = {
  marcenaria: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  lixa: 'bg-orange-100 text-orange-800 border-orange-300',
  pintura: 'bg-purple-100 text-purple-800 border-purple-300',
  embalagem: 'bg-green-100 text-green-800 border-green-300',
};

export default function ServicosPage() {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<any[]>([]);
  const [selectedServicoId, setSelectedServicoId] = useState<number | null>(null);
  const [highlightProdutoId, setHighlightProdutoId] = useState<number | null>(null);

  const load = () => servicosApi.list().then(setServicos);
  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('servicoId');
    const pid = params.get('produtoId');
    if (sid) {
      setSelectedServicoId(parseInt(sid));
      if (pid) setHighlightProdutoId(parseInt(pid));
    }
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Serviços de Produção</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b bg-gray-50">
            <tr className="text-gray-500">
              <th className="p-3">Nome</th>
              <th className="p-3">Criação</th>
              <th className="p-3">Início</th>
              <th className="p-3">Produtos</th>
              <th className="p-3">Peças</th>
              <th className="p-3">Finalizados</th>
              <th className="p-3">Progresso</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {servicos.map((s) => {
              const progresso = s.total_pecas > 0
                ? Math.min(100, Math.round((s.pecas_finalizadas / s.total_pecas) * 100))
                : 0;
              return (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-bold">{s.nome}</td>
                  <td className="p-3 text-gray-600">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="p-3 text-gray-600">
                    {s.data_inicio ? new Date(s.data_inicio).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="p-3">{s.total_produtos}</td>
                  <td className="p-3">{s.total_pecas}</td>
                  <td className="p-3 font-medium text-green-700">{s.produtos_finalizados}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${progresso >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{progresso}%</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setSelectedServicoId(s.id)}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              );
            })}
            {servicos.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-gray-400">Nenhum serviço encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedServicoId && (
        <ServicoDetailView
          servicoId={selectedServicoId}
          highlightProdutoId={highlightProdutoId}
          onClose={() => { setSelectedServicoId(null); setHighlightProdutoId(null); window.history.replaceState({}, '', '/servicos'); }}
          onRefresh={load}
        />
      )}
    </div>
  );
}

function getSetorInfo(produto: any) {
  const movs = produto.movimentacoes || [];
  const info: Record<string, { quantidade: number; dataEntrada?: string; dataSaida?: string; createdAt?: string }> = {};
  for (const m of movs) {
    if (m.quantidade > 0) {
      info[m.setor] = { quantidade: m.quantidade, dataEntrada: m.dataEntrada, dataSaida: m.dataSaida, createdAt: m.created_at || m.createdAt };
    }
  }
  const current = [...movs].reverse().find((m: any) => m.quantidade > 0);
  return {
    info,
    currentSetor: current?.setor || null,
    currentQtd: current?.quantidade || 0,
  };
}

function ServicoDetailView({ servicoId, highlightProdutoId, onClose, onRefresh }: { servicoId: number; highlightProdutoId?: number | null; onClose: () => void; onRefresh: () => void }) {
  const { user } = useAuth();
  const [servico, setServico] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [moveForm, setMoveForm] = useState<any>(null);
  const [filterSetor, setFilterSetor] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editingDataInicio, setEditingDataInicio] = useState(false);
  const [editDataInicio, setEditDataInicio] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isAdmin = user?.email === 'ronyrosene@gmail.com';

  const loadServico = () => {
    setLoading(true);
    servicosApi.get(servicoId).then((data) => {
      setServico(data);
      setLoading(false);
    });
  };

  useEffect(() => { loadServico(); }, [servicoId]);

  const handleMove = async (produtoId: number, setor_origem: string, setor_destino: string, quantidade: number, observacao: string) => {
    try {
      await produtosApi.mover(produtoId, { setor_origem, setor_destino, quantidade, observacao });
      setMoveForm(null);
      await produtosApi.estoque(produtoId, {}).catch(() => {});
      loadServico();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleEstoque = async (produtoId: number) => {
    try {
      await produtosApi.estoque(produtoId, {});
      loadServico();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditNome = async () => {
    if (!editNome.trim()) return;
    try {
      await servicosApi.update(servicoId, { nome: editNome.trim() });
      setEditingNome(false);
      loadServico();
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditDataInicio = async () => {
    if (!editDataInicio.trim()) return;
    try {
      await servicosApi.update(servicoId, { dataInicio: editDataInicio.trim() });
      setEditingDataInicio(false);
      loadServico();
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async () => {
    try {
      await servicosApi.delete(servicoId);
      onClose();
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleFinishAll = async () => {
    if (!servico?.produtos) return;
    try {
      for (const p of servico.produtos) {
        const { currentSetor, currentQtd } = getSetorInfo(p);
        if (!currentSetor) continue;
        const idx = SETORES_ORDEM.indexOf(currentSetor);
        if (idx >= 0 && idx < SETORES_ORDEM.length - 1) {
          await produtosApi.mover(p.id, {
            setor_origem: currentSetor,
            setor_destino: SETORES_ORDEM[idx + 1],
            quantidade: currentQtd,
          });
        }
      }
      loadServico();
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!servico) return null;

  const produtosEmAberto = servico.produtos?.filter((p: any) => {
    const { currentSetor } = getSetorInfo(p);
    return currentSetor && currentSetor !== 'embalagem';
  }) || [];

  const produtosFiltrados = filterSetor
    ? servico.produtos?.filter((p: any) => {
        const { currentSetor } = getSetorInfo(p);
        return currentSetor === filterSetor;
      })
    : servico.produtos;

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-6 pb-6">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] max-w-7xl flex flex-col max-h-[90vh]">
        <div className="p-6 pb-0 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              {editingNome ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    className="border rounded px-2 py-1 text-lg font-bold"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditNome(); if (e.key === 'Escape') setEditingNome(false); }}
                  />
                  <button onClick={handleEditNome} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Salvar</button>
                  <button onClick={() => setEditingNome(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800">Serviço: {servico.nome}</h2>
                  {isAdmin && (
                    <button
                      onClick={() => { setEditNome(servico.nome); setEditingNome(true); }}
                      className="text-xs text-blue-600 hover:text-blue-800 border border-blue-300 px-2 py-0.5 rounded"
                    >
                      Editar
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {servico.produtos?.length || 0} produtos · Criado {servico.createdAt ? new Date(servico.createdAt).toLocaleString('pt-BR') : '-'}
                {editingDataInicio ? (
                  <span className="inline-flex items-center gap-1 ml-2">
                    <span className="text-gray-400">· Início</span>
                    <input type="date" value={editDataInicio}
                      onChange={(e) => setEditDataInicio(e.target.value)}
                      className="border rounded px-1 py-0.5 text-xs"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEditDataInicio(); if (e.key === 'Escape') setEditingDataInicio(false); }} />
                    <button onClick={handleEditDataInicio} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">OK</button>
                    <button onClick={() => setEditingDataInicio(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                  </span>
                ) : (
                  <>
                    {servico.dataInicio
                      ? ` · Início ${new Date(servico.dataInicio).toLocaleDateString('pt-BR')}`
                      : ' · Início: (pendente)'}
                    {isAdmin && (
                      <button
                        onClick={() => { setEditDataInicio(servico.dataInicio || ''); setEditingDataInicio(true); }}
                        className="text-xs text-blue-600 hover:text-blue-800 border border-blue-300 px-1.5 py-0.5 rounded ml-1"
                      >
                        {servico.dataInicio ? 'Alterar' : 'Definir'}
                      </button>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {produtosEmAberto.length > 0 && (
                <button
                  onClick={handleFinishAll}
                  className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                >
                  Avançar Todos ({produtosEmAberto.length})
                </button>
              )}
              {isAdmin && !confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 font-medium"
                >
                  Excluir
                </button>
              )}
              {confirmDelete && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-1.5">
                  <span className="text-sm text-red-700 font-medium">Excluir serviço?</span>
                  <button onClick={handleDelete} className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 font-medium">Sim</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-600 hover:text-gray-800">Não</button>
                </div>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-2">&times;</button>
            </div>
          </div>

          {filterSetor && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span>Filtrando por: <strong className="text-gray-700">{SETOR_LABELS[filterSetor]}</strong></span>
              <button onClick={() => setFilterSetor(null)} className="text-blue-600 hover:underline text-xs">Limpar filtro</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6 pt-4">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="p-3 text-gray-500 font-semibold whitespace-nowrap sticky left-0 bg-gray-50 z-20">Produto</th>
                <th className="p-3 text-gray-500 font-semibold whitespace-nowrap">Cor</th>
                <th className="p-3 text-gray-500 font-semibold whitespace-nowrap">Detalhe</th>
                  <th className="p-3 text-gray-500 font-semibold whitespace-nowrap">Qtd</th>
                  <th className="p-3 text-gray-500 font-semibold whitespace-nowrap text-center w-16">Estoque</th>
                {SETORES_ORDEM.map((setor) => (
                  <th key={setor} className="p-3 text-center font-semibold whitespace-nowrap min-w-[120px]">
                    <button
                      onClick={() => setFilterSetor(filterSetor === setor ? null : setor)}
                      className={`px-3 py-1 rounded text-xs transition-all cursor-pointer
                        ${SETOR_COLORS[setor]}
                        ${filterSetor === setor ? 'ring-2 ring-offset-1 ring-blue-500 scale-110 shadow-md' : 'opacity-60 hover:opacity-100'}
                      `}
                    >
                      {SETOR_LABELS[setor]}
                      {filterSetor === setor && (
                        <span className="ml-1.5 text-blue-700 font-bold">&times;</span>
                      )}
                    </button>
                  </th>
                ))}
                <th className="p-3 text-gray-500 font-semibold whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados?.map((p: any) => {
                const { info, currentSetor, currentQtd } = getSetorInfo(p);
                const idx = currentSetor ? SETORES_ORDEM.indexOf(currentSetor) : -1;
                const canMove = idx >= 0 && idx < SETORES_ORDEM.length - 1;
                const isFinished = currentSetor === 'embalagem';

                return (
                  <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${p.emEstoque === 1 ? 'font-bold bg-yellow-50' : ''} ${highlightProdutoId === p.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                    <td className={`p-3 whitespace-nowrap sticky left-0 border-r border-gray-100 z-10 ${p.emEstoque === 1 ? 'bg-yellow-50 font-bold' : 'bg-white hover:bg-gray-50 font-medium'}`} style={{ minWidth: 200, maxWidth: 300 }}>
                      <div className="truncate flex items-center gap-1.5" title={p.nome}>
                        {p.produtosUrgentes?.length > 0 && (
                          <span
                            className="text-red-500 font-bold text-base cursor-help shrink-0"
                            title={`Prioridade - Carregar até: ${new Date(p.produtosUrgentes[0].dataDespacho + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                          >&#9888;</span>
                        )}
                        <span className="truncate">{p.nome}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 whitespace-nowrap">{p.cor || '-'}</td>
                    <td className="p-3 text-gray-600 whitespace-nowrap max-w-[200px] truncate" title={p.detalhe || ''}>{p.detalhe || '-'}</td>
                    <td className="p-3 font-bold whitespace-nowrap">{p.qtdTotal}</td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={p.emEstoque === 1}
                        onChange={() => handleToggleEstoque(p.id)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </td>
                    {SETORES_ORDEM.map((setor) => {
                      const s = info[setor];
                      const isCurrent = setor === currentSetor;
                      const dateStr = s?.createdAt ? new Date(s.createdAt + (s.createdAt.includes('T') ? '' : 'T')).toLocaleDateString('pt-BR') : '';
                      return (
                        <td key={setor} className="p-2 text-center">
                          {isCurrent ? (
                            <div className="inline-flex flex-col items-center gap-0.5 px-3 py-1 rounded-full text-xs font-bold border-2 bg-blue-50 text-blue-700 border-blue-400 shadow-sm">
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />{currentQtd} un</span>
                              {dateStr && <span className="text-[10px] font-normal text-blue-500">{dateStr}</span>}
                            </div>
                          ) : s ? (
                            <div className="inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-green-500">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {s.quantidade} un
                              </span>
                              {dateStr && <span className="text-[10px] text-gray-400">{dateStr}</span>}
                            </div>
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3">
                      {currentSetor ? (
                        <button
                          onClick={() => setMoveForm(p)}
                          className="whitespace-nowrap text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-300 hover:border-blue-500 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                        >
                          Mover
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!servico.produtos || servico.produtos.length === 0) && (
                <tr><td colSpan={SETORES_ORDEM.length + 6} className="p-8 text-center text-gray-400">Nenhum produto neste serviço</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {moveForm && (
        <MoveProdutoForm
          produto={moveForm}
          currentSetor={getSetorInfo(moveForm).currentSetor}
          currentQtd={getSetorInfo(moveForm).currentQtd}
          onMove={(setor_destino, quantidade, observacao) =>
            handleMove(moveForm.id, getSetorInfo(moveForm).currentSetor!, setor_destino, quantidade, observacao)
          }
          onClose={() => setMoveForm(null)}
        />
      )}
    </div>
  );
}

function MoveProdutoForm({ produto, currentSetor, currentQtd, onMove, onClose }: {
  produto: any; currentSetor: string | null; currentQtd: number;
  onMove: (destino: string, quantidade: number, observacao: string) => void; onClose: () => void;
}) {
  const [destino, setDestino] = useState('');
  const [quantidade, setQuantidade] = useState(currentQtd);
  const [observacao, setObservacao] = useState('');

  const setoresDisponiveis = SETORES_ORDEM.filter((s) => s !== currentSetor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destino) { alert('Selecione o setor de destino'); return; }
    if (quantidade <= 0) { alert('Quantidade deve ser maior que zero'); return; }
    onMove(destino, quantidade, observacao);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Mover: {produto.nome}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Setor atual: <strong className="text-gray-700">{currentSetor}</strong> · Quantidade disponível: <strong className="text-gray-700">{currentQtd}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Setor de Destino *</label>
            <select value={destino} onChange={(e) => setDestino(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Selecione...</option>
              {setoresDisponiveis.map((s) => (
                <option key={s} value={s}>{SETOR_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
            <input type="number" value={quantidade} onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)} min={1} max={currentQtd} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Máximo: {currentQtd} unidades</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Motivo da movimentação (opcional)" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Mover</button>
          </div>
        </form>
      </div>
    </div>
  );
}
