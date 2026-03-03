import React, { createContext, useContext } from 'react';
import type { ConfiguratorMode } from '../types/roles';

const ConfiguratorModeContext = createContext<ConfiguratorMode>('TECHNICAL');

interface ConfiguratorModeProviderProps {
  mode: ConfiguratorMode;
  children: React.ReactNode;
}

export function ConfiguratorModeProvider({ mode, children }: ConfiguratorModeProviderProps) {
  return (
    <ConfiguratorModeContext.Provider value={mode}>
      {children}
    </ConfiguratorModeContext.Provider>
  );
}

export function useConfiguratorMode(): ConfiguratorMode {
  return useContext(ConfiguratorModeContext);
}
