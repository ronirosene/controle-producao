'use client';

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    AGUARDANDO: 'bg-yellow-100 text-yellow-800',
    EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
    CONCLUIDO: 'bg-green-100 text-green-800',
    ENTREGUE: 'bg-gray-100 text-gray-800',
    CANCELADO: 'bg-red-100 text-red-800',
    RECEBIDO: 'bg-purple-100 text-purple-800',
    EM_PRODUCAO: 'bg-indigo-100 text-indigo-800',
    AGUARDANDO_FINANCEIRO: 'bg-orange-100 text-orange-800',
    AGUARDANDO_AUT_CLIENTE: 'bg-pink-100 text-pink-800',
    AUTORIZADO_CLIENTE: 'bg-teal-100 text-teal-800',
    APROVADO: 'bg-green-100 text-green-800',
    FINALIZADO: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
