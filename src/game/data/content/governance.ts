export type AuditControl = {
  id: string;
  title: string;
  evidence: string;
  expectation: string;
  gap: boolean;
  framework: string;
  explanation: string;
};

export const AUDIT_CONTROLS: AuditControl[] = [
  { id: "admin-mfa", title: "Administrator MFA", evidence: "Two administrator accounts can sign in with only a password.", expectation: "Privileged accounts use multifactor authentication and access is reviewed.", gap: true, framework: "NIST CSF · Protect", explanation: "A password-only administrator account is a control gap. MFA makes a stolen password less useful, and access review checks whether admin rights are still needed." },
  { id: "restore-test", title: "Backup recovery test", evidence: "Backups ran successfully, but no one has tested restoring them in the last year.", expectation: "Recovery copies are protected and restore tests are documented.", gap: true, framework: "NIST CSF · Recover", explanation: "A successful backup job does not prove the data can be restored. A test checks integrity, access, and recovery time." },
  { id: "access-review", title: "Former contractor access", evidence: "A contractor's account is enabled 30 days after the contract ended.", expectation: "Access is removed promptly when a person's role ends.", gap: true, framework: "NIST CSF · Protect", explanation: "The account should be reviewed and disabled through the approved identity process. Keep a record of the owner and action." },
  { id: "vendor-review", title: "Vendor risk review", evidence: "A vendor handling customer data has no current security review or incident contact in the file.", expectation: "The organization evaluates vendor risk and records security responsibilities.", gap: true, framework: "NIST CSF · Govern", explanation: "Due diligence helps the organization understand the vendor's safeguards, responsibilities, and incident-notification path." },
  { id: "encryption", title: "Laptop encryption", evidence: "The device-management report shows encryption enabled and recovery keys escrowed for every assigned laptop.", expectation: "Company data on portable devices is protected at rest.", gap: false, framework: "NIST CSF · Protect", explanation: "The evidence supports the control for this sample. Continue checking exceptions and key-recovery procedures." },
];

export const FRAMEWORKS = [
  { name: "NIST CSF 2.0", purpose: "A voluntary framework for managing cybersecurity risk. The six functions are Govern, Identify, Protect, Detect, Respond, and Recover.", note: "Govern is the sixth function added in CSF 2.0; it spans and informs the other functions." },
  { name: "ISO/IEC 27001", purpose: "A standard for establishing and continually improving an information security management system.", note: "It is not a one-click product or a guarantee that no incident can happen." },
  { name: "PCI DSS", purpose: "An industry security standard for organizations that store, process, or transmit payment-card data.", note: "It is an industry standard, not itself a law. Determine whether the organization and data are in scope." },
  { name: "HIPAA", purpose: "U.S. health privacy and security requirements for covered entities and business associates handling protected health information.", note: "Do not assume every health-related company is automatically covered; check the organization's role and data." },
  { name: "GDPR", purpose: "A privacy regulation that can apply to organizations processing personal data of people in the European Union.", note: "Applicability depends on the organization, people, processing, and other legal facts; get qualified guidance." },
] as const;

export function calculateRisk(assetValue: number, exposurePercent: number, annualRate: number) {
  if (!Number.isFinite(assetValue) || assetValue < 0) throw new Error("Asset value must be zero or more.");
  if (!Number.isFinite(exposurePercent) || exposurePercent < 0 || exposurePercent > 100) throw new Error("Exposure factor must be between 0 and 100 percent.");
  if (!Number.isFinite(annualRate) || annualRate < 0) throw new Error("Annual rate of occurrence must be zero or more.");
  const singleLoss = assetValue * exposurePercent / 100;
  return { singleLoss, annualLoss: singleLoss * annualRate };
}
