'use client';

import { useState, useRef, DragEvent } from 'react';
import { useAuth } from '@/services/auth';
import { getAuthToken } from '@/services/api';

export default function ImportarPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && /\.(xlsx|xls|csv)$/i.test(dropped.name)) {
      setFile(dropped);
    } else {
      setStatus('Formato inválido. Use .xlsx, .xls ou .csv');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setStatus('Importando...');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/servicos/import', {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!res.ok) {
        const err = await res.text();
        setStatus(`Erro: ${err}`);
        return;
      }

      const data = await res.json();
      setResult(data.imported || []);
      setStatus(`Importado com sucesso! ${data.imported?.length || 0} serviço(s) importado(s).`);
      setFile(null);
    } catch (err: any) {
      setStatus(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Importar Planilha</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-gray-500 mb-4">
          <strong>Formatos suportados:</strong> XLSX, XLS (Excel) ou CSV.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${dragging ? 'border-blue-500 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {file ? (
              <div className="space-y-1">
                <p className="text-green-600 font-medium text-sm">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                <p className="text-xs text-blue-500 mt-2">Clique para trocar o arquivo</p>
              </div>
            ) : dragging ? (
              <p className="text-blue-600 font-medium">Solte o arquivo aqui...</p>
            ) : (
              <div className="space-y-2">
                <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-500 text-sm">Arraste o arquivo aqui ou clique para selecionar</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!file || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? 'Importando...' : 'Importar'}
            </button>
            {file && (
              <button type="button" onClick={() => { setFile(null); setStatus(''); }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            )}
          </div>
        </form>

        {status && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${status.startsWith('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {status}
          </div>
        )}

        {result && result.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="font-medium text-sm">Serviços importados:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              {result.map((item: any, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {item.servico}: {item.produtos_count} produto(s)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
