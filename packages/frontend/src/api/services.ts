import apiClient from './client';
import type {
  AuthResponse,
  Period,
  SubjectWithDetails,
  Grade,
  UpcomingGrade,
} from '@promedio-notas/shared';

// Auth Service
export const authService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/login', { username, password });
    return data.data;
  },
  register: async (username: string, password: string, email?: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/register', { username, password, email });
    return data.data;
  },
  me: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  },
  loginWithGoogle: async (credential: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/google', { credential });
    return data.data;
  },
  updateProfile: async (profileData: { email?: string }): Promise<{ id: string; username: string; email: string | null; authProvider: string; createdAt: Date }> => {
    const { data } = await apiClient.put('/auth/profile', profileData);
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
    payload: { name: string; value: number | null; weightPercentage: number; date?: string | null; description?: string | null }
  ): Promise<Grade> => {
    const { data } = await apiClient.post(`/components/${componentId}/grades`, payload);
    return data.data;
  },
  update: async (
    id: string,
    payload: { name?: string; value?: number | null; weightPercentage?: number; date?: string | null; description?: string | null }
  ): Promise<Grade> => {
    const { data } = await apiClient.put(`/grades/${id}`, payload);
    return data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/grades/${id}`);
  },
};

// Upcoming Grades Service
export const upcomingService = {
  getUpcomingGrades: async (): Promise<UpcomingGrade[]> => {
    try {
      const { data } = await apiClient.get('/upcoming-grades');
      return data.data;
    } catch {
      // Fail silently - don't break the dashboard
      return [];
    }
  },
};
