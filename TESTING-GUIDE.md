# Russell: how to run Orchard Shift's tests

Your public operator/contact details are recorded as Russell Mercer and russellmercer047@gmail.com. Apple and Google developer accounts have not been created. No test run has been verified here, and publication is still blocked.

## 1. Run the code tests now — easiest option, no terminal

You do **not** need Apple or Google developer accounts for these tests. You do need a GitHub account; GitHub-hosted jobs may be subject to your account's Actions limits.

1. In OnSpace, click **GitHub** in the top-right toolbar and connect your GitHub account.
2. Sync/commit the latest project changes to your repository, including the `.github/workflows` and `scripts` folders. If the integration does not sync files, download the source and commit it to GitHub yourself.
3. Open that repository on GitHub, then click **Actions**. If asked to enable Actions, enable it.
4. In the left sidebar, select **Release safety checks**.
5. Click **Run workflow**, select the branch containing the latest changes, then click the run button. GitHub normally shows the manual-run button only after the workflow exists on the repository's default branch. If it is missing, commit/merge the workflow to that branch first.
6. Open the newest run and wait for both jobs, **offline-security** and **types**, to finish.
7. A green run means these code checks passed for that commit. If a job is red, open it, expand the failed step and send the error text or a screenshot here. Do not send credentials or your `.env` file.

These checks test request/identity validation, secret-response rejection, membership expiry/sandbox handling, weekly content and release guards, TypeScript, and the Expo configuration loader. They do not purchase a subscription, delete an account, approve policies, or prove store readiness.

## 2. Check the deployed public pages

After the updated Cloud Edge Functions are deployed:

1. In the same repository's **Actions**, select **Public release deployment checks**.
2. Click **Run workflow** and leave **require_ready** unchecked for now.
3. Wait for a green result. If red, send the failed step here; the deployed function, gateway, or public metadata may still need correction.

This checks privacy, terms, support, the external deletion page, and anonymous-access rejection. It does **not** submit the deletion form or contact live payment APIs. Public contact pages should display Russell Mercer and russellmercer047@gmail.com; policy wording still needs your review.

If the gateway requires an API key, the workflow accepts only the project's public anon key as repository variable `ORCHARD_PUBLIC_ANON_KEY`. Do not add RevenueCat, Stripe, service-role, or database credentials. Ask here if you encounter this rather than guessing which key to use.

Do not check **require_ready** or turn on release-approval flags yet: current reviewed live meals, store setup, policy review and installed-device tests are still required.

## 3. Create the developer accounts for purchase testing

- **Apple:** https://developer.apple.com/programs/enroll/ — normally $99 USD/year, with regional pricing/tax differences. For an individual account, Apple displays your legal name as the store seller. Complete enrollment and identity verification yourself.
- **Google:** https://play.google.com/console/signup — $25 USD one-time registration, with any applicable local charges. Complete identity/device verification and follow the account-type requirements shown by Google.

For a new personal Google account, publishing also requires a **closed test with at least 12 testers opted in continuously for at least 14 days**, then an application for production access; approval is not automatic. Start recruiting testers while setting up the app. Internal testing is useful but does not replace this closed test.

Official Google requirement: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en

Once enrolled, tell me **Apple enrolled / Google enrolled** and supply the registered iOS Bundle ID and Android package name when available. Do not send account passwords, identity documents, signing credentials or private API keys in chat.

Actual subscription testing comes after matching store/RevenueCat products and signed builds are configured: Apple sandbox/TestFlight and Google's signed testing track with license testers. OnSpace live preview does not verify store purchases. Use test accounts and follow `RELEASE-CHECKLIST.md` for purchase, restore, renewal, refund/expiry, account switching and deletion tests; do not delete your primary account to test cleanup.

## Optional: run on your computer instead of GitHub

Skip this section if using GitHub Actions. Install **Node.js 22** from https://nodejs.org/ and **Deno** using the instructions at https://docs.deno.com/runtime/getting_started/installation/.

Download the complete project from OnSpace, unzip it, and open a terminal **inside the folder containing `package.json`**. Run these separately, in order:

```sh
npm install --ignore-scripts
node scripts/release-checks.cjs
```

After verifying updated Edge Functions are deployed, run:

```sh
node scripts/release-smoke.cjs
```

The first command installs dependencies. The safety runner stops at the first failed check; fix it and rerun. A missing Node/Deno command is a setup issue, not a passed test. Keep the output and tested commit/version. Never paste private environment values into chat.

**Next action:** connect/sync GitHub and run **Release safety checks**; send any failed step here while you enroll in the developer programs.
