/**
 * Standardized Functional Result Envelope.
 * Guarantees explicit typed error propagation without unhandled crashes.
 */

export interface ErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

export type Result<T, E = ErrorDetails> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E = ErrorDetails>(code: string, message: string, details?: unknown): Result<never, E> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    } as E,
  };
}

export function fromThrowable<T>(fn: () => T, errorCode: string = 'INTERNAL_ERROR'): Result<T> {
  try {
    return ok(fn());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown exception occurred';
    return err(errorCode, message, error);
  }
}

export async function fromAsyncThrowable<T>(
  promise: Promise<T>,
  errorCode: string = 'ASYNC_OPERATION_ERROR'
): Promise<Result<T>> {
  try {
    const data = await promise;
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown async operation error';
    return err(errorCode, message, error);
  }
}

