export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { userStore } = await import('@/server/auth');
    await userStore.initAdminAccount();
  }
}
