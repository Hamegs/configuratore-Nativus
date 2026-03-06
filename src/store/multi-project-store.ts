import { create } from 'zustand';
import type { ProjectMeta } from '../types/project';

const LS_PROJECTS = 'nativus_projects';
const LS_ACTIVE = 'nativus_active_project';

interface MultiProjectStore {
  projects: ProjectMeta[];
  activeProjectId: string | null;
  createProject: (name: string, description?: string) => string;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string, description?: string) => void;
  setActiveProject: (id: string) => void;
  getActiveProject: () => ProjectMeta | null;
  hydrate: () => void;
}

function readProjects(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(LS_PROJECTS);
    return raw ? (JSON.parse(raw) as ProjectMeta[]) : [];
  } catch {
    return [];
  }
}

function writeProjects(projects: ProjectMeta[]) {
  try {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(projects));
  } catch {
    console.warn('multiproject-store: cannot write projects');
  }
}

function readActiveId(): string | null {
  try {
    return localStorage.getItem(LS_ACTIVE);
  } catch {
    return null;
  }
}

function writeActiveId(id: string | null) {
  try {
    if (id) localStorage.setItem(LS_ACTIVE, id);
    else localStorage.removeItem(LS_ACTIVE);
  } catch { /* noop */ }
}

export const useMultiProjectStore = create<MultiProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,

  hydrate: () => {
    const projects = readProjects();
    const activeProjectId = readActiveId();
    set({ projects, activeProjectId });
  },

  createProject: (name, description) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const project: ProjectMeta = { id, name, description, createdAt: now, updatedAt: now };
    const projects = [...get().projects, project];
    writeProjects(projects);
    writeActiveId(id);
    set({ projects, activeProjectId: id });
    return id;
  },

  deleteProject: (id) => {
    const projects = get().projects.filter(p => p.id !== id);
    writeProjects(projects);
    const current = get().activeProjectId;
    const next = current === id ? (projects[0]?.id ?? null) : current;
    writeActiveId(next);
    set({ projects, activeProjectId: next });
    try { localStorage.removeItem(`nativus_project_${id}`); } catch { /* noop */ }
  },

  renameProject: (id, name, description) => {
    const now = new Date().toISOString();
    const projects = get().projects.map(p =>
      p.id === id ? { ...p, name, description, updatedAt: now } : p
    );
    writeProjects(projects);
    set({ projects });
  },

  setActiveProject: (id) => {
    writeActiveId(id);
    set({ activeProjectId: id });
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find(p => p.id === activeProjectId) ?? null;
  },
}));
