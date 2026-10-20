export type AppErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_RESUME'
  | 'INVALID_WORKSPACE'
  | 'UNSUPPORTED_RESUME_VERSION'
  | 'UNSUPPORTED_WORKSPACE_VERSION'
  | 'IMPORT_FAILED'
  | 'EXPORT_FAILED'
  | 'PRINT_FAILED'
  | 'FILE_READ_FAILED'
  | 'FILE_TOO_LARGE'
  | 'LIMIT_EXCEEDED'
  | 'OPERATION_FAILED'
  | 'STORAGE_FAILED';

export type AppError = {
  code: AppErrorCode;
  message: string;
  cause?: unknown;
  details?: unknown;
};

type CreateAppErrorOptions = {
  cause?: unknown;
  details?: unknown;
};

export const createAppError = (
  code: AppErrorCode,
  message: string,
  options: CreateAppErrorOptions = {},
): AppError => ({
  code,
  message,
  cause: options.cause,
  details: options.details,
});

export const isAppError = (value: unknown): value is AppError =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'code' in value &&
      typeof value.code === 'string' &&
      'message' in value &&
      typeof value.message === 'string',
  );

export const toAppError = (
  error: unknown,
  fallbackCode: AppErrorCode,
  fallbackMessage: string,
): AppError =>
  isAppError(error)
    ? error
    : createAppError(fallbackCode, fallbackMessage, {
        cause: error,
      });
