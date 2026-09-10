/**
 * Email validation utility.
 */
export function validateEmail(email: string): email is string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
