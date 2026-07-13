'use client';

import { useEffect, useState } from 'react';
import { backupApi } from '@/services/api';
import { useAuth } from '@/services/auth';

export default function BackupPage() {
  const { user } = useAuth();
  const [backups, setBackups] = useState<any[]>([]);

  const load = () => backupApi.list().then(setBackups);

  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Backups do Sistema</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b bg-gray-50">
            <tr className="text-gray-500">
              <th className="p-3">ID</th>
              <th className="p-3">Arquivo</th>
              <th className="p-3">Caminho</th>
              <th className="p-3">Tamanho</th>
              <th className="p-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono">{b.id}</td>
                <td className="p-3 font-medium">{b.filename}</td>
                <td className="p-3 text-gray-500 text-xs">{b.filepath}</td>
                <td className="p-3">{b.size ? `${(b.size / 1024).toFixed(1)} KB` : '-'}</td>
                <td className="p-3">{b.createdAt ? new Date(b.createdAt + 'Z').toLocaleString('pt-BR') : '-'}</td>
              </tr>
            ))}
            {backups.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-400">Nenhum backup encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
