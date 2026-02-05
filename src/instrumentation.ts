export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { userStore } = await import('@/server/auth');
    const { isAuthDisabled } = await import('@/server/middleware/auth');
    if (isAuthDisabled()) {
      console.warn('WARNING: Authentication is disabled. Do not use in production!');
    }
    await userStore.initAdminAccount();
  }
}
