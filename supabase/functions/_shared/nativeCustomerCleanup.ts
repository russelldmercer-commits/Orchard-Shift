// RevenueCat v1 DELETE queues cleanup. A 200 alone is not completion.
// Never poll GET /subscribers: that endpoint can recreate a deleted customer.
export interface NativeCleanupDependencies {
  erase: () => Promise<number>;
  wait: (milliseconds: number) => Promise<void>;
}
export async function confirmNativeCustomerRemoval(dependencies: NativeCleanupDependencies): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const status = await dependencies.erase();
    if (status === 404) return true;
    if (status !== 200) return false;
    if (attempt < 2) await dependencies.wait(750);
  }
  // Keep the pending marker and Cloud account available for a verified retry.
  return false;
}
