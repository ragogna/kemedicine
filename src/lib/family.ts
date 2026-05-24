export function sanitizeEmail(email: string): string {
  return email.toLowerCase().replace(/\./g, "_DOT_").replace(/@/, "_AT_");
}
