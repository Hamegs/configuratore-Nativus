import React, { Suspense, lazy } from 'react';

const Preview3DPanel = lazy(() =>
  import('../3d/Preview3DPanel').then(m => ({ default: m.Preview3DPanel }))
);

interface SpecLayoutProps {
  children: React.ReactNode;
}

export function SpecLayout({ children }: SpecLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-row bg-stone-50">
      <div className="flex-1 overflow-auto">
        <div className="border-b border-stone-200 bg-white px-6 py-2">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-0.5 text-xs font-semibold text-stone-600 tracking-widest uppercase">
              Modalità Specifica
            </span>
            <span className="text-xs text-stone-400">Stratigrafie tecniche · DIN · Documentazione progettuale</span>
          </div>
        </div>
        <div>{children}</div>
      </div>
      <aside
        className="w-72 shrink-0 border-l border-stone-200 hidden xl:flex xl:flex-col bg-slate-800"
        style={{ height: 'calc(100vh - 56px)', position: 'sticky', top: 0 }}
      >
        <Suspense fallback={
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
          </div>
        }>
          <Preview3DPanel />
        </Suspense>
      </aside>
    </div>
  );
}
