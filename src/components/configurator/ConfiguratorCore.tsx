import React from 'react';
import type { ConfiguratorMode } from '../../types/roles';
import { ConfiguratorModeProvider } from '../../context/ConfiguratorModeContext';
import { TechnicalLayout } from '../layouts/TechnicalLayout';
import { SalesLayout } from '../layouts/SalesLayout';
import { SpecLayout } from '../layouts/SpecLayout';
import { PreviewPanel } from '../preview/PreviewPanel';

interface ConfiguratorCoreProps {
  mode: ConfiguratorMode;
  children: React.ReactNode;
}

export function ConfiguratorCore({ mode, children }: ConfiguratorCoreProps) {
  return (
    <ConfiguratorModeProvider mode={mode}>
      {mode === 'TECHNICAL' && (
        <TechnicalLayout sidebar={<PreviewPanel />}>
          {children}
        </TechnicalLayout>
      )}
      {mode === 'SALES' && (
        <SalesLayout>
          {children}
        </SalesLayout>
      )}
      {mode === 'SPEC' && (
        <SpecLayout>
          {children}
        </SpecLayout>
      )}
    </ConfiguratorModeProvider>
  );
}
