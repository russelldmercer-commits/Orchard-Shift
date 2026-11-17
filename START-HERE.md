# Orchard Shift: what Russell needs to do

The app has meal tools, preferences, servings, lessons, membership screens, published-weekly-meal selection, linked shopping checklists, support/policy pages and account deletion. New purchases and production builds remain blocked until release requirements are met. Automated tests and installed-device/store tests have not been run or verified here.

Your public operator details are recorded: **Russell Mercer**, **russellmercer047@gmail.com**. Keep this inbox monitored. No passwords, private keys or identity documents should be sent in chat.

## 1. Create the developer accounts

You currently have neither account. Complete enrollment yourself:
- Apple: https://developer.apple.com/programs/enroll/ — normally $99 USD/year; local charges vary.
- Google: https://play.google.com/console/signup — $25 USD once; local charges may apply.

After approval, tell me **Apple enrolled / Google enrolled**. Confirm the iOS Bundle ID and Android package name from the app records/builds; do not invent replacements for existing apps. New personal Google accounts also require at least 12 testers continuously opted in to a closed test for 14 days, followed by an application for production access. Recruit testers while enrollment is pending.

## 2. Run the code checks while enrollment is pending

The app files are already in OnSpace; you do not need to write or copy code into chat. Connect the **GitHub** button in OnSpace's top-right toolbar, save/sync this project to your repository, then open that repository → **Actions** → **Release safety checks** → **Run workflow**.

If the integration or a source-repository URL prompt is unclear, send a screenshot with credentials hidden instead of guessing. If a test is red, send its failed-step error. These checks need no developer account and make no payment/deletion requests. Green confirms code checks for that commit, not permission to publish. More instructions: `TESTING-GUIDE.md`.

Without GitHub, download the complete source, install Node 22 and Deno, open a terminal in the folder containing `package.json`, then run:
```sh
npm install --ignore-scripts
node scripts/release-checks.cjs
```

## 3. Review the meals and policies

Cloud → Data → `weekly_meal_releases`: inspect the draft rows. Their original dates may now be stale. Prepare a genuinely current seven-day collection rather than relabelling an old week. Review ingredients, allergens, cooking safety, portions and estimated nutrients; obtain qualified review where needed. Record the real reviewer and review/publication times only after review. Publish separate test content first, then the reviewed live collection when ready.

Provide a genuinely new reviewed collection every Monday UTC. The app does not invent paid meals or mark them reviewed for you. Defaults use one recipe per day/meal; published alternatives can replace that recipe, with shopping totals following the actual selection and servings.

Review `supabase/functions/_shared/legalInformation.ts` for your actual business and release regions. Verify the public privacy, terms, support and deletion pages listed in `BILLING-SETUP.md` work without login and show your contact details. Draft wording is not legal certification.

## 4. Configure subscriptions and test installed builds

In the stores and RevenueCat, configure the matching registered apps, real store credentials, original-account restore behavior, and these products:
- Apple monthly subscription: `orchard_shift_monthly`, one month, $12.99 USD.
- Google subscription: `orchard_shift_monthly`, monthly base plan `monthly`, $12.99 USD.
- RevenueCat entitlement: `orchard_shift_membership`; current offering's Monthly package uses the appropriate store product.

Keep the app download free. Complete store agreements, tax/banking and signing. Credentials stay in dashboards/Edge Functions, not source or chat. Follow `BILLING-SETUP.md`.

Verify the changed Cloud functions are deployed, then run GitHub **Public release deployment checks** with `require_ready` unchecked. Test purchase, cancellation, pending payment, restore, renewal/expiry/refund, account switching, offline failures and deletion using disposable accounts on both installed platforms. Apple sandbox/TestFlight and Google's signed testing track/license testers are needed; Live Preview cannot verify purchasing.

For weekly test collections, verify meal replacements and serving changes update shopping totals and checkmarks. Test queued RevenueCat cleanup and password-verified retries: a queued deletion is not reported as complete. Full cases: `RELEASE-CHECKLIST.md`.

## 5. Complete store forms, then publish

Complete privacy/Data Safety, app access, content/age ratings, screenshots, subscription disclosures and Google's Nutrition and Weight Management health declaration. Finish the required closed testing for a new personal Google account.

Only after passing checks, reviewed current meals/policies and successful signed-build tests should the named build attestations and Cloud release approval be enabled. Do not turn on flags to skip the work. Run the final readiness check, build production and use OnSpace **Publish**. `RELEASE-CHECKLIST.md` contains the exact guard settings.

Keep reviewing/delivering weekly meals and monitoring failures after launch. Pausing new purchases does not stop existing store renewals.
