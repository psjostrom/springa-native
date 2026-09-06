export type ApiErrorDetails = {
  fields?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: ApiErrorDetails;

  constructor(status: number, message: string, code?: string, details?: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
