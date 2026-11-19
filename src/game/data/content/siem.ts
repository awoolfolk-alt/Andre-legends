export type SIEMLog = {
  id: string;
  timestamp: string;
  eventType: string;
  user: string;
  host: string;
  sourceIp: string;
  action: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  process?: string;
};

export type SIEMAlert = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  evidenceIds: string[];
  clue: string;
  recommendedPriority: "low" | "medium" | "high" | "critical";
  playbook: "phishing" | "malware" | "account";
};

export const SIEM_LOGS: SIEMLog[] = [
  { id: "log-01", timestamp: "2026-03-19T02:11:00Z", eventType: "USER_LOGIN", user: "jdoe", host: "WS-014", sourceIp: "203.0.113.44", action: "failed", severity: "medium", message: "Failed login; password not accepted" },
  { id: "log-02", timestamp: "2026-03-19T02:12:00Z", eventType: "USER_LOGIN", user: "jdoe", host: "WS-014", sourceIp: "203.0.113.44", action: "failed", severity: "medium", message: "Failed login; password not accepted" },
  { id: "log-03", timestamp: "2026-03-19T02:14:00Z", eventType: "USER_LOGIN", user: "jdoe", host: "WS-014", sourceIp: "203.0.113.44", action: "success", severity: "high", message: "Successful login after repeated failures" },
  { id: "log-04", timestamp: "2026-03-19T02:18:00Z", eventType: "FILE_ACCESS", user: "jdoe", host: "WS-014", sourceIp: "203.0.113.44", action: "read", severity: "high", message: "Unusual access to a restricted training folder" },
  { id: "log-05", timestamp: "2026-03-19T09:05:00Z", eventType: "EMAIL_REPORTED", user: "analyst", host: "MAIL-01", sourceIp: "192.0.2.77", action: "reported", severity: "medium", message: "Employee reported an unexpected credential request" },
  { id: "log-06", timestamp: "2026-03-19T09:07:00Z", eventType: "PROCESS_START", user: "analyst", host: "WS-022", sourceIp: "192.0.2.22", action: "started", severity: "high", message: "Unapproved process used unusually high CPU", process: "update-helper-training.exe" },
  { id: "log-07", timestamp: "2026-03-19T09:08:00Z", eventType: "NETWORK_CONNECT", user: "analyst", host: "WS-022", sourceIp: "203.0.113.91", action: "connected", severity: "high", message: "Process made an unexpected outbound connection", process: "update-helper-training.exe" },
  { id: "log-08", timestamp: "2026-03-19T11:30:00Z", eventType: "EMAIL_REPORTED", user: "bmoreno", host: "MAIL-01", sourceIp: "192.0.2.32", action: "reported", severity: "low", message: "Routine newsletter reported as suspicious; no credential request or unusual link" },
  { id: "log-09", timestamp: "2026-03-19T23:15:00Z", eventType: "FILE_ACCESS", user: "tnguyen", host: "FS-03", sourceIp: "192.0.2.19", action: "read", severity: "low", message: "Scheduled backup service read the approved archive" },
  { id: "log-10", timestamp: "2026-03-19T23:16:00Z", eventType: "BACKUP", user: "svc-backup", host: "FS-03", sourceIp: "192.0.2.20", action: "success", severity: "low", message: "Nightly backup completed on schedule" },
  { id: "log-11", timestamp: "2026-03-19T15:22:00Z", eventType: "USER_LOGIN", user: "analyst", host: "WS-005", sourceIp: "192.0.2.51", action: "success", severity: "low", message: "Normal local sign-in during business hours" },
  { id: "log-12", timestamp: "2026-03-19T15:40:00Z", eventType: "POLICY_CHANGE", user: "admin", host: "SRV-02", sourceIp: "192.0.2.2", action: "approved", severity: "low", message: "Approved training firewall policy update" },
];

export const SIEM_ALERTS: SIEMAlert[] = [
  {
    id: "alert-credential",
    title: "Repeated sign-in failures followed by success",
    severity: "high",
    summary: "Several failed logins for one account are followed by a successful login and unusual file access.",
    evidenceIds: ["log-01", "log-02", "log-03", "log-04"],
    clue: "Look at the same username, source IP, and timestamps in order. A success after repeated failures changes the risk.",
    recommendedPriority: "high",
    playbook: "account",
  },
  {
    id: "alert-phishing",
    title: "Credential request reported by an employee",
    severity: "medium",
    summary: "An employee reports an unexpected request for sign-in information.",
    evidenceIds: ["log-05"],
    clue: "A report is a starting point, not proof. Verify the message and check whether other people received it.",
    recommendedPriority: "medium",
    playbook: "phishing",
  },
  {
    id: "alert-process",
    title: "Unusual process and outbound connection",
    severity: "high",
    summary: "A process is using high CPU and then connects to an unfamiliar training address.",
    evidenceIds: ["log-06", "log-07"],
    clue: "Two related events on the same host are stronger evidence than a CPU spike alone.",
    recommendedPriority: "high",
    playbook: "malware",
  },
  {
    id: "alert-newsletter",
    title: "Newsletter reported as suspicious",
    severity: "low",
    summary: "A routine newsletter was reported, but the available logs show no credential request or unusual link.",
    evidenceIds: ["log-08"],
    clue: "This may be a false positive. Check message details and policy before closing it.",
    recommendedPriority: "low",
    playbook: "phishing",
  },
  {
    id: "alert-backup",
    title: "Late-night file access during backup",
    severity: "low",
    summary: "A file read occurs near the nightly backup window, followed by a successful scheduled backup.",
    evidenceIds: ["log-09", "log-10"],
    clue: "Compare the service account, host, schedule, and result. Time alone does not prove malicious activity.",
    recommendedPriority: "low",
    playbook: "account",
  },
];

export type SIEMSearchResult = { rows: SIEMLog[]; error?: string };

function matchesTerm(log: SIEMLog, term: string): boolean {
  const fieldMatch = /^([a-z_.]+)\s*(=|:)\s*"?([^"]+?)"?$/i.exec(term);
  if (!fieldMatch) {
    const text = term.replace(/\*/g, "").toLowerCase();
    return JSON.stringify(log).toLowerCase().includes(text);
  }
  const [, rawField, , rawValue] = fieldMatch;
  const field = rawField.toLowerCase();
  if (field === "index" && rawValue === "main") return true;
  const values: Record<string, string> = {
    user: log.user,
    host: log.host,
    source_ip: log.sourceIp,
    src_ip: log.sourceIp,
    action: log.action,
    severity: log.severity,
    event_type: log.eventType,
    "metadata.event_type": log.eventType,
    process: log.process ?? "",
    message: log.message,
  };
  const actual = values[field];
  if (actual === undefined) throw new Error(`Unknown SIEM field "${rawField}".`);
  const expected = rawValue.replace(/\*$/, "").toLowerCase();
  return rawValue.endsWith("*") ? actual.toLowerCase().startsWith(expected) : actual.toLowerCase() === expected;
}

export function searchSIEM(source: string, logs: SIEMLog[] = SIEM_LOGS): SIEMSearchResult {
  const query = source.trim().replace(/\bindex\s*=\s*main\b/gi, "").trim();
  if (!query) return { rows: [], error: "Add an event type, field filter, or search term after the index." };
  if (query.length > 300) return { rows: [], error: "Keep SIEM searches under 300 characters." };
  const terms = query.split(/\s+(AND|OR)\s+/i);
  if (!terms.length || terms.length > 15) return { rows: [], error: "Use a short search with up to 7 conditions." };
  try {
    return {
      rows: logs.filter((log) => {
        let result = matchesTerm(log, terms[0]);
        for (let index = 1; index < terms.length; index += 2) {
          const operator = terms[index].toLowerCase();
          const matched = matchesTerm(log, terms[index + 1] ?? "");
          result = operator === "and" ? result && matched : result || matched;
        }
        return result;
      }),
    };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : "The SIEM search could not be parsed." };
  }
}
