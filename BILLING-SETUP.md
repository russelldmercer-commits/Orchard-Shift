# Orchard Shift: membership and release setup

Start with `START-HERE.md` for the short, ordered owner checklist and `TESTING-GUIDE.md` for test-running instructions. Do not enable release approval before real review and successful tests.

## Membership service
The $12.99/month subscription provides ongoing access to newly published weekly meal collections: seven days of recipes, serving controls and a linked shopping list. Starter food tools remain available without membership. No future activity feature is advertised as a paid benefit.

The initial collection of 21 newly authored recipes was drafted in Cloud → Data → `weekly_meal_releases`, separately for `test` and `live`. Those initial drafts were unreviewed and unpublished when created. Nutrient values are illustrative estimates. This is not automatic ongoing content generation: the operator must curate, review and publish a genuinely new collection every week. An old draft is not a current collection.

## New-purchase safety gate
- `app-weekly-meals` accepts public `{ "action": "availability" }` requests. It returns release availability and validated public operator/policy metadata, never recipes, account information, credentials or provider records.
- New native purchases require a complete current UTC Monday-week live collection, valid public operator/support/policy metadata and server `ORCHARD_RELEASE_APPROVED=true`.
- The app rechecks availability immediately before the purchase sheet, plus server membership and the SDK's active entitlement to avoid purchases over stale subscription status.
- The gate controls legitimate app purchase actions. It cannot stop purchases initiated outside the app or automatically stop existing Apple/Google renewals when a collection is late.
- Membership management and Restore purchases remain available when new purchases are paused.
- New browser APP checkout is paused, avoiding a second purchase route for native weekly content. Existing browser APP portal/history remain. Website products, customers and subscriptions are not changed.

## Server-only secrets
`REVENUECAT_SECRET_API_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and database credentials stay server-side in Edge Functions. Never put them in `app.json`, `app.config.ts`, `EXPO_PUBLIC_*`, assets, source bundles, CI public variables or logs.

RevenueCat's public Apple/Google SDK keys are the authorized exception. `app-native-config` returns only the signed-in platform's public `appl_` or `goog_` key and allowlisted product/entitlement identifiers. Shared guards reject private keys, Test Store keys, extra fields and accidental credential values. Native requests have token/payload size bounds before authentication adapters run. Provider exceptions select fixed errors rather than raw response text. SDK log forwarding is disabled. Public SDK keys are not entitlement proof.

## Owner metadata and public pages
User-confirmed public defaults are recorded in the app build and server public-information code:
- Legal operator: Russell Mercer.
- Support/privacy email: russellmercer047@gmail.com.

`ORCHARD_LEGAL_NAME` and `ORCHARD_SUPPORT_EMAIL` may override these values in Cloud/build environments; correct stale overrides if present. No additional payment or secret key is needed to set this public contact information. Leave `ORCHARD_RELEASE_APPROVED` unset/false until all release checks are complete.

Default public URLs:
- Privacy: `https://gomqzwxyzxyccxodgomq.backend.onspace.ai/functions/v1/app-public-information/privacy`
- Terms: `https://gomqzwxyzxyccxodgomq.backend.onspace.ai/functions/v1/app-public-information/terms`
- Support: `https://gomqzwxyzxyccxodgomq.backend.onspace.ai/functions/v1/app-public-information/support`
- External account deletion: `https://gomqzwxyzxyccxodgomq.backend.onspace.ai/functions/v1/app-public-information/delete-account`

These pages can use the confirmed public defaults after the updated Edge Functions are deployed; they return 503 if overridden metadata is invalid. Review `supabase/functions/_shared/legalInformation.ts` for actual processing, retention, jurisdiction and support practices; obtain appropriate legal review. Verify every page without login in an incognito browser and on installed devices. Shared policy text is not legal certification.

Custom public HTTPS URLs can use `ORCHARD_PRIVACY_URL`, `ORCHARD_TERMS_URL`, `ORCHARD_SUPPORT_URL` and `ORCHARD_DELETION_URL`. Do not use login-required, placeholder or nonfunctional pages. Cloud and build environments are separate: both now have the same confirmed public contact defaults; keep any overrides consistent so support remains available if content delivery is temporarily offline.

Policies describe device storage (not an encrypted vault), optional age/weight, account and processor data, downloaded meals, deletion and store billing. No medical result or personalized therapeutic diet is promised.

## Publish weekly meals
1. Cloud → Data → `weekly_meal_releases`: open the separate `test` draft first.
2. Review every recipe, all ingredients, allergens, safe cooking instructions, portions and estimated nutrients. `week_of` must be the current Monday in UTC. Each day 0–6 requires Breakfast, Lunch and Dinner; recipe IDs must be unique. Up to 42 recipes permit alternatives. Shopping totals use the first recipe per day/slot, as explained in the app.
3. Replace draft summary/reviewer labels with genuine editorial metadata. Record `reviewed_at` only after review and `published_at` as the actual publication time, not an invented/future approval.
4. Test a separately published sandbox collection with an installed-build sandbox subscription. Publish the reviewed `live` row when ready. Sandbox membership never authorizes live recipes.
5. Prepare a distinct collection in advance for each new Monday UTC. Stale, unreviewed, incomplete and future collections are rejected rather than relabelled as new.

RLS permits no direct client access to weekly releases. Every protected read verifies native membership on the server. Personal food/health preferences are not uploaded. Downloaded collections are memory-only and hidden on account changes. Visibility also requires a successful server membership check less than 90 seconds old, matching test/live mode and an unexpired subscription. Refund/inactive status, provider failures and expired verification hide the collection; a device cache never grants membership.

Arrange ongoing review, delivery monitoring and support. Late meals pause new app purchases, not existing store renewals.

## Native stores and RevenueCat
1. Find/register the actual iOS Bundle ID and Android package ID in your own store accounts and signed-build configuration. Do not invent replacements for an existing registered app. IDs must match RevenueCat's apps and installed builds.
2. Apple: create auto-renewable product `orchard_shift_monthly`, one month, $12.99 USD. Google: subscription `orchard_shift_monthly`, auto-renewing base plan `monthly`, one month, $12.99 USD. RevenueCat's full Google ID is `orchard_shift_monthly:monthly`. Configure regional prices intentionally. No introductory trial is advertised.
3. Connect real store credentials in RevenueCat, import products, attach them to entitlement `orchard_shift_membership`, and put the correct product in the Monthly package of the current offering.
4. Public SDK keys must belong to matching registered Apple/Google apps, not RevenueCat Test Store. The server secret must support v1 subscriber lookup and customer deletion. Configure private credentials through service dashboards, not source/chat.
5. Set restore behavior to **Keep with original App User ID**. Use a dedicated Orchard Shift project; do not mix website products into its entitlement or migrate users by email.
6. If IDs intentionally differ, use server-only `REVENUECAT_APPLE_PRODUCT_ID`, `REVENUECAT_GOOGLE_PRODUCT_ID` (including base plan) and `REVENUECAT_ENTITLEMENT_ID`.
7. Rebuild so `react-native-purchases` is linked. Apple needs sandbox/TestFlight; Google needs the signed testing track and license testers. Preview/Expo Go and sideloading alone do not verify purchases.

Store membership requires matching allowlisted product/store/base plan, an unrefunded subscription, valid expiry/grace in provider records and the correct environment. Sandbox can show subscribed status but `entitled` remains false; only separate test content is delivered. Native purchasing never routes to Stripe. Cancellation normally preserves verified access until expiry. Store settings handle cancellation, receipts and refunds. The app download should remain free; $12.99 is the monthly in-app subscription.

## Account deletion
- In app: You → Delete my account, also accessible from Help & support.
- Public: the HTTPS password-verified deletion form works without reinstalling the app.
- The private endpoint requires JWT and fresh password verification against the server-derived account email. It accepts only password and `DELETE` confirmation; account/customer IDs are rejected. Requests are bounded; errors are static; passwords/tokens are not logged or saved.
- It removes the dedicated RevenueCat customer, then hard-deletes the Cloud account. Profile, APP customer mapping and pending marker cascade away. In-app deletion erases this device's saved food data and clears the local session. Public deletion explains that local data on each device must be cleared separately.
- Apple/Google billing does not automatically stop. Store settings are offered before immediate deletion; cancellation is not a prerequisite. No automatic store refund is issued. Dedicated browser APP subscriptions are cancelled without proration/refund only after exclusive APP ownership verification; website/mixed subscriptions are not cancelled.
- Failed cleanup leaves a pending marker that blocks membership/new purchases while the account can retry. Deletion is never reported as complete until confirmed. Processor transaction records and minimal APP metadata may remain under provider retention policies.

Use disposable accounts to test wrong passwords, expired/anonymous auth, supplied other-user IDs, active subscriptions, provider failure/retry, local-storage failures, public-form origin protection, reinstall and related Cloud rows. No real account was deleted during development.

## Deployment and checks
Verify deployment of `app-weekly-meals`, `app-delete-account`, `app-public-information`, changed native billing/checkouts and shared modules. Saved source is not deployment evidence. Confirm actual gateway routes, CORS, JWT behavior and public forms. The weekly endpoint permits public availability but independently authenticates paid reads.

After installing project dependencies, Node 22 and Deno, run all non-network safety checks with:
```sh
node scripts/release-checks.cjs
```

The offline fixture command alone is:
```sh
deno test --no-config --no-remote \
  supabase/functions/_shared/nativeBillingRequest.test.ts \
  supabase/functions/_shared/nativeBillingResponse.test.ts \
  supabase/functions/_shared/nativeEntitlement.test.ts \
  supabase/functions/_shared/releaseSafety.test.ts \
  supabase/functions/_shared/weeklyAccess.test.ts \
  supabase/functions/_shared/nativeRequestLimits.test.ts
```

These cover auth/identity boundaries, secret-response denial, native entitlement and sandbox isolation, current-week content, deletion inputs, release metadata, cached-content expiry/staleness and request size limits. They do not exercise live payment or deletion APIs. Existing invoice tests import Stripe and remain separately available, outside this no-remote job.

GitHub **Release safety checks** runs after a commit to a connected repository. It runs offline fixtures, TypeScript and actual Expo-loader regression tests. Build tests use synthetic metadata/flags to verify both production entry points, every missing attestation, invalid contact/identifier/URLs and server-secret exclusion; they never alter Cloud approval. Require a passing release-branch run and retain evidence.

After deployment and real public owner settings are configured, run:
```sh
node scripts/release-smoke.cjs
```

Or manually run GitHub **Public release deployment checks** with readiness off initially. It checks all four public pages, credential-pattern denial, anonymous paid-read denial and caller-selected identity rejection without purchasing or deleting an account. It fails while policy/contact pages are unconfigured. If the gateway requires an API key, pass only the public anon key via `ORCHARD_PUBLIC_ANON_KEY`; never use service-role/payment credentials.

For the final launch check, after actual approval and a current reviewed live collection:
```sh
node scripts/release-smoke.cjs --require-ready
```

The optional daily weekly delivery monitor queries public readiness only. After verified launch, set GitHub repository variable `ORCHARD_MONITOR_ENABLED=true` and subscribe to failure notifications. It does not publish recipes, cancel renewals or test store APIs.

## Production approval
Follow `RELEASE-CHECKLIST.md`: registered store IDs, reviewed operator/policies, reviewed current weekly content, verified backend, installed signed-build tests and store disclosures all remain mandatory. Only then set the named build attestations and server release approval. No flag is proof of testing, legal review or store approval. OnSpace publishing must pass `ORCHARD_RELEASE_BUILD=true` if it does not use EAS production profiles.

**Automated tests, signed builds, store transactions and successful public-page smoke tests have not been run/verified in this session.** Source, stored keys, drafts and workflow definitions alone are not release readiness.
