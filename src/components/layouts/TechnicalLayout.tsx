import React, { Suspense, lazy } from 'react';

const Preview3DPanel = lazy(() =>
  import('../3d/Preview3DPanel').then(m => ({ default: m.Preview3DPanel }))
);

function PanelFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-slate-800">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="text-xs text-slate-500">3D…</span>
      </div>
    </div>
  );
}

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
        <div className="technical-theme">{children}</div>
      </div>
      <aside className="w-72 shrink-0 border-l border-slate-700 hidden xl:flex xl:flex-col" style={{ height: 'calc(100vh - 56px)', position: 'sticky', top: 0 }}>
        <Suspense fallback={<PanelFallback />}>
          <Preview3DPanel />
        </Suspense>
      </aside>
    </div>
  );
}
