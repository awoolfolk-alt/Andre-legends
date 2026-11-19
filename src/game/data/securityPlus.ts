export type StudySubjectId = "a-plus" | "network-plus" | "security-plus";

export interface StudyQuestion {
  prompt: string;
  options: [string, string, string, string];
  answer: number;
  explanation: string;
}

export interface StudyScenario {
  prompt: string;
  options: [string, string, string, string];
  answer: number;
  explanation: string;
}

export interface StudyStation {
  id: string;
  name: string;
  focus: string;
  guide: { heading: string; body: string }[];
  terms: { term: string; definition: string }[];
  questions: StudyQuestion[];
  scenarios: StudyScenario[];
  activities: [string, string, string];
}

export const STUDY_BUILDINGS: Record<StudySubjectId, {
  name: string;
  subject: string;
  available: boolean;
}> = {
  "a-plus": { name: "A+ Hardware & Support Lab", subject: "CompTIA A+", available: false },
  "network-plus": { name: "Network+ Infrastructure Lab", subject: "CompTIA Network+", available: false },
  "security-plus": { name: "Security+ Operations Center", subject: "CompTIA Security+", available: true },
};

export const SECURITY_PLUS_STATIONS: StudyStation[] = [
  {
    id: "governance",
    name: "Governance & Risk",
    focus: "Policies, risk decisions, compliance, and security program oversight",
    guide: [
      { heading: "Start with risk", body: "Risk is the chance that a threat will use a weakness and cause harm. Think of a school laptop: the asset is the laptop and its files, a threat might be theft, a vulnerability might be no screen lock, likelihood is how probable theft is, and impact is the harm if it happens. Risk analysis helps an organization choose a response instead of guessing." },
      { heading: "Choose a risk response", body: "Mitigate means lower the chance or damage (turn on encryption); avoid means stop the risky activity; transfer means share some financial loss (insurance), not hand off responsibility; accept means an authorized owner knowingly keeps the risk. Record who made the decision, why, and when it must be reviewed. A compensating control is a temporary or alternate safeguard when the preferred fix cannot be used yet." },
      { heading: "Governance sets direction", body: "A policy is management's big rule (protect company data). A standard makes that rule measurable (all laptops use approved encryption). A procedure gives the steps (how to enable encryption); a guideline suggests a helpful approach. Governance assigns an owner, approves rules, checks whether they work, and updates them when the business changes." },
      { heading: "Measure expected loss", body: "Asset value (AV) is the amount at stake. Exposure factor (EF) is the percent likely to be lost in one event. Single loss expectancy (SLE) = AV × EF. Annualized rate of occurrence (ARO) is the estimated events per year; annual loss expectancy (ALE) = SLE × ARO. Example: $10,000 × 20% = $2,000 SLE; if it happens twice yearly, ALE is $4,000/year. These are planning estimates, not promises." },
      { heading: "Match obligations carefully", body: "GDPR is a privacy law that can apply to personal data about people in the EU. HIPAA has specific privacy and security duties for covered health organizations and their business associates handling protected health information. PCI DSS is an industry standard for protecting payment-card data; it is not itself a law. Always check whether an organization and data are in scope before applying a rule." },
      { heading: "Controls have two labels", body: "Category tells what kind of safeguard it is: administrative (training or policy), technical (encryption or firewall), or physical (lock or camera). Function tells what it does: preventive blocks, detective spots, corrective fixes, deterrent discourages, compensating substitutes, and directive tells people what they must do. One control can have both labels—for example, a technical firewall rule can be preventive." },
    ],
    terms: [
      { term: "Mitigate", definition: "Reduce likelihood or impact by applying controls." },
      { term: "Transfer", definition: "Shift some financial impact, for example through insurance; accountability still remains." },
      { term: "SLE", definition: "Estimated loss from one occurrence: asset value × exposure factor." },
      { term: "ALE", definition: "Estimated yearly loss: SLE × annualized rate of occurrence." },
      { term: "Compensating control", definition: "An alternate safeguard used when the preferred control is infeasible." },
      { term: "Risk appetite", definition: "The broad amount and kind of risk an organization is willing to pursue or keep while meeting its goals." },
      { term: "Risk register", definition: "A living list of risks, their owners, likelihood/impact ratings, planned responses, and review status." },
      { term: "ARO", definition: "Annualized rate of occurrence: the estimated number of times a loss event happens in one year." },
      { term: "Exposure factor (EF)", definition: "The estimated percentage of an asset's value lost from one occurrence; use it as a decimal in SLE math." },
      { term: "Policy / standard / procedure", definition: "Policy sets the rule; a standard makes the rule specific and mandatory; a procedure explains the steps to follow." },
      { term: "Due diligence", definition: "Reasonable research before a decision, such as checking a vendor's security and privacy practices before sharing data." },
    ],
    questions: [
      { prompt: "A team cannot patch a legacy service this month. It places the service behind a restrictive proxy and records the exception. What is the proxy primarily?", options: ["A compensating control", "A risk transfer", "A data classification", "A recovery site"], answer: 0, explanation: "The proxy is an alternate technical safeguard that reduces exposure while the preferred patch is unavailable. The exception should have an owner and review date." },
      { prompt: "An asset is valued at $20,000, the exposure factor is 25%, and ARO is 2. What is the ALE?", options: ["$1,000", "$5,000", "$10,000", "$40,000"], answer: 2, explanation: "SLE = $20,000 × 0.25 = $5,000. ALE = $5,000 × 2 = $10,000 per year." },
      { prompt: "Leadership decides that a low-impact risk is within approved tolerance and documents the decision. Which response is this?", options: ["Avoid", "Accept", "Transfer", "Mitigate"], answer: 1, explanation: "Risk acceptance is a documented decision to retain a risk within the organization's approved tolerance." },
      { prompt: "Which document usually states management's high-level security intent and mandatory expectations?", options: ["Policy", "Procedure", "Runbook", "Work instruction"], answer: 0, explanation: "A policy sets direction and requirements. Standards add mandatory detail; procedures and runbooks describe how to perform work." },
      { prompt: "A payment processor asks a merchant to demonstrate protection of cardholder data. Which standard is most directly relevant?", options: ["HIPAA", "PCI DSS", "FERPA", "FIPS 140"], answer: 1, explanation: "PCI DSS is the payment-card industry security standard for entities that store, process, or transmit payment-card data." },
    ],
    scenarios: [
      { prompt: "A cloud vendor will process customer data. Before signing, what is the best first governance action?", options: ["Review data classification, vendor risk, contract terms, and required controls", "Give the vendor a shared administrator account", "Accept the vendor's marketing claims", "Disable logging to reduce their workload"], answer: 0, explanation: "Perform due diligence and define security, privacy, incident-notification, access, and retention obligations in the contract." },
      { prompt: "A department repeatedly bypasses an access-review requirement because the process is unclear. What is the strongest corrective first step?", options: ["Clarify ownership and procedure, train staff, then measure compliance", "Purchase cyber insurance", "Delete the access logs", "Mark the risk as transferred"], answer: 0, explanation: "A clear procedure, accountable owner, and training address the process failure; monitoring verifies that the correction works." },
      { prompt: "A control costs $30,000 yearly and is expected to lower ALE from $50,000 to $12,000. What is the estimated annual net benefit?", options: ["$8,000", "$12,000", "$30,000", "$38,000"], answer: 0, explanation: "Expected reduction is $50,000 − $12,000 = $38,000. Subtract the $30,000 control cost for an estimated $8,000 net benefit." },
    ],
    activities: ["Risk Decision Drill", "Governance Knowledge Check", "ALE Calculator Sprint"],
  },
  {
    id: "threats",
    name: "Threats & Social Engineering",
    focus: "Phishing, malware, attacker behavior, and threat-informed defense",
    guide: [
      { heading: "Spot social engineering", body: "Social engineering tricks people into taking an action or sharing information. Phishing usually arrives by email; smishing uses text messages; vishing uses voice calls; spear phishing targets a particular person; whaling targets senior leaders. Look for an unexpected request, pressure to act fast, unusual payment or password instructions, and a sender or web address that is slightly wrong. Verify using a contact method you already trust—not the reply link in the message." },
      { heading: "Know common malware behavior", body: "Malware is software used to harm or secretly control a device. Ransomware locks or steals data and demands payment. A worm spreads itself across systems; a virus attaches to a file and usually needs that file to run; a trojan pretends to be useful software. Spyware watches activity, a keylogger records typing, and a rootkit tries to hide privileged access. These describe behavior; one infection can combine several." },
      { heading: "Respond safely to a suspicious message or device", body: "Do not click, reply, forward the link, or open an unexpected file. Use the organization's report button or help desk and preserve the message details. If a device appears actively compromised, follow the incident plan and contact responders; only isolate it if your role and policy allow it. Do not wipe, reboot, or run random cleanup tools before evidence and impact are considered." },
      { heading: "Use ATT&CK as a map", body: "MITRE ATT&CK is a public catalog of behavior defenders have observed. A tactic is the attacker's goal (the why), such as gaining access; a technique is a way to reach that goal (the how). Analysts use the catalog to organize evidence and think of detections. A matching technique is a clue, not proof that a named attacker or a breach is confirmed." },
      { heading: "Separate threat terms", body: "A threat is something that could cause harm; a vulnerability is a weakness; an exploit is a method or code that takes advantage of a weakness; an indicator is a clue such as a suspicious domain or file hash. A CVE identifies a publicly known vulnerability. CVSS rates technical severity, while EPSS estimates the probability of exploitation in the wild. None alone proves that a particular computer was breached." },
    ],
    terms: [
      { term: "BEC", definition: "Business email compromise: impersonation or account abuse to manipulate business transactions." },
      { term: "Worm", definition: "Malware that can spread between systems without needing to attach to a host file." },
      { term: "Rootkit", definition: "Malicious tooling designed to conceal activity or maintain privileged access." },
      { term: "Tactic", definition: "The adversary's objective in ATT&CK, such as persistence or credential access." },
      { term: "Indicator", definition: "An observable clue, such as a hash or domain, that needs context and validation." },
      { term: "Phishing", definition: "A deceptive message that tries to make someone reveal information, send money, or open harmful content." },
      { term: "Spear phishing", definition: "A phishing attempt tailored to a specific person or group using details that make the request seem believable." },
      { term: "Smishing / vishing", definition: "Phishing delivered by SMS text / phishing delivered by a voice call." },
      { term: "Trojan", definition: "Malware disguised as legitimate or helpful software; the disguise tricks someone into running it." },
      { term: "Ransomware", definition: "Malware that blocks access to data or systems, often by encrypting files, and demands payment." },
      { term: "CVE / CVSS / EPSS", definition: "CVE names a known vulnerability; CVSS scores its technical severity; EPSS estimates the chance it will be exploited soon." },
    ],
    questions: [
      { prompt: "An email uses a look-alike sender domain and asks payroll to change an employee's bank details urgently. What is the best classification?", options: ["Business email compromise / phishing attempt", "A normal password reset", "A software vulnerability", "A disaster-recovery test"], answer: 0, explanation: "The impersonation, financial redirection, and urgency are common BEC indicators. Verify through a known, separate contact channel." },
      { prompt: "Which behavior most strongly distinguishes a worm from a basic trojan?", options: ["Self-propagation between systems", "Displaying a fake login screen", "Using a misleading filename", "Encrypting a single local file"], answer: 0, explanation: "A worm can self-propagate. A trojan relies on deceptive appearance or delivery and does not inherently self-spread." },
      { prompt: "In MITRE ATT&CK, what does a tactic represent?", options: ["An adversary objective or reason for an action", "A specific software patch", "A confirmed attribution to a person", "A complete incident timeline"], answer: 0, explanation: "Tactics describe adversary goals; techniques describe methods used to accomplish those goals." },
      { prompt: "A user reports an unexpected attachment. What should the analyst do first?", options: ["Follow the reporting and triage process; preserve details and avoid opening it", "Forward it to personal email", "Open it on the user's workstation", "Delete the mailbox before documenting it"], answer: 0, explanation: "Preserve the message and context, avoid execution, and use approved analysis and escalation procedures." },
      { prompt: "Which statement correctly distinguishes vulnerability from threat?", options: ["A vulnerability is a weakness; a threat can exploit or cause harm through it", "They are exact synonyms", "A threat is always a patch", "A vulnerability is proof of compromise"], answer: 0, explanation: "A weakness can be exploited by a threat; risk analysis then evaluates likelihood and impact." },
    ],
    scenarios: [
      { prompt: "A message appears to come from the CEO and requests gift cards. The sender address differs by one character. What is the best response?", options: ["Do not act; report it and verify using a known contact method", "Reply asking whether it is real", "Buy one card to test the request", "Forward it to coworkers as a warning with the link intact"], answer: 0, explanation: "Use the reporting channel and independent verification; do not reply to or interact with the suspicious message." },
      { prompt: "An endpoint is encrypting shared files and new encryption activity is still occurring. What is the priority?", options: ["Use the incident plan to contain the endpoint and alert responders", "Reboot every server immediately", "Pay the ransom before collecting facts", "Delete logs to stop disk use"], answer: 0, explanation: "Contain ongoing impact using authorized procedures, preserve evidence, and coordinate response; avoid destructive improvisation." },
      { prompt: "An alert matches an ATT&CK technique but the host owner says the activity was a scheduled script. What should the analyst do?", options: ["Validate asset, account, timing, and change context before disposition", "Close it because ATT&CK matched", "Declare a breach based on the technique ID alone", "Disable all automation permanently"], answer: 0, explanation: "ATT&CK mapping helps organize evidence but is not proof. Correlate logs and authorized change records." },
    ],
    activities: ["Phish or Legit?", "Malware Behavior Quiz", "Threat Term Recall"],
  },
  {
    id: "architecture",
    name: "Secure Architecture & Networks",
    focus: "VPNs, segmentation, identity, zero trust, and secure design",
    guide: [
      { heading: "Build defense in depth", body: "Defense in depth means using several different safeguards so one missed safeguard does not expose everything. For an online account, that might mean a strong sign-in, MFA, a managed device, limited permissions, network filtering, alerts, and tested backups. A control should match the risk: backups help recovery, but they do not stop someone from reading a stolen file." },
      { heading: "VPNs protect a path", body: "A virtual private network (VPN) creates an authenticated, encrypted connection across a network you do not control, such as public Wi-Fi. IPsec and TLS are technologies that can protect VPN traffic. A VPN protects the path; it does not automatically make the laptop safe or guarantee that every destination is trustworthy. Organizations still check identity, device health, permissions, and logs." },
      { heading: "Zero trust verifies explicitly", body: "Zero trust means do not grant access just because someone is inside the office network. For each request, check who is asking, which device they use, what they want to reach, and whether the context meets policy. Then give only the access needed and re-check when conditions change. It is an architecture and set of principles, not one product." },
      { heading: "Segment to limit blast radius", body: "Segmentation divides a network into zones—for example, guest Wi-Fi, employee devices, public web servers, and sensitive databases. A firewall or cloud rule should allow only required connections between zones. If one device is compromised, good boundaries make it harder to reach everything else. Segmentation reduces risk but cannot replace patching, endpoint controls, or monitoring." },
      { heading: "Protect data and identity", body: "Encryption makes data unreadable without the right key; protect keys as carefully as the data. MFA uses different factor types: something you know (password), have (security key), or are (fingerprint). Two passwords are still one factor type. RBAC gives permissions through job roles; ABAC considers attributes such as department, device, resource sensitivity, and time. Least privilege limits both to what the task actually needs." },
    ],
    terms: [
      { term: "IPsec", definition: "A suite commonly used to protect IP traffic and build VPN tunnels." },
      { term: "Split tunneling", definition: "Only selected traffic uses the VPN; other traffic goes directly to its destination." },
      { term: "Segmentation", definition: "Dividing networks or systems into controlled zones to limit access and lateral movement." },
      { term: "MFA", definition: "Authentication using at least two different factor categories, not two copies of one factor." },
      { term: "ABAC", definition: "Access decisions based on attributes of the subject, resource, action, and environment." },
      { term: "IPsec / TLS", definition: "Cryptographic protocols commonly used to protect network traffic; VPN products may use one or both." },
      { term: "Full tunnel", definition: "Routes all device network traffic through the VPN; this centralizes filtering but uses more network capacity." },
      { term: "Zero trust", definition: "A security approach that explicitly verifies each access request instead of trusting a user merely because they are on an internal network." },
      { term: "RBAC", definition: "Role-based access control: permissions are assigned to job roles, then users receive the roles they need." },
      { term: "Least privilege", definition: "Give only the minimum permissions needed, for only as long as they are needed." },
      { term: "Network segmentation", definition: "Separating systems into zones and limiting traffic between them to reduce unnecessary access and breach impact." },
    ],
    questions: [
      { prompt: "A remote employee uses public Wi-Fi to access internal resources. Which combination best reduces risk?", options: ["Managed-device VPN, MFA, least-privilege access, and monitoring", "VPN only, with shared administrator credentials", "Disable endpoint updates while remote", "Expose all internal services to the internet"], answer: 0, explanation: "A VPN protects traffic in transit; MFA, device management, least privilege, and monitoring address identity and endpoint risks." },
      { prompt: "What is the primary purpose of network segmentation?", options: ["Limit unnecessary communication and reduce the blast radius", "Replace all endpoint controls", "Make every subnet publicly reachable", "Guarantee that malware cannot spread"], answer: 0, explanation: "Segmentation restricts traffic paths and can constrain lateral movement, but it does not guarantee prevention." },
      { prompt: "Which access-control model evaluates attributes such as department, device posture, and data sensitivity?", options: ["ABAC", "DAC only", "WEP", "Single sign-on"], answer: 0, explanation: "Attribute-based access control makes policy decisions from attributes of the user, resource, action, and context." },
      { prompt: "What does split tunneling mean?", options: ["Some traffic uses the VPN while other traffic bypasses it", "Two users share a password", "A VPN encrypts data at rest", "A firewall inspects only inbound packets"], answer: 0, explanation: "Split tunneling routes only selected traffic through the VPN, which has security and privacy trade-offs." },
      { prompt: "Which option is an example of a possession factor?", options: ["A hardware security key", "A memorized passphrase", "A fingerprint", "A user's job title"], answer: 0, explanation: "A security key is something the user has. A passphrase is something they know; a fingerprint is something they are." },
    ],
    scenarios: [
      { prompt: "A VPN-connected laptop is missing security updates and has malware alerts. What should happen before granting access to sensitive systems?", options: ["Quarantine or restrict it under device-posture policy and remediate it", "Trust it because the VPN is encrypted", "Disable MFA to speed up access", "Move it to the server subnet"], answer: 0, explanation: "Encrypted transport does not establish device health. Apply conditional access or quarantine, then remediate." },
      { prompt: "A web server in a public subnet needs to query an internal database. What is the safer design?", options: ["Allow only the required database flow from the web tier to the database tier", "Place both servers on an unrestricted public network", "Allow every port between all subnets", "Use a VPN instead of any firewall rules"], answer: 0, explanation: "Use least-privilege network rules and separate tiers to reduce exposure and lateral movement." },
      { prompt: "A contractor needs read-only access to one project for two weeks. Which design is best?", options: ["Named account, MFA, scoped role, expiration, and access review", "Shared permanent administrator account", "A public file link with no expiration", "Grant broad access and rely on a VPN"], answer: 0, explanation: "Use a unique identity, least privilege, MFA, time-bounded access, and review/revoke it when work ends." },
    ],
    activities: ["Build the VPN Tunnel", "Access Control Gatekeeper", "OSI Layer Sprint"],
  },
  {
    id: "operations",
    name: "Security Operations & Response",
    focus: "SOC triage, incident handling, forensics, and recovery",
    guide: [
      { heading: "Triage with context", body: "An alert is a signal to investigate, not a verdict. Start with what triggered it, which computer and account are involved, when it happened, and whether a change or normal task explains it. Compare related endpoint, sign-in, email, and network records. Write down what you know, what you do not know, and the next safe question. Follow severity and escalation rules." },
      { heading: "Respond in a controlled sequence", body: "Preparation means plans, roles, tools, and practice are ready. Detection and analysis confirm what is happening and how far it reaches. Containment limits spread; eradication removes the cause; recovery safely restores service; lessons learned improve the next response. Real incidents can require steps to overlap, so use the organization's approved plan and safety priorities rather than treating this as a blind checklist." },
      { heading: "Preserve evidence", body: "Record who did what, on which device, and at what time (including time zone). Keep original logs or files protected from unnecessary changes. Chain of custody is the record of who collected, accessed, transferred, and stored evidence. It helps show that evidence has not been casually altered. Follow privacy, legal-hold, and escalation rules before collecting personal or sensitive data." },
      { heading: "Recover and learn", body: "Do not restore a system from a backup just because it is available. Confirm that the backup is clean, close the known entry path, get the required approval, and check the restored system. Monitor for the same warning signs. After service is stable, review what worked, where the plan was confusing, and which safeguards or training should change." },
      { heading: "Use telemetry deliberately", body: "A SIEM collects and correlates logs to help analysts investigate across systems. EDR focuses on endpoint activity and response. IDS detects suspicious network activity; IPS can block it. SOAR automates approved response workflows. These tools provide evidence and speed—not perfect answers. Protect logs, check timestamps, and verify an alert before taking disruptive action." },
    ],
    terms: [
      { term: "Containment", definition: "Limit an incident's spread or impact while preserving a path to investigate and recover." },
      { term: "Eradication", definition: "Remove the cause and persistence mechanisms after scope is understood." },
      { term: "Recovery", definition: "Restore services safely and monitor for normal operation or recurrence." },
      { term: "Chain of custody", definition: "Documented control and handling history for evidence." },
      { term: "SIEM", definition: "A platform that collects and correlates security events to support monitoring and investigation." },
      { term: "Preparation", definition: "The people, plan, training, contacts, and tools arranged before an incident happens." },
      { term: "Detection and analysis", definition: "Notice a possible incident, validate evidence, and understand affected users, systems, and scope." },
      { term: "SOAR", definition: "Security orchestration, automation, and response: connects tools and runs approved playbooks to reduce repetitive work." },
      { term: "EDR", definition: "Endpoint detection and response: records and helps investigate activity on laptops, servers, and other endpoints." },
      { term: "IDS / IPS", definition: "An intrusion detection system alerts on suspicious activity; an intrusion prevention system can also block it." },
      { term: "Chain of custody", definition: "A time-stamped record of who collected, handled, transferred, or stored evidence." },
      { term: "Dwell time", definition: "How long an attacker or unwanted activity remains in an environment before it is detected or removed." },
    ],
    questions: [
      { prompt: "What is the primary goal of containment during incident response?", options: ["Limit ongoing impact and prevent spread", "Immediately publish attribution", "Erase all evidence", "Skip analysis and restore from any backup"], answer: 0, explanation: "Containment limits damage while responders preserve evidence and plan eradication and recovery." },
      { prompt: "Why document evidence handling and chain of custody?", options: ["Show who handled evidence and whether its integrity was maintained", "Make an alert automatically true", "Replace incident response", "Avoid recording timestamps"], answer: 0, explanation: "A handling record supports integrity, accountability, and potential legal or policy requirements." },
      { prompt: "A SIEM alert is generated by a known maintenance task. What is the best analyst action?", options: ["Verify the approved change and supporting telemetry before closing or tuning", "Delete the alert and all logs", "Disable the detection globally", "Assume every alert is a false positive"], answer: 0, explanation: "Correlate the alert with authorized changes and evidence, document disposition, and tune only with appropriate review." },
      { prompt: "When is eradication normally appropriate?", options: ["After enough analysis and containment to remove the cause safely", "Before identifying affected systems", "Instead of evidence preservation", "Only after public attribution"], answer: 0, explanation: "Understand scope and contain first as appropriate, then remove malware, persistence, or exploited weaknesses." },
      { prompt: "After service restoration, what is an important recovery action?", options: ["Validate integrity and monitor for recurrence", "Delete backups", "Stop collecting logs", "Assume the incident is over without checking"], answer: 0, explanation: "Recovery includes validating systems, monitoring, and improving controls based on lessons learned." },
    ],
    scenarios: [
      { prompt: "An endpoint contacts a suspicious domain, and the user reports a file opened minutes earlier. What is the best first triage step?", options: ["Correlate endpoint, DNS/proxy, identity, and time evidence while following the response plan", "Wipe the system before capturing details", "Ignore it if antivirus is installed", "Ask the user to revisit the domain"], answer: 0, explanation: "Correlate relevant telemetry, preserve context, and follow escalation/containment procedures based on severity." },
      { prompt: "A ransomware incident affects one workstation and may be spreading to shares. What should the SOC prioritize?", options: ["Contain the affected endpoint and coordinate scope assessment with incident responders", "Wait for the next daily report", "Delete central logs", "Restore the workstation before checking shared files"], answer: 0, explanation: "Limit spread, coordinate response, and determine scope before eradication and recovery actions." },
      { prompt: "A backup is available after a breach. What should be confirmed before restoring production?", options: ["The backup is known-good, the entry path is addressed, and restoration is authorized", "The backup is the newest regardless of compromise", "All logs can be discarded", "The affected account remains active"], answer: 0, explanation: "Validate backup integrity, remove the cause, coordinate approval, and monitor restored systems." },
    ],
    activities: ["Incident Response Race", "SOC Alert Triage", "Evidence Term Recall"],
  },
];

export const SECURITY_PLUS_REFERENCES = [
  { label: "Official certification page and current exam links", description: "Use CompTIA's current exam link and objective PDF to confirm which version you are preparing for; exam versions change.", url: "https://www.comptia.org/en-us/certifications/security/" },
  { label: "NIST Cybersecurity Framework 2.0", description: "A free overview of how organizations Govern, Identify, Protect, Detect, Respond, and Recover from cybersecurity risk.", url: "https://www.nist.gov/cyberframework" },
  { label: "NIST incident response guide (SP 800-61 Rev. 3)", description: "A practical, authoritative reference for preparing for and responding to cybersecurity incidents.", url: "https://csrc.nist.gov/pubs/sp/800/61/r3/final" },
  { label: "CISA: Recognize and report phishing", description: "Plain-language signs of phishing and what to do when you receive a suspicious message.", url: "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing" },
  { label: "NIST Zero Trust Architecture (SP 800-207)", description: "Explains zero-trust principles and why network location alone should not grant access.", url: "https://csrc.nist.gov/pubs/sp/800/207/final" },
  { label: "MITRE ATT&CK", description: "A searchable knowledge base defenders use to understand observed adversary goals and behaviors; use it as a map, not proof of an incident.", url: "https://attack.mitre.org/" },
];
