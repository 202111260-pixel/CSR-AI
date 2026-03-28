import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';

const requirements = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
];

/* ── Stagger ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const fadeChild = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function Register() {
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const allRequirementsMet = requirements.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet) return;
    setLoading(true);
    setError('');
    try {
      const res = await authService.register({ name, email, password, department: department || undefined });
      const { user } = res.data;
      setAccessToken('cookie');
      setUser({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role, department: user.department });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputProps = (field: string) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField(null),
    className: 'w-full px-4 py-3 rounded-full text-[14px] text-white/90 placeholder-white/20 outline-none transition-all duration-300',
    style: {
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${focusedField === field ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
      boxShadow: focusedField === field ? '0 0 0 3px rgba(96,165,250,0.08), inset 0 1px 0 rgba(255,255,255,0.02)' : 'inset 0 1px 0 rgba(255,255,255,0.02)',
    } as React.CSSProperties,
  });

  return (
    <div className="min-h-screen flex" style={{ background: '#050508' }}>

      {/* ╔══ LEFT PANEL — Branding ══╗ */}
      <motion.div
        className="hidden lg:flex lg:w-[48%] relative flex-col justify-between p-12 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Grid bg */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[120px] pointer-events-none" />

        {/* Top — Logo */}
        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <span className="text-white/60 text-sm font-medium tracking-wide">CSR Platform</span>
        </motion.div>

        {/* Middle — Hero text */}
        <div className="relative z-10 flex-1 flex flex-col justify-center -mt-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              className="text-white/90 leading-[1.15] mb-4"
              style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(2.2rem, 4vw, 3.8rem)' }}
            >
              Join the<br />
              <span className="bg-gradient-to-r from-emerald-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                Movement
              </span>
            </h1>
            <p className="text-white/30 text-[15px] leading-relaxed max-w-[380px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Be part of Oman's largest CSR community. Create your account and start making a measurable difference today.
            </p>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            className="mt-10 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            {[
              { icon: '📊', text: 'Real-time impact dashboards' },
              { icon: '🗺️', text: '11 governorates covered' },
              { icon: '🤝', text: '87+ partner organizations' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.15, duration: 0.4 }}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-white/25 text-[14px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom */}
        <motion.p
          className="relative z-10 text-white/15 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          © 2026 CSR Platform · Sultanate of Oman
        </motion.p>
      </motion.div>

      {/* ╔══ RIGHT PANEL — Form ══╗ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        <motion.div
          className="w-full max-w-[420px] py-4"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
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
          <motion.div variants={fadeChild} className="mb-7">
            <h2 className="text-[28px] font-bold text-white/95 tracking-tight">Create account</h2>
            <p className="text-white/35 text-[14px] mt-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Fill in your details to get started
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

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <motion.div variants={fadeChild} className="mb-4">
              <label className="block text-[13px] font-medium text-white/50 mb-2">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required {...inputProps('name')} />
            </motion.div>

            {/* Email */}
            <motion.div variants={fadeChild} className="mb-4">
              <label className="block text-[13px] font-medium text-white/50 mb-2">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.om" required {...inputProps('email')} />
            </motion.div>

            {/* Department */}
            <motion.div variants={fadeChild} className="mb-4">
              <label className="block text-[13px] font-medium text-white/50 mb-2">Department <span className="text-white/20">(optional)</span></label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. CSR Department" {...inputProps('dept')} />
            </motion.div>

            {/* Password */}
            <motion.div variants={fadeChild} className="mb-4">
              <label className="block text-[13px] font-medium text-white/50 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  {...inputProps('password')}
                  className="w-full px-4 py-3 pr-11 rounded-full text-[14px] text-white/90 placeholder-white/20 outline-none transition-all duration-300"
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

            {/* Requirements */}
            <motion.div variants={fadeChild} className="mb-6 flex items-center gap-3 flex-wrap">
              {requirements.map((req) => {
                const met = req.test(password);
                return (
                  <div
                    key={req.label}
                    className="flex items-center gap-1.5 transition-colors"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={{
                        background: met ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${met ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {met && <CheckCircle2 size={8} style={{ color: '#34d399' }} />}
                    </div>
                    <span className="text-[11px]" style={{ color: met ? '#6ee7b7' : 'rgba(255,255,255,0.2)' }}>
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </motion.div>

            {/* Submit */}
            <motion.div variants={fadeChild}>
              <motion.button
                type="submit"
                disabled={loading || !name || !email || !allRequirementsMet}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-full text-[14px] font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Login link */}
          <motion.div variants={fadeChild} className="text-center mt-7">
            <span className="text-[13px] text-white/30">Already have an account? </span>
            <Link to="/login" className="text-[13px] font-medium text-blue-400/80 hover:text-blue-400 transition-colors">
              Sign in
            </Link>
          </motion.div>

          <motion.p variants={fadeChild} className="lg:hidden text-center text-white/15 text-[11px] mt-10">
            © 2026 CSR Platform · Sultanate of Oman
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
