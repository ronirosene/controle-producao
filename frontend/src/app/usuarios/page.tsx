'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth';
import { authApi, usersApi } from '@/services/api';
import { ALL_FEATURES } from './features';

export default function UsuariosPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [fixing, setFixing] = useState(false);

  const load = () => {
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    }).then((r) => r.json()).then(setUsers).catch(() => {});
  };

  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return null;

  const hasAdmin = user.email === 'ronyrosene@gmail.com';

  if (!hasAdmin) {
    return (
      <div className="text-center py-20 text-gray-500">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Usuários</h1>
        <p>Você não tem permissão para gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setFixing(true);
              try {
                const token = localStorage.getItem('auth_token');
                const res = await fetch('/api/users/fix-features', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                alert(`${data.updated} usuário(s) corrigido(s)!`);
                load();
              } catch (e: any) {
                alert('Erro: ' + e.message);
              } finally {
                setFixing(false);
              }
            }}
            disabled={fixing}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {fixing ? 'Corrigindo...' : 'Corrigir Todas'}
          </button>
          <button onClick={() => { setShowForm(true); setEditUser(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            + Novo Usuário
          </button>
        </div>
      </div>

      {showForm && (
        <UserForm
          editUser={editUser}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b bg-gray-50">
            <tr className="text-gray-500">
              <th className="p-3">Nome</th>
              <th className="p-3">Email</th>
              <th className="p-3">Funcionalidades</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const feats: string[] = (() => { try { return JSON.parse(u.features); } catch { return []; } })();
              return (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-gray-600">{u.email}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {feats.length === 0 && <span className="text-gray-400 text-xs">Nenhuma</span>}
                      {feats.map((f) => {
                        const feat = ALL_FEATURES.find((af) => af.key === f);
                        return feat ? (
                          <span key={f} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{feat.label}</span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="p-3 space-x-2">
                    <button onClick={() => { setEditUser(u); setShowForm(true); }} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={async () => {
                      if (confirm(`Excluir usuário ${u.name}?`)) {
                        await fetch(`/api/users/${u.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
                        });
                        load();
                      }
                    }} className="text-red-600 hover:underline text-xs">Excluir</button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-gray-400">Nenhum usuário encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserForm({ editUser, onClose, onSaved }: { editUser: any | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(editUser?.name || '');
  const [email, setEmail] = useState(editUser?.email || '');
  const [password, setPassword] = useState('');
  const [features, setFeatures] = useState<string[]>(() => {
    if (!editUser?.features) return [];
    try { return JSON.parse(editUser.features); } catch { return []; }
  });

  const toggleFeature = (key: string) => {
    setFeatures((prev) => prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    if (editUser) {
      const body: any = { name, email, features };
      if (password) body.password = password;
      await fetch(`/api/users/${editUser.id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    } else {
      await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, email, password, features }),
      });
    }
    onSaved();
  };

  const isMe = editUser && editUser.id === JSON.parse(atob(localStorage.getItem('auth_token')!.split('.')[1])).userId;

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-10 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{editUser ? 'Editar' : 'Novo'} Usuário</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha {!editUser ? '*' : '(deixe em branco para manter)'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required={!editUser}
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Funcionalidades Liberadas</label>
              <div className="space-y-2">
                {ALL_FEATURES.map((feat) => (
                  <label key={feat.key} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.includes(feat.key)}
                      onChange={() => toggleFeature(feat.key)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{feat.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setFeatures(ALL_FEATURES.map((f) => f.key))} className="text-xs text-blue-600 hover:underline">Liberar todas</button>
                <button type="button" onClick={() => setFeatures([])} className="text-xs text-red-600 hover:underline">Remover todas</button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editUser ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
