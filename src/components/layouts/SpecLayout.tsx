import React from 'react';

interface SpecLayoutProps {
  children: React.ReactNode;
}

export function SpecLayout({ children }: SpecLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-stone-50">
      <div className="border-b border-stone-200 bg-white px-6 py-2">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-0.5 text-xs font-semibold text-stone-600 tracking-widest uppercase">
            Modalità Specifica
          </span>
          <span className="text-xs text-stone-400">Stratigrafie tecniche · DIN · Documentazione progettuale</span>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
