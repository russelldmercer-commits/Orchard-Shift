// The production endpoints and offline fixtures execute these same request/response guards.
import { jsonResponse } from './cors.ts';
import {
  nativePreflight, validateNativeBillingRequest, validatePublicNativeConfiguration,
  validateNativeMembershipResponse, nativeBillingFailure,
  type NativePlatform, type ResolveNativeUser,
} from './nativeBillingValidation.ts';

export interface NativeBillingDependencies {
  resolveUser: ResolveNativeUser;
  publicConfiguration: (platform: NativePlatform) => unknown | Promise<unknown>;
  membership: (userId: string) => unknown | Promise<unknown>;
  // Runtime reads this allowlist only on the server; fixtures supply synthetic strings.
  privateCredentials: () => readonly string[];
}
export function createNativeBillingHandlers(dependencies: NativeBillingDependencies) {
  return {
    configuration: async (req: Request): Promise<Response> => {
      const early = nativePreflight(req); if (early) return early;
      try {
        const context = await validateNativeBillingRequest(req, dependencies.resolveUser);
        const candidate = await dependencies.publicConfiguration(context.platform);
        const config = validatePublicNativeConfiguration(candidate, context.platform, dependencies.privateCredentials());
        return jsonResponse(config);
      } catch (error) { return nativeBillingFailure(error); }
    },
    subscription: async (req: Request): Promise<Response> => {
      const early = nativePreflight(req); if (early) return early;
      try {
        const context = await validateNativeBillingRequest(req, dependencies.resolveUser);
        const candidate = await dependencies.membership(context.userId);
        const status = validateNativeMembershipResponse(candidate, dependencies.privateCredentials());
        return jsonResponse(status);
      } catch (error) { return nativeBillingFailure(error); }
    },
  };
}
