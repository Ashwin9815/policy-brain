export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    correlationId?: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    correlationId?: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
