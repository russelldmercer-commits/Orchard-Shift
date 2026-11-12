import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { legalInformation } from '../_shared/legalInformation.ts';
import { publicReleaseInformation } from '../_shared/weeklyMealRuntime.ts';
import { handleDeleteAccount } from '../_shared/accountDeletionRuntime.ts';
import { corsHeaders } from '../_shared/cors.ts';
function escape(value: string) { return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!)); }
function page(title: string, content: string, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Orchard Shift</title><style>body{font:17px/1.7 system-ui;background:#faf8f5;color:#24322b;max-width:760px;margin:32px auto;padding:24px}h1,h2{color:#2d533d}a{color:#2d533d}section{padding:16px 0}input,button{font:inherit;padding:12px;width:100%;box-sizing:border-box;margin:8px 0}button{background:#2d533d;color:white;border:0;border-radius:12px}label{display:block}nav{display:flex;gap:16px;flex-wrap:wrap}.warning{padding:16px;background:#eef1e9;border-radius:12px}</style></head><body><h1>${escape(title)}</h1>${content}</body></html>`, { status, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" } });
}
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const info = publicReleaseInformation();
  if (!info) return page('Orchard Shift release information', '<p>The operator must configure and review public contact and policy information before release.</p>', 503);
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? 'support';
  const footer = `<section><h2>Operator and contact</h2><p>${escape(info.legalName)}<br><a href="mailto:${escape(info.supportEmail)}">${escape(info.supportEmail)}</a></p><nav><a href="${escape(info.privacyUrl)}">Privacy</a><a href="${escape(info.termsUrl)}">Terms</a><a href="${escape(info.supportUrl)}">Support</a><a href="${escape(info.deletionUrl)}">Delete account</a></nav></section>`;
  if (req.method === 'POST') {
    if (route !== 'delete-account' || req.headers.get('origin') !== new URL(req.url).origin) return page('Request rejected', '<p>Use the account deletion form from this page.</p>', 403);
    try {
      if (Number(req.headers.get('content-length') ?? 0) > 4096) return page('Request rejected', '<p>Request too large.</p>', 413);
      const raw = await req.text(); if (raw.length > 4096) return page('Request rejected', '<p>Request too large.</p>', 413);
      const form = new URLSearchParams(raw);
      if ([...form.keys()].sort().join(',') !== 'confirmation,email,password' || form.get('confirmation') !== 'DELETE') return page('Deletion not confirmed', '<p>Enter your email, password and DELETE confirmation.</p>' + footer, 400);
      const email = (form.get('email') ?? '').trim(); const password = form.get('password') ?? '';
      if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6 || password.length > 128) return page('Deletion not confirmed', '<p>Enter a valid account email and password.</p>' + footer, 400);
      const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
      const login = await auth.auth.signInWithPassword({ email, password });
      if (login.error || !login.data.session) return page('Deletion not confirmed', '<p>Sign-in verification failed. Check your password or use account recovery in the app.</p>' + footer, 403);
      const result = await handleDeleteAccount(new Request(req.url, { method: 'POST', headers: { Authorization: `Bearer ${login.data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password, confirmation: 'DELETE' }) }));
      await auth.auth.signOut({ scope: 'local' });
      if (result.status !== 200) return page('Deletion needs a retry', '<p>Deletion could not be completed. Some cleanup may already be complete. Retry from this page or the app. No account is reported as deleted until confirmed.</p>' + footer, result.status);
      return page('Your account was deleted', '<p>Your account, Cloud profile, membership mapping and RevenueCat customer record have been removed. Clear app data on each device to erase local food records. Apple/Google subscriptions must be cancelled separately; account deletion does not stop store billing or request a refund.</p>' + footer);
    } catch { return page('Deletion unavailable', '<p>No deletion confirmation was received. Please retry later.</p>' + footer, 503); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return page('Use GET', '', 405);
  if (route === 'privacy' || route === 'terms') {
    const content = legalInformation(route === 'privacy' ? 'privacy' : 'terms');
    return page(content.title, '<p>Effective date: November 12, 2026.</p>' + content.sections.map(section => `<section><h2>${escape(section.title)}</h2><p>${escape(section.body)}</p></section>`).join('') + footer);
  }
  if (route === 'delete-account') return page('Delete your Orchard Shift account', `<p>You can delete in the app under You → Delete my account, or use this secure password-verified form without reinstalling the app.</p><p class="warning">Deletion is permanent and removes membership access. Apple and Google billing can continue: cancel your subscription in <a href="https://apps.apple.com/account/subscriptions">Apple settings</a> or <a href="https://play.google.com/store/account/subscriptions">Google Play settings</a> first. You may still delete immediately. Dedicated browser membership is cancelled without an automatic refund. Clear device app data separately after using this form.</p><form method="post"><label>Account email<input name="email" type="email" autocomplete="email" maxlength="320" required></label><label>Current password<input name="password" type="password" autocomplete="current-password" minlength="6" maxlength="128" required></label><label>Type DELETE to confirm<input name="confirmation" pattern="DELETE" maxlength="6" required></label><button type="submit">Permanently delete account</button></form>${footer}`);
  return page('Orchard Shift support', '<p>For help with weekly meal delivery, your account or privacy, contact the operator below. Store cancellation, refund requests and receipts are managed by Apple or Google.</p>' + footer);
});
