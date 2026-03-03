import React from 'react';

interface TechnicalLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function TechnicalLayout({ children, sidebar }: TechnicalLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-56px)] bg-slate-900">
      <div className="flex-1 overflow-auto">
        <div className="border-b border-slate-700 bg-slate-800 px-6 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-cyan-900 px-3 py-0.5 text-xs font-semibold text-cyan-300 tracking-widest uppercase">
              Modalità Tecnica
            </span>
            <span className="text-xs text-slate-400">Dati tecnici completi · Consumi reali · Stratigrafie</span>
          </div>
        </div>
        <div className={sidebar ? 'flex gap-0' : ''}>
          <div className={`flex-1 ${sidebar ? 'max-w-3xl' : ''}`}>
            <div className="technical-theme">{children}</div>
          </div>
          {sidebar && (
            <aside className="w-72 shrink-0 border-l border-slate-700 bg-slate-850 hidden xl:block">
              {sidebar}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
