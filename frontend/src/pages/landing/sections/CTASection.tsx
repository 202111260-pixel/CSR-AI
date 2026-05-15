import { useState } from 'react';
import { BlurFade } from '../components/BlurFade';
import Stepper, { Step } from '../components/Stepper';

const SECTOR_OPTIONS = [
  { id: 'corporate', label: 'Corporate', icon: '🏢' },
  { id: 'ngo',       label: 'NGO / Nonprofit', icon: '🤝' },
  { id: 'government',label: 'Government', icon: '🏛️' },
  { id: 'education', label: 'Education', icon: '🎓' },
];

const SDG_OPTIONS = [
  { id: '1',  label: 'No Poverty',       color: '#E5243B' },
  { id: '4',  label: 'Quality Education',color: '#C5192D' },
  { id: '8',  label: 'Decent Work',      color: '#A21942' },
  { id: '10', label: 'Reduced Inequalities', color: '#DD1367' },
  { id: '11', label: 'Sustainable Cities',   color: '#FD9D24' },
  { id: '13', label: 'Climate Action',       color: '#3F7E44' },
  { id: '17', label: 'Partnerships',         color: '#19486A' },
];

const TEAM_OPTIONS = [
  { id: '1-10',   label: '1 – 10' },
  { id: '11-50',  label: '11 – 50' },
  { id: '51-200', label: '51 – 200' },
  { id: '200+',   label: '200+' },
];

export function CTASection() {
  const [sector,   setSector]   = useState<string>('');
  const [sdgs,     setSdgs]     = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState<string>('');

  const toggleSdg = (id: string) =>
    setSdgs(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  return (
    <section className="relative overflow-hidden py-28 sm:py-36 px-6" style={{ background: '#000000' }}>
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-white/[0.015] blur-[180px]" />
      </div>

      <div className="relative mx-auto max-w-[600px]">
        {/* Header */}
        <div className="text-center mb-12">
          <BlurFade>
            <p className="font-['Geist_Mono',monospace] text-[11px] font-medium tracking-[0.3em] text-white/20 uppercase mb-8">
              Get Started
            </p>
          </BlurFade>

          <BlurFade delay={0.06}>
            <h2
              className="text-white text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em] mb-5"
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
            <p className="text-white/30 text-[15px] leading-[1.7] max-w-[400px] mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Tell us a bit about your organization and we'll get you set up in seconds.
            </p>
          </BlurFade>
        </div>

        {/* Stepper */}
        <BlurFade delay={0.2}>
          <Stepper
            backButtonText="Back"
            nextButtonText="Continue"
            onFinalStepCompleted={() => {}}
          >
            {/* ── Step 1: Sector ─────────────────────────────────────────── */}
            <Step>
              <p
                className="mb-1 text-[11px] font-medium tracking-[0.25em] uppercase text-white/20"
                style={{ fontFamily: "'Geist Mono', monospace" }}
              >
                Step 1
              </p>
              <h3
                className="mb-4 text-[18px] font-semibold text-white leading-snug"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                What sector are you in?
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SECTOR_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSector(opt.id)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all duration-200"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      border: sector === opt.id
                        ? '1px solid rgba(255,255,255,0.25)'
                        : '1px solid rgba(26,26,26,0.6)',
                      background: sector === opt.id
                        ? 'rgba(26,26,26,0.6)'
                        : 'rgba(255,255,255,0.02)',
                      color: sector === opt.id ? '#fff' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </Step>

            {/* ── Step 2: SDG Goals ──────────────────────────────────────── */}
            <Step>
              <p
                className="mb-1 text-[11px] font-medium tracking-[0.25em] uppercase text-white/20"
                style={{ fontFamily: "'Geist Mono', monospace" }}
              >
                Step 2
              </p>
              <h3
                className="mb-1 text-[18px] font-semibold text-white leading-snug"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Which SDG goals do you target?
              </h3>
              <p className="mb-4 text-[13px] text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Select all that apply
              </p>
              <div className="flex flex-wrap gap-2">
                {SDG_OPTIONS.map(sdg => {
                  const active = sdgs.includes(sdg.id);
                  return (
                    <button
                      key={sdg.id}
                      onClick={() => toggleSdg(sdg.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        background: active ? sdg.color + '22' : 'rgba(255,255,255,0.03)',
                        border: active ? `1px solid ${sdg.color}55` : '1px solid rgba(26,26,26,0.6)',
                        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      <span style={{ color: active ? sdg.color : undefined }}>SDG {sdg.id}</span>
                      {' '}· {sdg.label}
                    </button>
                  );
                })}
              </div>
            </Step>

            {/* ── Step 3: Team Size ──────────────────────────────────────── */}
            <Step>
              <p
                className="mb-1 text-[11px] font-medium tracking-[0.25em] uppercase text-white/20"
                style={{ fontFamily: "'Geist Mono', monospace" }}
              >
                Step 3
              </p>
              <h3
                className="mb-4 text-[18px] font-semibold text-white leading-snug"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                How large is your team?
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {TEAM_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setTeamSize(opt.id)}
                    className="rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      border: teamSize === opt.id
                        ? '1px solid rgba(255,255,255,0.25)'
                        : '1px solid rgba(26,26,26,0.6)',
                      background: teamSize === opt.id
                        ? 'rgba(26,26,26,0.6)'
                        : 'rgba(255,255,255,0.02)',
                      color: teamSize === opt.id ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {opt.label} people
                  </button>
                ))}
              </div>
            </Step>

            {/* ── Step 4: All set ────────────────────────────────────────── */}
            <Step>
              <p
                className="mb-1 text-[11px] font-medium tracking-[0.25em] uppercase text-white/20"
                style={{ fontFamily: "'Geist Mono', monospace" }}
              >
                Step 4
              </p>
              <h3
                className="mb-2 text-[18px] font-semibold text-white leading-snug"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                You're all set!
              </h3>
              <p className="mb-5 text-[14px] text-white/40 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Your profile is ready. Click <strong className="text-white/60">Finish</strong> to create
                your account and start managing CSR projects aligned with Vision 2040.
              </p>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(26,26,26,0.6)' }}>
                <div className="flex flex-col gap-2 text-[13px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {sector && (
                    <div className="flex items-center gap-2 text-white/50">
                      <span className="text-white/20">Sector</span>
                      <span className="ml-auto text-white/70 capitalize">{SECTOR_OPTIONS.find(s => s.id === sector)?.label}</span>
                    </div>
                  )}
                  {sdgs.length > 0 && (
                    <div className="flex items-center gap-2 text-white/50">
                      <span className="text-white/20">SDG Goals</span>
                      <span className="ml-auto text-white/70">{sdgs.map(s => `SDG ${s}`).join(', ')}</span>
                    </div>
                  )}
                  {teamSize && (
                    <div className="flex items-center gap-2 text-white/50">
                      <span className="text-white/20">Team Size</span>
                      <span className="ml-auto text-white/70">{TEAM_OPTIONS.find(t => t.id === teamSize)?.label} people</span>
                    </div>
                  )}
                </div>
              </div>
            </Step>
          </Stepper>
        </BlurFade>

        {/* Trust row */}
        <BlurFade delay={0.32}>
          <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
            {['Vision 2040 Aligned', 'Arabic & English', 'AI-Powered'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-white/15" />
                <span className="text-[11px] text-white/20 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
