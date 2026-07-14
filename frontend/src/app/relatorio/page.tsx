'use client';

import { useEffect, useState } from 'react';
import { produtosApi, assistenciaLogsApi } from '@/services/api';
import { useAuth } from '@/services/auth';

function fmt(val: string | null | undefined): string {
  if (!val || val === "datetime('now')") return '-';
  const d = new Date(val.includes('T') ? val : val.replace(' ', 'T'));
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR');
}

export default function LogPage() {
  const { user } = useAuth();
  const [movs, setMovs] = useState<any[]>([]);
  const [assistenciaLogs, setAssistenciaLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'movimentacoes' | 'assistencia'>('movimentacoes');

  useEffect(() => {
    if (!user) return;
    produtosApi.relatorio().then(setMovs).catch((e) => setError(e.message));
    assistenciaLogsApi.list().then(setAssistenciaLogs).catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Log</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab('movimentacoes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'movimentacoes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
          Movimentações
        </button>
        <button onClick={() => setTab('assistencia')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'assistencia' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
          Assistência
        </button>
      </div>

      {tab === 'movimentacoes' && <MovimentacoesTable movs={movs} />}
      {tab === 'assistencia' && <AssistenciaTable logs={assistenciaLogs} />}
    </div>
  );
}

const SETOR_LABELS: Record<string, string> = {
  marcenaria: 'Marcenaria',
  lixa: 'Lixa',
  pintura: 'Pintura',
  embalagem: 'Embalagem',
};

function MovimentacoesTable({ movs }: { movs: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="border-b bg-gray-50">
          <tr className="text-gray-500">
            <th className="p-3">Data/Hora</th>
            <th className="p-3">Produto</th>
            <th className="p-3">Serviço</th>
            <th className="p-3">Setor</th>
            <th className="p-3">Qtd</th>
            <th className="p-3">Obs</th>
            <th className="p-3">Usuário</th>
          </tr>
        </thead>
        <tbody>
          {movs.map((m) => (
            <tr key={m.id} className="border-b hover:bg-gray-50">
              <td className="p-3 text-gray-600 whitespace-nowrap">{fmt(m.created_at)}</td>
              <td className="p-3 font-medium">{m.produto_nome}</td>
              <td className="p-3 text-gray-600">{m.servico_nome || '-'}</td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${setorColor(m.setor)}`}>
                  {SETOR_LABELS[m.setor] || m.setor}
                </span>
              </td>
              <td className="p-3 font-bold">{m.quantidade}</td>
              <td className="p-3 text-gray-500 max-w-[200px] truncate" title={m.observacao || ''}>{m.observacao || '-'}</td>
              <td className="p-3 text-gray-500">{m.user_name || '-'}</td>
            </tr>
          ))}
          {movs.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-400">Nenhuma movimentação registrada</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function setorColor(setor: string): string {
  const colors: Record<string, string> = {
    marcenaria: 'bg-orange-100 text-orange-800',
    lixa: 'bg-yellow-100 text-yellow-800',
    pintura: 'bg-blue-100 text-blue-800',
    embalagem: 'bg-green-100 text-green-800',
  };
  return colors[setor] || 'bg-gray-100 text-gray-800';
}

const LOG_TYPE_LABELS: Record<string, string> = {
  ASSISTENCIA_CRIACAO: 'Criação de Pedido',
  FINANCEIRO_VALOR: 'Valor definido',
  SERVICO_PRODUCAO: 'Serviço de Produção',
  STATUS_ALTERADO: 'Status Alterado',
  ASSISTENCIA_EXCLUSAO: 'Exclusão de Pedido',
};

const LOG_TYPE_COLORS: Record<string, string> = {
  ASSISTENCIA_CRIACAO: 'bg-blue-100 text-blue-700',
  FINANCEIRO_VALOR: 'bg-green-100 text-green-700',
  SERVICO_PRODUCAO: 'bg-purple-100 text-purple-700',
  STATUS_ALTERADO: 'bg-yellow-100 text-yellow-700',
  ASSISTENCIA_EXCLUSAO: 'bg-red-100 text-red-700',
};

function AssistenciaTable({ logs }: { logs: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="border-b bg-gray-50">
          <tr className="text-gray-500">
            <th className="p-3">Data/Hora</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Descrição</th>
            <th className="p-3">Pedido</th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Usuário</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={`${l.orderId}-${i}`} className="border-b hover:bg-gray-50">
              <td className="p-3 text-gray-600 whitespace-nowrap">{fmt(l.date)}</td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LOG_TYPE_COLORS[l.type] || 'bg-gray-100 text-gray-700'}`}>
                  {LOG_TYPE_LABELS[l.type] || l.type}
                </span>
              </td>
              <td className="p-3 text-gray-700">{l.desc}</td>
              <td className="p-3 font-mono font-bold text-gray-700">{l.pedido ? `#${l.pedido}` : '-'}</td>
              <td className="p-3 text-gray-600">{l.customer || '-'}</td>
              <td className="p-3 text-gray-500">{l.user || '-'}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">Nenhum registro de assistência encontrado</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
