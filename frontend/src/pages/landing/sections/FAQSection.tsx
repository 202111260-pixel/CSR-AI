import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'What is the CSR Platform?',
    answer:
      'The CSR Platform is a comprehensive management system for corporate social responsibility in Oman. It helps organizations plan, execute, track, and report on CSR projects across all 11 governorates — with real-time budget tracking, beneficiary analytics, and impact measurement aligned with Oman Vision 2040.',
  },
  {
    question: 'How does AI-powered analytics work?',
    answer:
      'Our platform integrates AI models to analyze your CSR data — generating insights on project performance, budget utilization, beneficiary impact, and risk alerts. Simply ask a question in English or Arabic and receive actionable recommendations based on your real-time data.',
  },
  {
    question: 'Who can use the platform?',
    answer:
      'The platform supports four user roles: Admins manage everything, Managers oversee projects and teams, Employees contribute to projects and submit ideas, and Viewers have read-only access to dashboards and reports. Organizations of any size can benefit from it.',
  },
  {
    question: 'Is the platform aligned with Oman Vision 2040?',
    answer:
      'Absolutely. Every project can be tagged with SDG goals, and reporting dashboards show alignment with Vision 2040 pillars. Impact reports break down beneficiary demographics, regional distribution, and social development metrics across Oman\'s governorates.',
  },
  {
    question: 'Can partners and donors contribute through the platform?',
    answer:
      'Yes. Partners can be registered with full profiles, and donations are tracked with live leaderboards. The system maintains transparent records of contributions, donor types, and allocation history — all linked to specific CSR projects.',
  },
];

function FAQIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <motion.svg
      width="18" height="18" viewBox="0 0 18 18" fill="none"
      animate={{ rotate: isOpen ? 45 : 0 }}
      transition={{ duration: 0.25 }}
      style={{ flexShrink: 0 }}
    >
      <line x1="9" y1="2" x2="9" y2="16" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="9" x2="16" y2="9" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" />
    </motion.svg>
  );
}

function FAQItemRow({
  item,
  isOpen,
  onClick,
}: {
  item: FAQItem;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div style={{ borderBottom: '1px solid #e5e7eb' }}>
      <button
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', padding: '22px 0', background: 'none', border: 'none', cursor: 'pointer', gap: 16 }}
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.4 }}>
          {item.question}
        </span>
        <FAQIcon isOpen={isOpen} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ paddingBottom: 22, fontSize: 14.5, lineHeight: 1.8, color: '#555', maxWidth: 560 }}>
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div>
      {faqData.map((item, index) => (
        <FAQItemRow
          key={index}
          item={item}
          isOpen={openIndex === index}
          onClick={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </div>
  );
}
