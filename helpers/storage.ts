export interface Project {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  createdAt: string;
}

export interface LoadItem {
  id: number;
  name: string;
  watts: number;
  qty: number;
  hours: number;
  period: 'Day' | 'Night' | 'Both';
  critical: boolean;
  surge: number;
}

export interface SavedEstimate {
  id: string;
  projectId: string;
  clientName: string;
  backupHours: number;
  systemVoltage: number;
  sunHours: number;
  totalConnectedW: number;
  dailyEnergyKwh: number;
  peakSurgeW: number;
  recommendedInverterKva: number;
  recommendedBatteryKwh: number;
  recommendedBatteryAh: number;
  recommendedSolarKwp: number;
  panelCount: number;
  safetyMargin: number;
  overrides: any[];
  loads: LoadItem[];
  createdAt: string;
  /** 'whole-house' = all loads; 'essential' = critical-only loads counted for battery */
  backupMode: 'whole-house' | 'essential';
  /** Optional project budget (e.g. N450000). Used to generate tiered Option B/C. */
  budget?: number;
}

export interface UserSession {
  email: string;
  name: string;
}

const STORAGE_KEY_PROJECTS = 'borex_projects_v1';
// Bumped to v2 on 2026-09-25: old v1 estimates used DoD=0.80 (wrong).
// On first load after upgrade the demo seed will use the corrected DoD=0.90 values.
const STORAGE_KEY_ESTIMATES = 'borex_estimates_v2';
const STORAGE_KEY_AUTH = 'borex_auth_user_v1';

export const defaultSampleLoads: LoadItem[] = [
  { id: 1, name: 'AC 1.5 HP', watts: 1300, qty: 1, hours: 5, period: 'Night', critical: false, surge: 2.5 },
  { id: 2, name: 'Refrigerator', watts: 180, qty: 1, hours: 24, period: 'Both', critical: true, surge: 3 },
  { id: 3, name: 'LED Light', watts: 12, qty: 8, hours: 6, period: 'Night', critical: true, surge: 1 },
  { id: 4, name: 'TV', watts: 120, qty: 1, hours: 5, period: 'Night', critical: false, surge: 1 },
  { id: 5, name: 'Water Pump', watts: 750, qty: 1, hours: 1, period: 'Day', critical: false, surge: 2.5 }
];

const initialProjects: Project[] = [
  {
    id: 'proj_demo_residence',
    name: 'Demo Residence',
    phone: '+234 801 234 5678',
    location: 'Lekki Phase 1, Lagos',
    createdAt: new Date().toISOString()
  }
];

export function getStoredProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(initialProjects));
      return initialProjects;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load projects from storage', err);
    return initialProjects;
  }
}

export function saveProject(project: Omit<Project, 'id' | 'createdAt'> & { id?: string }): Project {
  const projects = getStoredProjects();
  const newProject: Project = {
    id: project.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: project.name.trim(),
    phone: project.phone?.trim() || undefined,
    location: project.location?.trim() || undefined,
    createdAt: new Date().toISOString()
  };

  const updated = [newProject, ...projects];
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
  return newProject;
}

export function deleteProject(projectId: string): void {
  const projects = getStoredProjects();
  const updated = projects.filter((p) => p.id !== projectId);
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));

  const estimates = getStoredEstimates();
  if (estimates[projectId]) {
    delete estimates[projectId];
    localStorage.setItem(STORAGE_KEY_ESTIMATES, JSON.stringify(estimates));
  }
}

const initialEstimates: Record<string, SavedEstimate> = {
  proj_demo_residence: {
    id: 'est_demo_residence',
    projectId: 'proj_demo_residence',
    clientName: 'Demo Residence',
    backupHours: 12,
    systemVoltage: 48,
    sunHours: 5.0,
    totalConnectedW: 2436,
    dailyEnergyKwh: 12.83,
    peakSurgeW: 4404,
    recommendedInverterKva: 6.0,
    // Corrected 2026-09-25: DoD=0.90 (was 0.80/lead-acid assumption — wrong for LiFePO4)
    // nightEnergy≈12.0 kWh → battery = 12.0 / 0.90 ≈ 13.3 kWh
    recommendedBatteryKwh: 13.3,
    recommendedBatteryAh: 278,
    recommendedSolarKwp: 3.21,
    panelCount: 6,
    safetyMargin: 0.25,
    overrides: [],
    loads: defaultSampleLoads,
    createdAt: new Date().toISOString(),
    backupMode: 'whole-house'
  }
};

export function getStoredEstimates(): Record<string, SavedEstimate> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ESTIMATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ESTIMATES, JSON.stringify(initialEstimates));
      return initialEstimates;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load estimates from storage', err);
    return initialEstimates;
  }
}

export function getEstimateForProject(projectId: string): SavedEstimate | null {
  const estimates = getStoredEstimates();
  return estimates[projectId] || null;
}

export function saveEstimateForProject(estimate: SavedEstimate): void {
  const estimates = getStoredEstimates();
  estimates[estimate.projectId] = estimate;
  localStorage.setItem(STORAGE_KEY_ESTIMATES, JSON.stringify(estimates));
}

export function getStoredUserSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!raw) {
      // Default signed-in session for immediate access, or user can sign out
      const defaultUser: UserSession = {
        name: 'Field Solar Engineer',
        email: 'engineer@borex.energy'
      };
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserSession(user: UserSession | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY_AUTH);
  }
}
