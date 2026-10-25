export function sessionIdleDays(
  rememberMe: boolean,
  idleDays: number,
  absoluteDays: number,
): number {
  return rememberMe ? absoluteDays : idleDays;
}
