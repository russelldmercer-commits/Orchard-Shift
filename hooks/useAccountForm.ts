import { useCallback, useState } from 'react';
import { useAuth } from '@/template';
import { recoverWithCode, sendRecoveryCode } from '@/services/account';

type AccountMode = 'login' | 'signup' | 'recovery';
export function useAccountForm() {
  const auth = useAuth();
  const [mode,setMode] = useState<AccountMode>('login');
  const [stage,setStage] = useState<'details' | 'code'>('details');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [confirmation,setConfirmation] = useState('');
  const [code,setCode] = useState('');
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [localBusy,setLocalBusy] = useState(false);
  const [recovered,setRecovered] = useState(false);
  const busy = localBusy || auth.operationLoading || auth.loading;
  const changeMode = useCallback((next: AccountMode) => {
    if (busy) return;
    setMode(next); setStage('details'); setPassword(''); setConfirmation(''); setCode(''); setError(''); setNotice(''); setRecovered(false);
  },[busy]);
  const submit = useCallback(async () => {
    if (busy) return;
    const address = email.trim().toLowerCase();
    setError(''); setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setError('Enter a valid email address.'); return; }
    if (mode !== 'recovery' || stage === 'code') {
      if (password.length < 6) { setError('Use a password with at least 6 characters.'); return; }
      if (mode !== 'login' && password !== confirmation) { setError('The passwords do not match.'); return; }
    }
    if (mode !== 'login' && stage === 'code' && !/^\d{4}$/.test(code.trim())) { setError('Enter the 4-digit email code.'); return; }
    setLocalBusy(true);
    try {
      if (mode === 'login') {
        const result = await auth.signInWithPassword(address,password);
        if (result.error) { setError(result.error); return; }
        if (!result.user) { setError('No signed-in account was returned. Please try again.'); return; }
        setPassword(''); setNotice('Signed in. Your device drafts have not been uploaded.');
      } else if (stage === 'details') {
        const result = mode === 'signup' ? await auth.sendOTP(address) : await sendRecoveryCode(address);
        if (result.error) { setError(result.error); return; }
        setEmail(address); setStage('code'); setNotice('Check your email for the 4-digit verification code. It expires after one hour.');
      } else if (mode === 'signup') {
        const result = await auth.verifyOTPAndLogin(address,code.trim(),{password});
        if (result.error) { setError(result.error); return; }
        if (!result.user) { setError('Email verification did not return an account. Please try again.'); return; }
        setPassword(''); setConfirmation(''); setCode(''); setNotice('Your account is verified. Device data remains local.');
      } else {
        const result = await recoverWithCode(address,code.trim(),password);
        if (result.error) { setError(result.error); return; }
        setPassword(''); setConfirmation(''); setCode(''); setRecovered(true); setNotice('Your password has been reset.');
      }
    } catch { setError('Unable to complete this request. Check your connection and try again.'); }
    finally { setLocalBusy(false); }
  },[busy,email,password,confirmation,code,mode,stage,auth]);
  const resend = useCallback(async () => {
    if (busy) return;
    setLocalBusy(true); setError(''); setNotice('');
    try {
      const result = mode === 'signup' ? await auth.sendOTP(email.trim().toLowerCase()) : await sendRecoveryCode(email.trim().toLowerCase());
      if (result.error) setError(result.error); else setNotice('A new code was requested. Use the latest email and respect any resend rate limit.');
    } catch { setError('Unable to resend the code. Please try again.'); }
    finally { setLocalBusy(false); }
  },[busy,mode,email,auth]);
  const restart = useCallback(() => { if (!busy) { setStage('details'); setCode(''); setNotice(''); setError(''); } },[busy]);
  const title = mode === 'login' ? 'Welcome to your orchard.' : mode === 'signup' ? 'A fresh start, your way.' : 'Recover your account.';
  const buttonLabel = busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : stage === 'details' ? mode === 'signup' ? 'Send verification code' : 'Send recovery code' : mode === 'signup' ? 'Verify & create account' : 'Verify & reset password';
  return { user: auth.user, authLoading: auth.loading, mode,stage,email,password,confirmation,code,error,notice,busy,recovered,title,buttonLabel,changeMode,setEmail,setPassword,setConfirmation,setCode,submit,resend,restart };
}
