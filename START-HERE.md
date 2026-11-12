# Orchard Shift: your next steps

The app is **not approved for publishing yet**. Development safeguards are in place; no automated run, signed build or store transaction has been verified in this session. Do these steps in order. Do not set approval flags to skip a step.

## 1. Your details are recorded; run the code checks now
- Public operator: Russell Mercer.
- Public support/privacy email: russellmercer047@gmail.com.
- Apple Developer account: not yet registered.
- Google Play Console account: not yet registered.

The supplied name and email are now defaults in the app build and server public-information code; existing environment overrides still take precedence. This does not mark policies as reviewed or approve publishing. Verify the address receives support mail and review the policy wording.

Open `TESTING-GUIDE.md` for click-by-click instructions. Start with OnSpace → GitHub → sync/commit changes → repository Actions → Release safety checks → Run workflow. These code checks need no Apple/Google developer account and do not charge customers. Their results have not been verified here.

Do not send passwords, payment keys or signing credentials in chat. Owner name and support email are public information.

## 2. Create developer accounts, then confirm store identities and monthly products
Enroll through https://developer.apple.com/programs/enroll/ and https://play.google.com/console/signup. Apple membership is normally $99 USD per year; Google registration is $25 USD once (local charges may vary). A new personal Google account also requires a closed test with at least 12 continuously opted-in testers for 14 days before applying for production access. Internal subscription testing alone does not satisfy this launch requirement.

If you have existing app records, send their **Bundle ID** (Apple) and **package name** (Google). Otherwise, register the app in your own store accounts first; do not substitute identifiers for an existing app.

In RevenueCat, connect the matching Apple/Google apps and real store credentials. Set up:
- Apple: `orchard_shift_monthly`, auto-renewing, one month, $12.99 USD.
- Google: `orchard_shift_monthly`, base plan `monthly`, one month, $12.99 USD.
- Entitlement: `orchard_shift_membership`.
- Current offering: the Monthly package with the correct product for each store.
- Restore behavior: **Keep with original App User ID**.

Keep the app download free; the $12.99 charge is the monthly subscription. Complete the stores' agreements, tax/banking and signing requirements. Details are in `BILLING-SETUP.md`.

## 3. Review and publish meals; review policies
Cloud → Data → `weekly_meal_releases`: review the separate test draft first. Check all 21 meals, ingredients, allergens, safe cooking instructions and estimated nutrition; obtain qualified review where needed. Record the genuine reviewer and timestamps only after review.

Publish test content for installed-build testing. Publish the reviewed live collection for the current UTC Monday week when ready. Old drafts cannot be relabelled as a new weekly benefit. Arrange a genuinely new reviewed collection every Monday and someone to handle delivery failures.

Review `supabase/functions/_shared/legalInformation.ts` for your actual business and release regions. Public pages remain unavailable until real operator/contact settings are configured. They are drafts, not legal certification.

## 4. Run the supplied checks
Connect/commit to GitHub and open Actions → **Release safety checks**. Require a passing run. This checks offline fixtures, TypeScript and the actual Expo config loader, including each production-build guard.

Alternatively, after installing project dependencies, Node 22 and Deno:
```sh
node scripts/release-checks.cjs
```

After verifying the changed Edge Functions are deployed with the confirmed public contact details, run Actions → **Public release deployment checks**, leaving `require_ready` off initially; or:
```sh
node scripts/release-smoke.cjs
```

This checks public policies/support/deletion pages, secret-pattern denial and anonymous/caller-selected-identity rejection for weekly meals. It does not purchase anything or delete an account. If the gateway requires an API key, use only the project's **public anon key** as GitHub variable `ORCHARD_PUBLIC_ANON_KEY`; never put payment/service-role keys in this workflow.

A failed check is a blocker, not an approval. Source files being saved does not prove they passed. Cloud table RLS was inspected read-only during development and is enabled for all four relevant tables; this does not replace testing actual access policies.

## 5. Test installed builds and complete store forms
Use Apple sandbox/TestFlight and Google's signed internal-testing track with license testers. On **both** platforms verify purchase, cancel/pending, restore, renewal, expiry/refund, account switching, offline/provider errors, and cancellation settings. Use disposable accounts to test actual in-app/public account deletion and retries. Preview is not sufficient.

Also check narrow phones/tablets, landscape, large text, screen readers, keyboard/OTP/recovery and local meals/groceries. Complete Apple privacy/review forms and Google Data Safety, external deletion URL and **Nutrition and Weight Management** health declaration. The full test checklist is in `RELEASE-CHECKLIST.md`.

## 6. Approve and publish only after evidence is complete
Only then supply real build identifiers/operator metadata and set each named build attestation in `RELEASE-CHECKLIST.md`. Cloud and build environments are separate. Enable server `ORCHARD_RELEASE_APPROVED=true` only after reviewed current live meals and all release checks are complete.

Run the final public check with readiness required:
```sh
node scripts/release-smoke.cjs --require-ready
```

Build production and submit using Publish. Enable the weekly delivery monitor in GitHub (`ORCHARD_MONITOR_ENABLED=true`) and subscribe to failures. Neither the monitor nor the purchase gate automatically stops existing store renewals if meals are late.
