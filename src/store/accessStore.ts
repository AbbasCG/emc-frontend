import { create } from 'zustand';
import apiClient from '../api/axios';

interface PermissionNode {
  id: number;
  parent_id: number | null;
  node_type: string;
  key: string;
  label_ar: string;
  label_en: string | null;
  permission_name: string | null;
  is_system: boolean;
}

interface AccessManifest {
  role: string;
  is_super_admin: boolean;
  is_tech_admin: boolean;
  permissions: string[];
  nodes: PermissionNode[];
}

interface AccessState {
  manifest: AccessManifest | null;
  isLoading: boolean;
  error: string | null;
  fetchManifest: () => Promise<void>;
  can: (permissionKey: string) => boolean;
  isAdmin: () => boolean;
}

export const useAccessStore = create<AccessState>((set, get) => ({
  manifest: null,
  isLoading: false,
  error: null,
  
  fetchManifest: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/api/me/access-manifest');
      if (response.data.success) {
        set({ manifest: response.data.manifest, isLoading: false });
      } else {
        set({ error: 'Failed to fetch access manifest', isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Error fetching access manifest', isLoading: false });
    }
  },

  can: (permissionKey: string) => {
    const { manifest } = get();
    if (!manifest) return false;
    if (manifest.is_super_admin || manifest.is_tech_admin) return true;
    return manifest.permissions.includes(permissionKey);
  },

  isAdmin: () => {
    const { manifest } = get();
    if (!manifest) return false;
    return ['admin', 'super_admin', 'tech_admin', 'department_manager'].includes(manifest.role);
  }
}));
