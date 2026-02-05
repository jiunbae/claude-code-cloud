export const MOCK_USER = {
  id: 'local-user',
  email: 'local@localhost',
  username: 'local',
  role: 'admin',
} as const;

// Skip auth checks when AUTH_DISABLED=true
export function isAuthDisabled(): boolean {
  return process.env.AUTH_DISABLED === 'true';
}
