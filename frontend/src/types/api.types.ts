export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; total: number; totalPages: number };
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  total: number;
  totalPages: number;
}
