'use client';

import { useAuth } from '@/services/auth';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSidebar } from './sidebar-context';

const FEATURES = {
  PRODUCAO_DASHBOARD: 'PRODUCAO_DASHBOARD',
  PRODUCAO_SERVICOS: 'PRODUCAO_SERVICOS',
  PRODUCAO_ESTOQUE: 'PRODUCAO_ESTOQUE',
  ASSISTENCIA_CLIENTES: 'ASSISTENCIA_CLIENTES',
  ASSISTENCIA_PRODUTOS: 'ASSISTENCIA_PRODUTOS',
  ASSISTENCIA_ORDENS: 'ASSISTENCIA_ORDENS',
  ADMIN_USUARIOS: 'ADMIN_USUARIOS',
};

export function Nav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const { collapsed, toggle: toggleSidebar } = useSidebar();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    producao: true,
    assistencia: true,
    cadastros: true,
    configuracoes: true,
  });

  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  if (loading) return null;

  if (!user) {
    return (
      <nav className="bg-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="font-bold text-lg">Controle de Produção</a>
            <div className="flex gap-6">
              <a href="/login" className="hover:text-blue-200 transition">Entrar</a>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const feats = user.features || [];

  const Chevron = ({ open }: { open: boolean }) => (
    <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );

  const Section = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    if (collapsed) return null;
    return (
      <div className="mt-2">
        <button onClick={() => toggle(id)}
          className="flex items-center gap-2 w-full text-[10px] text-blue-300 uppercase tracking-wider px-3 py-1 hover:text-blue-200">
          <Chevron open={openSections[id]} />
          {label}
        </button>
        {openSections[id] && (
          <div className="ml-2 border-l border-blue-600/50 pl-2 space-y-0.5">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <aside className={`fixed left-0 top-0 h-screen bg-blue-700 text-white flex flex-col shadow-lg z-50 transition-all ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className="flex items-center gap-2 px-4 h-16 border-b border-blue-600 shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 shrink-0">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 14l2 2 4-4" />
          </svg>
          {!collapsed && <span className="font-bold text-sm truncate">Controle Produção</span>}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 text-sm">
          {collapsed ? (
            /* ── Collapsed: icons only ── */
            <>
              {feats.includes(FEATURES.PRODUCAO_DASHBOARD) && (
                <IconLink href="/dashboard" name="grid" label="Dashboard" active={pathname === '/dashboard'} />
              )}
              {feats.includes(FEATURES.PRODUCAO_SERVICOS) && (
                <IconLink href="/servicos" name="folder" label="Serviços" active={pathname.startsWith('/servicos')} />
              )}
              {feats.includes(FEATURES.PRODUCAO_ESTOQUE) && (
                <IconLink href="/estoque" name="package" label="Pesquisa" active={pathname === '/estoque'} />
              )}
              <IconLink href="/observacoes" name="message" label="Observações" active={pathname === '/observacoes'} />
              {feats.includes(FEATURES.PRODUCAO_SERVICOS) && (
                <IconLink href="/importar" name="upload" label="Importar Planilha" active={pathname === '/importar'} />
              )}
              <IconLink href="/urgentes" name="alert" label="Urgentes" active={pathname === '/urgentes'} />
              {feats.includes(FEATURES.ASSISTENCIA_ORDENS) && (
                <IconLink href="/ordens" name="clipboard" label="Assistência Técnica" active={pathname.startsWith('/ordens')} />
              )}
              {feats.includes(FEATURES.ASSISTENCIA_PRODUTOS) && (
                <IconLink href="/produtos" name="box" label="Produtos" active={pathname.startsWith('/produtos')} />
              )}
              <IconLink href="/relatorio" name="file" label="Log" active={pathname === '/relatorio'} />
              <IconLink href="/backup" name="shield" label="Backup" active={pathname === '/backup'} />
              {feats.includes(FEATURES.ADMIN_USUARIOS) && (
                <IconLink href="/usuarios" name="settings" label="Usuários" active={pathname === '/usuarios'} />
              )}
            </>
          ) : (
            /* ── Expanded: full menu ── */
            <>
              {/* Produção */}
              <Section id="producao" label="Produção">
                {feats.includes(FEATURES.PRODUCAO_DASHBOARD) && (
                  <SubItem href="/dashboard" icon="grid" label="Dashboard" active={pathname === '/dashboard'} />
                )}
                {feats.includes(FEATURES.PRODUCAO_SERVICOS) && (
                  <SubItem href="/servicos" icon="folder" label="Serviços" active={pathname.startsWith('/servicos')} />
                )}
                {feats.includes(FEATURES.PRODUCAO_ESTOQUE) && (
                  <SubItem href="/estoque" icon="package" label="Pesquisa" active={pathname === '/estoque'} />
                )}
                <SubItem href="/observacoes" icon="message" label="Observações" active={pathname === '/observacoes'} />
                {feats.includes(FEATURES.PRODUCAO_SERVICOS) && (
                  <SubItem href="/importar" icon="upload" label="Importar Planilha" active={pathname === '/importar'} />
                )}
                <SubItem href="/urgentes" icon="alert" label="Urgentes" active={pathname === '/urgentes'} />
              </Section>

              {/* Assistência */}
              {feats.includes(FEATURES.ASSISTENCIA_ORDENS) && (
                <Section id="assistencia" label="Assistência">
                  <SubItem href="/ordens" icon="clipboard" label="Assistência Técnica" active={pathname.startsWith('/ordens')} />
                </Section>
              )}

              {/* Cadastros */}
              <Section id="cadastros" label="Cadastros">
                {feats.includes(FEATURES.ASSISTENCIA_PRODUTOS) && (
                  <SubItem href="/produtos" icon="box" label="Produtos" active={pathname.startsWith('/produtos')} />
                )}
                {feats.includes(FEATURES.ASSISTENCIA_ORDENS) && (
                  <>
                    <SubItem href="/assistencia/representantes" icon="user-check" label="Representantes" active={pathname === '/assistencia/representantes'} />
                    <SubItem href="/assistencia/cores" icon="droplet" label="Cores" active={pathname === '/assistencia/cores'} />
                    <SubItem href="/assistencia/detalhes" icon="file-text" label="Detalhes" active={pathname === '/assistencia/detalhes'} />
                  </>
                )}
                {feats.includes(FEATURES.ASSISTENCIA_CLIENTES) && (
                  <SubItem href="/clientes" icon="users" label="Clientes" active={pathname.startsWith('/clientes')} />
                )}
              </Section>

              {/* Configurações */}
              <Section id="configuracoes" label="Configurações">
                <SubItem href="/relatorio" icon="file" label="Log" active={pathname === '/relatorio'} />
                <SubItem href="/backup" icon="shield" label="Backup" active={pathname === '/backup'} />
                {feats.includes(FEATURES.ADMIN_USUARIOS) && (
                  <SubItem href="/usuarios" icon="settings" label="Usuários" active={pathname === '/usuarios'} />
                )}
              </Section>
            </>
          )}
        </nav>

        {/* Collapse toggle button */}
        <button onClick={toggleSidebar}
          className="flex items-center justify-center h-10 border-t border-blue-600 text-blue-300 hover:text-white hover:bg-blue-800 transition shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <I name={collapsed ? 'chevron-right' : 'chevron-left'} />
          </svg>
        </button>

        {/* User info */}
        <div className="border-t border-blue-600 px-4 py-3 shrink-0">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
            </div>
          ) : (
            <>
              <div className="text-xs text-blue-200 truncate">{user.name || user.email}</div>
              <button onClick={logout} className="text-xs text-red-300 hover:text-red-200 transition mt-1">Sair</button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function SubItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <a href={href}
      className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition ${active ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
        <I name={icon} />
      </svg>
      <span className="truncate">{label}</span>
    </a>
  );
}

function IconLink({ href, name, label, active }: { href: string; name: string; label: string; active: boolean }) {
  return (
    <a href={href}
      className={`flex items-center justify-center w-full py-2 rounded-lg transition ${active ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800 hover:text-white'}`}
      title={label}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <I name={name} />
      </svg>
    </a>
  );
}

function I({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    folder: <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></>,
    package: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    message: <><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    upload: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    clipboard: <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
    box: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></>,
    'user-check': <><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></>,
    droplet: <><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
    'chevron-left': <><polyline points="15 18 9 12 15 6" /></>,
    'chevron-right': <><polyline points="9 18 15 12 9 6" /></>,
  };
  return <>{icons[name] || null}</>;
}
