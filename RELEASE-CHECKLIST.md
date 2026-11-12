# Orchard Shift — do not publish yet

For short, ordered instructions, start with `START-HERE.md`; for running checks, use `TESTING-GUIDE.md`. Confirmed public operator: Russell Mercer; support/privacy email: russellmercer047@gmail.com. Neither store developer account is registered yet. These details are recorded, not release approval.

## Completed in code and Cloud
- Native purchase/restore implementation, platform public-key guards, size-bounded native requests and server entitlement verification.
- Downloaded paid recipes are hidden after expiry, refund/inactive status, failed/stale verification or a mismatched test/live membership; no device cache grants access.
- Weekly member recipe screen with serving scaling and shopping totals; live/test content isolation and server checks on every paid-content read.
- Current-week content validation and new-purchase pause while release requirements are incomplete.
- 21 newly authored recipes drafted in Cloud, separately for live and sandbox review. Read-only SQL confirmed both rows are **unreviewed and unpublished**.
- Password-verified account deletion in the app and through a public HTTPS form; profile/mapping/pending-marker cleanup, store cancellation warnings, retryable provider cleanup and device-data erasure.
- Shared in-app/public policy text, operator contact support, generated icon and unnecessary native permission blocking.
- Offline security/content/cached-access fixtures, GitHub CI, actual Expo-loader production-guard regression tests, public deployment smoke checks, optional weekly delivery monitoring and EAS production build guard.
- One-command local checks: `node scripts/release-checks.cjs`; public deployment checks: `node scripts/release-smoke.cjs` (no purchase or account-deletion calls).

**No tests, production build, store transaction, public-page smoke test or store submission has been executed here.** Source and configuration work do not certify legal compliance, security or store approval.

## Five remaining release blockers

### 1. Verify the recorded contact and review policies
Russell Mercer and russellmercer047@gmail.com are user-confirmed defaults in the app build and server public-information code. Ensure this inbox is monitored and verify the deployed pages display these details. Existing `ORCHARD_LEGAL_NAME` and `ORCHARD_SUPPORT_EMAIL` environment values override the defaults; correct any stale values in Cloud and build settings. These are public metadata, not payment secrets; no new key submission is required.

Review the policy text in `supabase/functions/_shared/legalInformation.ts`, including processor/device backup practices, health information, deletion, billing and retention. Confirm accuracy for your organization and release regions; obtain appropriate legal review. Verify public privacy, terms, support and deletion pages work without login. URLs and setup are in `BILLING-SETUP.md`. Customer-facing support must identify the actual app operator, not an invented address.

### 2. Enroll and register or locate both store app identifiers
Neither developer account has been created yet. Enroll at https://developer.apple.com/programs/enroll/ and https://play.google.com/console/signup. Run code checks while enrollment is pending. New personal Google accounts require a closed test with at least 12 continuously opted-in testers for 14 days before applying for production access; signed internal purchase tests are a separate requirement.
- In your Apple developer/App Store Connect account, find the app's Bundle ID or register it for a new app.
- In Google Play Console, confirm the package/application ID used by the signed OnSpace Android build.
- They must match the installed builds and the RevenueCat Apple/Google apps. Do not create substitute identifiers if an app already exists.
- Supply those actual values as `ORCHARD_IOS_BUNDLE_ID` and `ORCHARD_ANDROID_PACKAGE` to the build environment, or preserve matching registered identifiers already injected by the build system.
- Complete developer enrollment, agreements, tax/banking, signing credentials and store access. The app download should not also be charged $12.99: this implementation uses the $12.99 monthly in-app subscription for weekly content.

### 3. Review and publish the first weekly collection
Cloud → Data → `weekly_meal_releases` contains 21-recipe draft rows for `test` and `live`, for the current UTC week. They include multiple food styles, but nutrients are illustrative estimates and have not been professionally verified. Review ingredient quantities, allergens, food handling, cooking temperatures and nutrition claims. Set reviewer and review/publication times only after real review.

Test a separately published sandbox collection first. Publish the reviewed live collection before enabling new purchases. App code cannot promise that a diet is healthy for every individual or replace a dietitian. Plan a genuine new reviewed collection every Monday UTC; drafting is not automatic ongoing generation. Publishing an old collection under a new date is not delivery of the advertised benefit.

Subscribe to GitHub workflow failure notifications and enable the optional weekly monitor after verified deployment. Missing current content pauses **new** app purchase actions, not existing store renewals. Arrange monitoring, timely content publication and support for any delivery failure.

### 4. Configure, deploy and test subscriptions and account cleanup
- Complete store products, price, entitlement, monthly offering, credentials and original-account restore policy as described in `BILLING-SETUP.md`.
- Confirm server RevenueCat credentials permit v1 subscriber reads and customer deletion; only public SDK keys reach devices.
- Deploy all new/changed Edge Functions and verify the Cloud gateway routes. Check public GET policy pages, POST form, CORS and auth. Verify `app-weekly-meals` permits only public availability or authenticated native reads.
- Validate RLS: direct client reads/writes of weekly releases and pending-deletion rows must fail. Account IDs and customer IDs must never be accepted from paid-content/deletion callers.
- Review Cloud auth rate limits, leaked-password checks, password policy and the four-digit OTP/recovery email template. Existing signup/recovery UI follows the current six-character backend minimum and four-digit OTP; keep UI and settings aligned if policy changes.
- Test Apple sandbox/TestFlight and Google signed internal-testing builds with license testers. Preview/Expo Go is not a substitute.
- On **each platform**, test purchase success/cancel/pending, repeated taps, renewal, grace, expiry, refund, cancellation, original-account restore, reinstall, different store/account identities, account switching during a purchase, network/provider failures and foreground/background transitions.
- Verify live purchases authorize only live recipes; sandbox purchases authorize only separate test recipes and never live entitlements. Check protected reads after expiry/refund.
- With disposable accounts, test in-app/public deletion, wrong password, anonymous/expired sessions, supplied other-user IDs, provider failure/retry, browser membership cleanup, local storage failure and profile/mapping/marker removal. Store billing can continue after deletion; cancellation instructions must remain explicit.
- Inspect generated app configuration, JS bundle, native artifacts, logs and network responses for secret exposure. Store public SDK keys are expected; secret API/service-role/database credentials are not.
- Connect GitHub and require a passing `Release safety checks` workflow. Run the offline tests and `tsc --noEmit` yourself if GitHub is not used. Store the evidence; the fixtures are supplied but not run here.

### 5. Finish store disclosures and installed-build review
Complete Apple App Privacy, age rating, subscription disclosures, review access and screenshots; and Google Data Safety, account-deletion URL, content rating, app access and the **Nutrition and Weight Management** Health apps declaration. Do not claim no data collection: account, purchase and SDK/provider data are processed off-device. Optional age/weight and reflections are device-local in this implementation, not uploaded by billing.

Inspect SDK privacy manifests/required-reason API declarations and the current store-required Expo/native SDK target levels in the generated builds. Check the generated icon and store-specific screenshots on devices. Test narrow phones, tablets, landscape, text sizing, screen readers, keyboard behavior, local progress/servings/groceries, OTP login/recovery and deletion. Do not advertise clinical outcomes, allergy guarantees or unimplemented features.

## Production guard — not a substitute for the checks
`app.config.ts` blocks builds when `ORCHARD_RELEASE_BUILD=true` or `EAS_BUILD_PROFILE=production` unless real identifiers, valid public operator metadata and all attestations exist. `eas.json` sets that flag in its production profile and increments release versions. The app never bundles billing secrets.

Set these **build environment** flags to `true` only after completing their named checks:
- `ORCHARD_POLICIES_REVIEWED`
- `ORCHARD_STORES_CONFIGURED`
- `ORCHARD_WEEKLY_CONTENT_REVIEWED`
- `ORCHARD_BACKEND_VERIFIED`
- `ORCHARD_SIGNED_TESTS_PASSED`
- `ORCHARD_RELEASE_APPROVED`

The confirmed public operator/contact defaults are included in builds so support remains available if content delivery is temporarily offline; any build overrides must stay consistent with the server. Cloud and build environments are separate: set server `ORCHARD_RELEASE_APPROVED=true` only after all checks pass and the current reviewed live collection is published.

If the OnSpace publishing pipeline does not use EAS profiles, ensure it passes `ORCHARD_RELEASE_BUILD=true`; otherwise do not assume the EAS build guard ran. No flag proves a transaction, legal review, code test or store approval happened. Do not bypass the remaining blockers just to produce a build.

## Reference requirements
- Apple account deletion: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/
- Google Health apps declaration: https://support.google.com/googleplay/android-developer/answer/14738291
- RevenueCat Expo installed-build setup: https://www.revenuecat.com/docs/getting-started/installation/expo
