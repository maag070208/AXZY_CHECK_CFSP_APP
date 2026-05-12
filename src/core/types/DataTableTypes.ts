export interface DataTableFetchParams {
  page: number;
  limit: number;
  filters?: Record<string, any>;
  sort?: Record<string, 'asc' | 'desc'>;
}

export interface DataTableResponse<T> {
  rows: T[];
  total: number;
}
