const LINKS = {
  Platform: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/projects' },
    { label: 'Reports', href: '/reports/general' },
    { label: 'Map View', href: '/map' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Vision 2040', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Resources: [
    { label: 'Sign In', href: '/login' },
    { label: 'Register', href: '/register' },
    { label: 'Documentation', href: '#' },
    { label: 'Privacy', href: '#' },
  ],
};

export function FooterSection() {
  return (
    <footer className="relative px-6 pt-16 pb-8" style={{ background: '#09090b', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <span className="font-['Geist_Mono',monospace] text-[11px] font-bold text-white/60">C</span>
              </div>
              <span className="text-[15px] font-semibold text-white/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                CSR<span className="text-white/30">Platform</span>
              </span>
            </div>
            <p className="mb-6 max-w-[280px] text-[13px] leading-[1.8] text-white/20" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Oman's enterprise CSR management platform — tracking projects, measuring impact, driving transparency.
            </p>
            <div className="flex items-center gap-2">
              {['Li', 'X', 'Gh'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/20 hover:text-white/50 hover:border-white/[0.12] transition-all duration-300"
                  aria-label={s}
                >
                  <span className="text-[10px] font-bold">{s}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link groups */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="mb-4 text-[11px] font-semibold tracking-[0.15em] text-white/30 uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {group}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-white/15 hover:text-white/50 transition-colors duration-300"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="font-['Geist_Mono',monospace] text-[11px] text-white/15">
            &copy; {new Date().getFullYear()} CSR Platform
          </p>
          <p className="font-['Geist_Mono',monospace] text-[11px] text-white/15">
            Muscat, Oman
          </p>
        </div>
      </div>
    </footer>
  );
}
