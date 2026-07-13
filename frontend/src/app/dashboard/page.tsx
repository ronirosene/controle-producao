'use client';

import { useEffect, useState } from 'react';
import { dashboardApi, serviceOrdersApi, assistenciaLogsApi, produtosApi } from '@/services/api';
import { useAuth } from '@/services/auth';
import Link from 'next/link';

export default function DashboardProducaoPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [urgentes, setUrgentes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    dashboardApi.get().then(setData);
    serviceOrdersApi.list({ status: '' }).then(setOrders).catch(() => {});
    assistenciaLogsApi.list().then(setLogs).catch(() => {});
    produtosApi.dashboard().then((d: any) => setUrgentes(d.urgentes || [])).catch(() => {});
  }, [user]);

  if (!user || !data) return null;

  const totalServicos = data.servicos?.length || 0;
  const totalPecas = data.servicos?.reduce((a: number, s: any) => a + Number(s.total_pecas || 0), 0) || 0;
  const totalFinalizados = data.servicos?.reduce((a: number, s: any) => a + Number(s.produtos_finalizados || 0), 0) || 0;

  const ordensAbertas = orders.filter((o: any) => !['ENTREGUE', 'CANCELADO'].includes(o.status)).length;
  const aguardandoFinanceiro = orders.filter((o: any) => o.status === 'AGUARDANDO_FINANCEIRO').length;
  const emAndamento = orders.filter((o: any) => o.status === 'EM_ANDAMENTO').length;
  const urgentesCount = urgentes.length;

  const recentLogs = logs.slice(-8).reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Serviços Ativos" value={totalServicos} color="bg-indigo-500" href="/servicos" />
        <Card label="Total Peças" value={totalPecas} color="bg-blue-500" />
        <Card label="Peças Finalizadas" value={totalFinalizados} color="bg-green-500" href="/servicos" />
        <Card label="Observações" value={data.observacoes_pendentes || 0} color="bg-orange-500" href="/observacoes" />
        <Card label="Ordens Abertas" value={ordensAbertas} color="bg-purple-500" href="/ordens" />
        <Card label="Aguardando Finan." value={aguardandoFinanceiro} color="bg-yellow-500" href="/ordens" />
        <Card label="Em Andamento" value={emAndamento} color="bg-cyan-500" href="/ordens" />
        <Card label="Prod. Urgentes" value={urgentesCount} color="bg-red-500" href="/urgentes" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/ordens" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">Nova Ordem de Serviço</Link>
        <Link href="/servicos" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition">Ver Produção</Link>
        <Link href="/estoque" className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition">Rastrear Prod.</Link>
        <Link href="/observacoes" className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition">Observações</Link>
      </div>

      {/* Two columns: Production table + Assistance summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Table */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-x-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Produção — Serviços</h2>
            <Link href="/servicos" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="border-b bg-gray-50">
              <tr className="text-gray-500">
                <th className="p-3">Serviço</th>
                <th className="p-3">Produtos</th>
                <th className="p-3">Peças</th>
                <th className="p-3">Finalizados</th>
                <th className="p-3">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {data.servicos?.map((s: any) => {
                const pct = s.total_pecas > 0 ? Math.min(100, Math.round((s.produtos_finalizados / s.total_pecas) * 100)) : 0;
                return (
                  <tr key={s.servico_id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{s.servico} {s.data_inicio ? `(${s.data_inicio})` : ''}</td>
                    <td className="p-3">{s.total_produtos}</td>
                    <td className="p-3">{s.total_pecas}</td>
                    <td className="p-3 text-green-700 font-medium">{s.produtos_finalizados}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Assistance Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Assistência</h2>
              <Link href="/ordens" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
            </div>
            <div className="divide-y text-sm">
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-600">Total de pedidos</span>
                <span className="font-medium">{orders.length}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-600">Aguardando financeiro</span>
                <span className="font-medium text-yellow-600">{aguardandoFinanceiro}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-600">Em andamento</span>
                <span className="font-medium text-blue-600">{emAndamento}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-600">Concluídos</span>
                <span className="font-medium text-green-600">{orders.filter((o: any) => o.status === 'CONCLUIDO').length}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-600">Entregues</span>
                <span className="font-medium text-green-700">{orders.filter((o: any) => o.status === 'ENTREGUE').length}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-600">Urgentes</span>
                <span className="font-medium text-red-600">{urgentesCount}</span>
              </div>
            </div>
          </div>

          {/* Top urgentes */}
          {urgentes.length > 0 && (
            <div className="bg-red-50 rounded-lg shadow border border-red-200 p-4">
              <h3 className="font-semibold text-red-700 text-sm mb-2">Produtos Urgentes</h3>
              <ul className="text-xs text-red-600 space-y-1">
                {urgentes.slice(0, 5).map((u: any, i: number) => (
                  <li key={i} className="truncate">⚠ {u.produto || u.servico || `#${u.id}`}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Atividades Recentes</h2>
          <div className="space-y-2">
            {recentLogs.map((log: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 truncate">{log.acao || log.message || log.tipo}</p>
                  <p className="text-xs text-gray-400">{log.detalhes || log.description || ''}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{log.created_at || log.createdAt ? new Date(log.created_at || log.createdAt).toLocaleString('pt-BR') : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.ultima_atualizacao && (
        <p className="text-xs text-gray-400">
          Última atualização produção: {data.ultima_atualizacao.created_at} por {data.ultima_atualizacao.user_name}
        </p>
      )}
    </div>
  );
}

function Card({ label, value, color, href }: { label: string; value: number; color: string; href?: string }) {
  const inner = (
    <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
        {value}
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
