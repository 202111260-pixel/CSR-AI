type AppRole = 'admin' | 'manager' | 'employee' | 'viewer';

const UNIVERSITY_DOMAINS = (process.env.UNIVERSITY_EMAIL_DOMAINS || 'gcet.edu.om')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function isUniversityEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && UNIVERSITY_DOMAINS.includes(domain);
}

export function getEffectiveRole(email: string, role: AppRole): AppRole {
  // Any university-domain user gets full access regardless of stored DB role.
  if (isUniversityEmail(email)) return 'admin';
  return role;
}
