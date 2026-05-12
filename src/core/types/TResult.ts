export interface TResult<T> {
  success: boolean;
  data: T;
  messages: string[];
  stack?: string;
}
