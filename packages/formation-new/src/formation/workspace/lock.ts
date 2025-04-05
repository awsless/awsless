import { App } from "../app.ts";
import { LockBackend } from "../backend/lock.ts";

export const lockApp = async <T>(
  lockBackend: LockBackend,
  app: App,
  fn: () => T
): Promise<Awaited<T>> => {
  let release;
  try {
    release = await lockBackend.lock(app.urn);
  } catch (error) {
    throw new Error(`Already in progress: ${app.urn}`);
  }

  // --------------------------------------------------
  // Release the lock if we get a TERM signal from
  // the user

  const cleanupAndExit = async () => {
    await release();
    process.exit(0);
  };

  process.on("SIGTERM", cleanupAndExit);
  process.on("SIGINT", cleanupAndExit);

  // --------------------------------------------------
  // Run the callback

  let result: Awaited<T>;

  try {
    result = await fn();
  } catch (error) {
    throw error;
  } finally {
    await release();
  }

  return result!;
};
