/**
 * Type-Safe Action Result Pattern
 * Used across all automation server actions for consistent error handling
 */

export type ActionSuccess<T> = { success: true; data: T };
export type ActionError = {
  success: false;
  error: { message: string; code?: string; field?: string };
};
export type ActionResult<T> = ActionSuccess<T> | ActionError;

export function success<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

export function error(message: string, code?: string, field?: string): ActionError {
  return { success: false, error: { message, code, field } };
}
