import React from 'react';
import type { ConfiguratorMode } from '../../types/roles';
import { useConfiguratorMode } from '../../context/ConfiguratorModeContext';

interface RoleGateProps {
  allow?: ConfiguratorMode[];
  deny?: ConfiguratorMode[];
  children: React.ReactNode;
}

export function RoleGate({ allow, deny, children }: RoleGateProps) {
  const mode = useConfiguratorMode();
  if (deny && deny.includes(mode)) return null;
  if (allow && allow.length > 0 && !allow.includes(mode)) return null;
  return <>{children}</>;
}
