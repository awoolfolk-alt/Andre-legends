export type PhishChannel = "Work email" | "SMS" | "Voice call" | "Social" | "QR code" | "MFA app";
export type PhishMessage = {
  id: string;
  channel: PhishChannel;
  sender: string;
  preview: string;
  body: string;
  verdict: "phish" | "legit";
  redFlags: string[];
  action: string;
  explanation: string;
};

const campaigns: Omit<PhishMessage, "id">[] = [
  {
    channel: "Work email",
    sender: "Service Desk <helpdesk@northwind-login.example>",
    preview: "Account access ends today",
    body: "Your access will be suspended at 5 PM. Reply with your password and the six-digit sign-in code so we can keep your account active.",
    verdict: "phish",
    redFlags: ["urgent deadline", "password request", "MFA code request", "spoofed sender"],
    action: "Report it using the approved security-report button.",
    explanation: "Support staff should never ask for your password or one-time sign-in code. Use the organization's known support channel.",
  },
  {
    channel: "Work email",
    sender: "Finance Desk <payments@northwind-ledger.example>",
    preview: "Change vendor bank details",
    body: "I am in a meeting. Change tomorrow's vendor payment to the new account in the attached form. Please skip the usual call because this is confidential.",
    verdict: "phish",
    redFlags: ["payment change", "urgency", "unexpected attachment", "bypassing process"],
    action: "Verify the request using a known phone number and report the message.",
    explanation: "A sudden bank-detail change plus pressure to skip verification is a common business-email-compromise pattern.",
  },
  {
    channel: "Work email",
    sender: "Training Office <learning@northwind.example>",
    preview: "Your annual safety course is ready",
    body: "Your assigned annual safety course is available in the company learning portal. Open the portal from your usual bookmark to review the due date.",
    verdict: "legit",
    redFlags: [],
    action: "Open the saved company portal directly and check the assignment there.",
    explanation: "This message does not ask for a password, payment, or urgent action through a link. Going to the known portal is still a careful choice.",
  },
  {
    channel: "SMS",
    sender: "Unknown number · (312) 555-0184",
    preview: "Package delivery fee",
    body: "Delivery could not be completed. Pay a small redelivery fee at parcel-check.example within 20 minutes or the package will be returned.",
    verdict: "phish",
    redFlags: ["unexpected fee", "urgent deadline", "unverified link"],
    action: "Do not open the link; check tracking in the carrier's official app or website.",
    explanation: "Unexpected delivery-fee texts are a common smishing lure. Check through a trusted channel, not the message link.",
  },
  {
    channel: "Voice call",
    sender: "Caller ID: Internal IT",
    preview: "Caller asks for a sign-in code",
    body: "The caller says they are fixing a mailbox problem and need the one-time MFA number that just appeared on your phone.",
    verdict: "phish",
    redFlags: ["unexpected MFA request", "one-time code request", "unverified caller"],
    action: "Decline, end the call, and contact IT through the known help desk number.",
    explanation: "A one-time code is a temporary key. Never read it to a caller, even if caller ID looks familiar.",
  },
  {
    channel: "Social",
    sender: "Help Team · account created yesterday",
    preview: "Support reply to your public complaint",
    body: "We can fix this right now. Send us your account email and verification code in a direct message; do not contact the official support page.",
    verdict: "phish",
    redFlags: ["new unverified account", "verification code request", "avoid official channel"],
    action: "Do not send details; report the account and contact support through the official app.",
    explanation: "Fake support accounts often approach people who post complaints publicly. Move to a verified support channel.",
  },
  {
    channel: "QR code",
    sender: "Flyer beside a shared office printer",
    preview: "Scan to reconnect your printer",
    body: "The QR code opens a sign-in page that asks for your company email and password before showing printer instructions.",
    verdict: "phish",
    redFlags: ["unexpected QR login", "credential request", "unverified destination"],
    action: "Close the page and ask IT using a known contact method.",
    explanation: "A QR image can hide its destination. Do not enter work credentials into an unverified page.",
  },
  {
    channel: "MFA app",
    sender: "Sign-in prompt · location not recognized",
    preview: "Approve sign-in?",
    body: "A login approval appears while you are not trying to sign in. Three more prompts arrive after you reject the first.",
    verdict: "phish",
    redFlags: ["unsolicited MFA prompt", "repeated approval requests"],
    action: "Reject the prompts and report them; change credentials through the known sign-in page if instructed.",
    explanation: "Repeated prompts can be an MFA-fatigue attempt. Never approve a request you did not initiate.",
  },
  {
    channel: "Work email",
    sender: "Project Coordinator <updates@northwind.example>",
    preview: "Meeting notes are available",
    body: "The notes from today's project meeting are in the usual shared workspace. The message includes the expected project name and no request to sign in again.",
    verdict: "legit",
    redFlags: [],
    action: "Open the shared workspace from your saved bookmark and review the notes.",
    explanation: "Context can support legitimacy, but a familiar name alone is not proof. Open the known workspace directly.",
  },
  {
    channel: "SMS",
    sender: "Unknown number · short code",
    preview: "Sign-in approval you did not request",
    body: "A sign-in code is 482913. Reply YES to keep your account, or call the number in this text immediately.",
    verdict: "phish",
    redFlags: ["unsolicited MFA code", "urgent threat", "unverified phone number"],
    action: "Do not reply or share the code; report the message and review account activity through the official app.",
    explanation: "An unsolicited code may mean someone is trying to sign in. Sharing or replying can help them complete it.",
  },
];

const variations = [
  { org: "Northwind", senderSuffix: "service", deadline: "today", project: "Orchid" },
  { org: "Cedar Grove", senderSuffix: "support", deadline: "before lunch", project: "Maple" },
  { org: "Blue Harbor", senderSuffix: "accounts", deadline: "within one hour", project: "Comet" },
  { org: "Pine Ledger", senderSuffix: "help", deadline: "by 4 PM", project: "Cobalt" },
];

export const PHISH_MESSAGES: PhishMessage[] = campaigns.flatMap((message, index) =>
  variations.map((variation, version) => ({
    ...message,
    id: `phish-${index + 1}-${version + 1}`,
    sender: message.sender.replaceAll("northwind", variation.org.toLowerCase().replace(/\s+/g, "-"))
      .replace(/service|support|accounts|help/, variation.senderSuffix),
    preview: message.preview.replace("today", variation.deadline),
    body: message.body.replaceAll("Northwind", variation.org).replaceAll("Orchid", variation.project)
      .replace("at 5 PM", `at ${variation.deadline}`),
  })),
);
