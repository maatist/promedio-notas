// User types
export interface User {
  id: string;
  username: string;
  createdAt: Date;
}

// Period types
export interface Period {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
}

// Subject types
export interface Subject {
  id: string;
  name: string;
  periodId: string;
  isComposite: boolean;
  finalGrade: number | null;
  exemptionGrade: number | null;
}

// Composite subject (extends Subject with components)
export interface CompositeSubject extends Subject {
  isComposite: true;
  components: SubjectComponent[];
}

// Subject component (e.g., catedra, laboratorio, terreno)
export interface SubjectComponent {
  id: string;
  subjectId: string;
  name: string;
  weightPercentage: number;
}

// Grade types
export interface Grade {
  id: string;
  subjectComponentId: string;
  name: string;
  value: number | null;
  weightPercentage: number;
  order: number;
}

// API Request types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface CreatePeriodRequest {
  name: string;
}

export interface CreateSubjectRequest {
  name: string;
  periodId: string;
  isComposite: boolean;
  components?: {
    name: string;
    weightPercentage: number;
  }[];
}

export interface CreateGradeRequest {
  subjectComponentId: string;
  name: string;
  value: number | null;
  weightPercentage: number;
  order: number;
}

export interface UpdateGradeRequest {
  name?: string;
  value?: number | null;
  weightPercentage?: number;
  order?: number;
}

// API Response types
export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PeriodWithSubjects extends Period {
  subjects: SubjectWithDetails[];
}

export interface SubjectWithDetails extends Subject {
  components: SubjectComponentWithGrades[];
  calculatedAverage?: number | null;
}

export interface SubjectComponentWithGrades extends SubjectComponent {
  grades: Grade[];
  average?: number | null;
}
