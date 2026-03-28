import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ── Stagger container ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const fadeChild = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setAccessToken } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) setError(oauthError);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authService.login(email, password);
      const { user } = res.data;
      setAccessToken('cookie');
      setUser({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role, department: user.department });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#050508' }}>

      {/* ╔══ LEFT PANEL — Photo + Quote ══╗ */}
      <motion.div
        className="hidden lg:flex lg:w-[40%] relative flex-col justify-between p-10 overflow-hidden"
        style={{ background: '#000000' }}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Background video — centered & scaled down */}
        <div className="absolute inset-0 flex items-center justify-center">
          <video
            src="/login.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '70%', height: 'auto', borderRadius: '1rem' }}
          />
        </div>

        {/* Top — Logo */}
        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <img src="/logo2.jpeg" alt="nion logo" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', background: '#fff' }} />
          <span className="text-white/80 text-sm font-semibold tracking-wide">CSR Platform</span>
        </motion.div>

        {/* spacer */}
        <div />
      </motion.div>

      {/* ╔══ RIGHT PANEL — Form ══╗ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        {/* Vertical separator */}
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        <div className="flex items-center justify-center w-full max-w-[860px]">

        <motion.div
          className="w-full max-w-[420px]"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* Hero headline — above form */}
          <motion.div variants={fadeChild} className="mb-8">
            <h1
              className="text-white/90 leading-[1.15] mb-3"
              style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(1.8rem, 3vw, 3rem)' }}
            >
              Making Impact<br />
              <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Visible
              </span>
            </h1>
            <p className="text-white/30 text-[13px] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Track CSR projects, measure real impact, and generate transparent reports across Oman's 11 governorates.
            </p>
          </motion.div>

          {/* Mobile logo */}
          <motion.div variants={fadeChild} className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <span className="text-white/50 text-sm font-medium">CSR Platform</span>
          </motion.div>

          {/* Header */}
          <motion.div variants={fadeChild} className="mb-8">
            <h2 className="text-[28px] font-bold text-white/95 tracking-tight">Sign in</h2>
            <p className="text-white/35 text-[14px] mt-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Welcome back — enter your credentials to continue
            </p>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mb-5 px-4 py-3 rounded-full text-[13px] bg-red-500/[0.08] border border-red-500/20 text-red-300/90"
            >
              {error}
            </motion.div>
          )}

          {/* OAuth buttons */}
          <motion.div variants={fadeChild} className="grid grid-cols-2 gap-3 mb-6">
            <motion.a
              href={`${API_URL}/auth/google`}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.07)' }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-2.5 py-3 rounded-full text-[13px] font-medium text-white/70 transition-colors cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </motion.a>
            <motion.a
              href={`${API_URL}/auth/github`}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.07)' }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-2.5 py-3 rounded-full text-[13px] font-medium text-white/70 transition-colors cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </motion.a>
          </motion.div>

          {/* Divider */}
          <motion.div variants={fadeChild} className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-white/20 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <motion.div variants={fadeChild} className="mb-4">
              <label className="block text-[13px] font-medium text-white/50 mb-2">Email Address</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@company.om"
                  required
                  className="w-full px-4 py-3 rounded-full text-[14px] text-white/90 placeholder-white/20 outline-none transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${focusedField === 'email' ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(96,165,250,0.08), inset 0 1px 0 rgba(255,255,255,0.02)' : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                  }}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={fadeChild} className="mb-3">
              <label className="block text-[13px] font-medium text-white/50 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-full text-[14px] text-white/90 placeholder-white/20 outline-none transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${focusedField === 'password' ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(96,165,250,0.08), inset 0 1px 0 rgba(255,255,255,0.02)' : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>

            {/* Forgot */}
            <motion.div variants={fadeChild} className="flex justify-end mb-6">
              <Link to="/forgot-password" className="text-[12px] text-blue-400/70 hover:text-blue-400 transition-colors">
                Forgot password?
              </Link>
            </motion.div>

            {/* Submit */}
            <motion.div variants={fadeChild}>
              <motion.button
                type="submit"
                disabled={loading || !email || !password}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-full text-[14px] font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Register link */}
          <motion.div variants={fadeChild} className="flex items-center justify-center gap-3 mt-2">
            <img
              src="/logo2.jpeg"
              alt="nion logo"
              style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover', background: '#fff' }}
            />
            <span className="text-[13px] text-white/30">Don't have an account?</span>
            <Link to="/register" className="text-[13px] font-medium text-blue-400/80 hover:text-blue-400 transition-colors">
              Create one
            </Link>
          </motion.div>

          {/* Mobile footer */}
          <motion.p variants={fadeChild} className="lg:hidden text-center text-white/15 text-[11px] mt-10">
            © 2026 CSR Platform · Sultanate of Oman
          </motion.p>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
