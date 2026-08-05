import apiClient from './client';
import type {
  AuthResponse,
  Period,
  SubjectWithDetails,
  Grade,
} from '@promedio-notas/shared';

// Auth Service
export const authService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/login', { username, password });
    return data.data;
  },
  register: async (username: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/register', { username, password });
    return data.data;
  },
  me: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  },
};

// Period Service
export const periodService = {
  list: async (): Promise<Period[]> => {
    const { data } = await apiClient.get('/periods');
    return data.data;
  },
  create: async (name: string): Promise<Period> => {
    const { data } = await apiClient.post('/periods', { name });
    return data.data;
  },
  update: async (id: string, name: string): Promise<Period> => {
    const { data } = await apiClient.put(`/periods/${id}`, { name });
    return data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/periods/${id}`);
  },
};

// Subject Service
export const subjectService = {
  list: async (periodId: string): Promise<SubjectWithDetails[]> => {
    const { data } = await apiClient.get(`/periods/${periodId}/subjects`);
    return data.data;
  },
  create: async (
    periodId: string,
    payload: {
      name: string;
      isComposite: boolean;
      components?: { name: string; weightPercentage: number }[];
    }
  ): Promise<SubjectWithDetails> => {
    const { data } = await apiClient.post(`/periods/${periodId}/subjects`, payload);
    return data.data;
  },
  update: async (
    id: string,
    payload: {
      name?: string;
      isComposite?: boolean;
      components?: { name: string; weightPercentage: number }[];
      exemptionGrade?: number | null;
    }
  ): Promise<SubjectWithDetails> => {
    const { data } = await apiClient.put(`/subjects/${id}`, payload);
    return data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/subjects/${id}`);
  },
};

// Grade Service
export const gradeService = {
  create: async (
    componentId: string,
    payload: { name: string; value: number | null; weightPercentage: number }
  ): Promise<Grade> => {
    const { data } = await apiClient.post(`/components/${componentId}/grades`, payload);
    return data.data;
  },
  update: async (
    id: string,
    payload: { name?: string; value?: number | null; weightPercentage?: number }
  ): Promise<Grade> => {
    const { data } = await apiClient.put(`/grades/${id}`, payload);
    return data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/grades/${id}`);
  },
};
