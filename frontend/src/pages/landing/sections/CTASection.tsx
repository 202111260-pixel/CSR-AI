import { motion } from 'framer-motion';
import { BlurFade } from '../components/BlurFade';

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-36 sm:py-48 px-6" style={{ background: '#09090b' }}>
      {/* Central glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-white/[0.02] blur-[180px]" />
      </div>

      <div className="relative mx-auto max-w-[680px] text-center">
        <BlurFade>
          <p className="font-['Geist_Mono',monospace] text-[11px] font-medium tracking-[0.3em] text-white/20 uppercase mb-8">
            Get Started
          </p>
        </BlurFade>

        <BlurFade delay={0.06}>
          <h2
            className="text-white text-[clamp(2.6rem,5.5vw,4.8rem)] font-semibold leading-[1.05] tracking-[-0.03em] mb-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Ready to make your
            <br />
            <span className="bg-gradient-to-r from-neutral-400 to-white bg-clip-text text-transparent">
              CSR count?
            </span>
          </h2>
        </BlurFade>

        <BlurFade delay={0.12}>
          <p className="text-white/30 text-[16px] leading-[1.7] max-w-[420px] mx-auto mb-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Join 87+ Omani organizations already managing projects, measuring impact, and reporting transparently.
          </p>
        </BlurFade>

        <BlurFade delay={0.18}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.a
              href="/register"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-[15px] font-semibold bg-white text-neutral-900 hover:bg-neutral-100 transition-colors duration-200 cursor-pointer"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Create Account
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            </motion.a>
            <motion.a
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[15px] font-semibold text-white/60 hover:text-white border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 cursor-pointer"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign In
            </motion.a>
          </div>
        </BlurFade>

        {/* Trust row */}
        <BlurFade delay={0.28}>
          <div className="mt-14 flex items-center justify-center gap-6 flex-wrap">
            {[
              'Vision 2040 Aligned',
              'Arabic & English',
              'AI-Powered',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[12px] text-white/20 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {t}
                </span>
              </div>
            ))}
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
