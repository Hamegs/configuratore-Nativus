export type ConfiguratorMode = 'TECHNICAL' | 'SALES' | 'SPEC';

export const ROLE_TO_MODE: Record<string, ConfiguratorMode> = {
  applicatore: 'TECHNICAL',
  rivenditore: 'SALES',
  progettista: 'SPEC',
  admin: 'TECHNICAL',
};

export const ROLE_TO_HOME: Record<string, string> = {
  applicatore: '/applicatore',
  rivenditore: '/rivenditore',
  progettista: '/progettista',
  admin: '/',
};
