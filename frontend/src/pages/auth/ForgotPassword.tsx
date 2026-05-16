// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, Mail, Lock, Eye, EyeOff, ArrowLeft,
  ShieldCheck, CheckCircle2, Loader2, RefreshCw,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { authService } from '../../services/authService';

/* ── Animations ─────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.25, ease: 'easeOut' } },
};

/* ── Password requirement helpers ───────────────────────────────────────── */
const requirements = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
];

/* ═══════════════════════════════════════════════════════════════════════════
   ForgotPassword - 3-Step Recovery Flow
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ForgotPassword() {
  const P = useTheme().colors;
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ── Resend countdown timer ───────────────────────────────────────────── */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  /* ── Step 1: Send reset code ──────────────────────────────────────────── */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      setResendCooldown(60);
      setStep(2);
    } catch {
      setError('Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: OTP input handler ────────────────────────────────────────── */
  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const digit = value.slice(-1);
      setOtp((prev) => {
        const next = [...prev];
        next[index] = digit;
        return next;
      });
      if (digit && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    },
    [],
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split('');
    setOtp((prev) => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      return next;
    });
    const focusIdx = Math.min(digits.length, 5);
    otpRefs.current[focusIdx]?.focus();
  }, []);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.verifyResetCode(email, otp.join(''));
      setStep(3);
    } catch {
      setError('Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    try {
      await authService.forgotPassword(email);
      setResendCooldown(60);
    } catch {
      setError('Failed to resend code.');
    }
  };

  /* ── Step 3: Reset password ───────────────────────────────────────────── */
  const allRequirementsMet = requirements.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet || !passwordsMatch) return;
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(email, otp.join(''), password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2200);
    } catch {
      setError('Failed to reset password. The code may have expired.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared input style factory ───────────────────────────────────────── */
  const inputStyle: React.CSSProperties = {
    background: P.surface,
    border: `1px solid ${P.border}`,
    color: P.textHi,
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: P.bg }}
    >
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp as any}
        className="w-full max-w-md"
      >
        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: `linear-gradient(168deg, ${P.card} 0%, ${P.bg} 100%)`,
            border: `1px solid ${P.border}`,
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 40px rgba(0,0,0,0.3)',
          }}
        >
          {/* ── Success Overlay ──────────────────────────────────────── */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: P.card }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'rgba(52,211,153,0.12)', border: '2px solid rgba(52,211,153,0.3)' }}
                >
                  <CheckCircle2 size={40} style={{ color: '#34d399' }} />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-xl font-bold"
                  style={{ color: P.textHi }}
                >
                  Password Reset!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm mt-2"
                  style={{ color: P.textMd }}
                >
                  Redirecting to login...
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background: 'rgba(201,192,54,0.1)',
                border: '1px solid rgba(201,192,54,0.2)',
              }}
            >
              {step === 1 && <KeyRound size={26} style={{ color: P.accent }} />}
              {step === 2 && <ShieldCheck size={26} style={{ color: P.accent }} />}
              {step === 3 && <Lock size={26} style={{ color: P.accent }} />}
            </div>

            {/* Step indicator dots */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: s === step ? 24 : 8,
                    background: s <= step ? P.accent : P.borderHi,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Step Content ────────────────────────────────────────── */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#fca5a5' }}
            >
              {error}
            </motion.div>
          )}
          <AnimatePresence mode="wait">
            {/* ═══ Step 1: Email ═══ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold" style={{ color: P.textHi }}>
                    Forgot Password
                  </h1>
                  <p className="text-sm mt-1.5" style={{ color: P.textMd }}>
                    Enter your email to receive a reset code
                  </p>
                </div>

                <form onSubmit={handleSendCode} className="space-y-5">
                  <div>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: P.textMd }}
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: P.textLo }}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.om"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = P.accent)}
                        onBlur={(e) => (e.target.style.borderColor = P.border)}
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || !email}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: P.accent, color: P.bg }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      'Send Reset Code'
                    )}
                  </motion.button>
                </form>

                <div className="text-center mt-6">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs hover:underline"
                    style={{ color: P.accent }}
                  >
                    <ArrowLeft size={14} />
                    Back to Login
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ═══ Step 2: OTP Verification ═══ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold" style={{ color: P.textHi }}>
                    Verify Code
                  </h1>
                  <p className="text-sm mt-1.5" style={{ color: P.textMd }}>
                    We sent a 6-digit code to{' '}
                    <span style={{ color: P.accent }}>{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  {/* OTP Boxes */}
                  <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-11 h-13 text-center text-lg font-semibold rounded-lg outline-none transition-colors"
                        style={{
                          ...inputStyle,
                          borderColor: digit ? P.accent : P.border,
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = P.accent;
                          e.target.select();
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = digit ? P.accent : P.border;
                        }}
                      />
                    ))}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || otp.some((d) => !d)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: P.accent, color: P.bg }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </motion.button>
                </form>

                {/* Resend */}
                <div className="text-center mt-5">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs transition-opacity disabled:opacity-40"
                    style={{ color: P.accent }}
                  >
                    <RefreshCw size={13} />
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : 'Resend Code'}
                  </button>
                </div>

                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(Array(6).fill('')); }}
                    className="inline-flex items-center gap-1.5 text-xs hover:underline"
                    style={{ color: P.textLo }}
                  >
                    <ArrowLeft size={14} />
                    Change email
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══ Step 3: New Password ═══ */}
            {step === 3 && (
              <motion.div
                key="step-3"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold" style={{ color: P.textHi }}>
                    Set New Password
                  </h1>
                  <p className="text-sm mt-1.5" style={{ color: P.textMd }}>
                    Create a strong password for your account
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* New Password */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: P.textMd }}
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: P.textLo }}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-colors"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = P.accent)}
                        onBlur={(e) => (e.target.style.borderColor = P.border)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: P.textLo }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: P.textMd }}
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: P.textLo }}
                      />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-colors"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = P.accent)}
                        onBlur={(e) => (e.target.style.borderColor = P.border)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: P.textLo }}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* Mismatch warning */}
                    {confirmPassword.length > 0 && !passwordsMatch && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs mt-1.5"
                        style={{ color: '#f87171' }}
                      >
                        Passwords do not match
                      </motion.p>
                    )}
                  </div>

                  {/* Requirements Checklist */}
                  <div
                    className="rounded-lg p-3 space-y-2"
                    style={{
                      background: P.surface,
                      border: `1px solid ${P.border}`,
                    }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: P.textMd }}>
                      Password Requirements
                    </p>
                    {requirements.map((req) => {
                      const met = req.test(password);
                      return (
                        <div key={req.label} className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center transition-colors"
                            style={{
                              background: met
                                ? 'rgba(52,211,153,0.15)'
                                : `rgba(107,104,73,0.15)`,
                              border: `1px solid ${met ? 'rgba(52,211,153,0.4)' : P.border}`,
                            }}
                          >
                            {met && <CheckCircle2 size={10} style={{ color: '#34d399' }} />}
                          </div>
                          <span
                            className="text-xs transition-colors"
                            style={{ color: met ? '#6ee7b7' : P.textLo }}
                          >
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || !allRequirementsMet || !passwordsMatch}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: P.accent, color: P.bg }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer branding */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: P.textDim }}
        >
          CSR Platform &middot; Oman
        </p>
      </motion.div>
    </div>
  );
}

export { ForgotPassword };
