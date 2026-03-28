import { BlurFade } from '../components/BlurFade';
import Marquee from 'react-fast-marquee';

const TESTIMONIALS = [
  {
    text: 'This platform transformed how we approach social responsibility — from guesswork to data-driven decisions our board actually trusts.',
    author: 'Maryam Al-Rashidi',
    role: 'CSR Director',
    org: 'Muscat Holdings',
    color: '#09090b',
  },
  {
    text: 'The early warning system saved us from a major budget overrun. We caught it two weeks before it was too late.',
    author: 'Ahmed Al-Balushi',
    role: 'Project Manager',
    org: 'OQ Group',
    color: '#1d4ed8',
  },
  {
    text: 'Arabic and English support means our entire team — executives to field workers — can use the platform fluently.',
    author: 'Fatima Al-Kindi',
    role: 'Operations Lead',
    org: 'Bank Muscat CSR',
    color: '#7c3aed',
  },
  {
    text: "The Ideas Box gave our employees a real voice. We've implemented 12 community-driven initiatives from it so far.",
    author: 'Sultan Al-Harthi',
    role: 'HR Director',
    org: 'Omantel',
    color: '#b91c1c',
  },
  {
    text: 'Financial transparency went from a quarterly headache to a real-time dashboard. Our auditors love it.',
    author: 'Khalid Al-Lawati',
    role: 'CFO',
    org: 'OOCEP',
    color: '#15803d',
  },
];

const ORGS = ['Bank Muscat', 'OQ Group', 'Omantel', 'PDO', 'Sohar Aluminium', 'Nama Group', 'OOCEP', 'ASYAD', 'Madayn', 'Ooredoo Oman', 'OMRAN'];

export function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36 px-6" style={{ background: '#fafafa' }}>
      <div className="relative mx-auto max-w-[1200px]">
        {/* Header */}
        <BlurFade>
          <p className="font-['Geist_Mono',monospace] text-[11px] font-medium tracking-[0.3em] text-neutral-400 uppercase mb-5">
            Testimonials
          </p>
          <h2
            className="text-neutral-900 text-[clamp(2.2rem,4.5vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.03em] max-w-[500px] mb-16"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Trusted by Oman's leading organizations.
          </h2>
        </BlurFade>

        {/* Testimonial grid — masonry-like */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 mb-20">
          {TESTIMONIALS.map((t, i) => (
            <BlurFade key={t.author} delay={i * 0.06}>
              <div
                className="mb-4 break-inside-avoid rounded-2xl p-6 sm:p-7"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="#09090b" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>

                <p
                  className="text-[14px] text-neutral-600 leading-[1.75] mb-5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  "{t.text}"
                </p>

                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                    style={{ background: t.color }}
                  >
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-neutral-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {t.author}
                    </p>
                    <p className="text-[11px] text-neutral-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {t.role}, {t.org}
                    </p>
                  </div>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>

        {/* Org marquee */}
        <BlurFade delay={0.3}>
          <div className="relative">
            <div className="text-center mb-6">
              <span className="text-[11px] font-medium tracking-[0.15em] text-neutral-300 uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                And many more across Oman
              </span>
            </div>
            <Marquee speed={25} gradient gradientColor="#fafafa" gradientWidth={100}>
              {ORGS.map((name) => (
                <span
                  key={name}
                  className="mx-10 text-[20px] font-bold text-neutral-200 hover:text-neutral-400 transition-colors duration-300 cursor-default whitespace-nowrap select-none"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {name}
                </span>
              ))}
            </Marquee>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
