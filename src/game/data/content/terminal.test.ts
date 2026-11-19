import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createTerminalSession, executeTerminalCommand, tokenize } from "./terminal";

describe("Bash simulator tokenization", () => {
  it("preserves quoted phrases and parses command arguments", () => {
    expect(tokenize('grep -i "failed login" auth.log')).toEqual(["grep", "-i", "failed login", "auth.log"]);
  });

  it("rejects an unclosed quote", () => {
    expect(() => tokenize('grep "failed login')).toThrow(/missing closing quote/);
  });
});

describe("virtual terminal commands", () => {
  it("supports navigation and hidden-file listing without escaping the virtual root", async () => {
    const start = createTerminalSession(2);
    const parent = await executeTerminalCommand(start, "cd ..");
    expect(parent.session.cwd).toBe("/home");
    const home = await executeTerminalCommand(parent.session, "cd ~");
    expect(home.session.cwd).toBe("/home/analyst");
    const listing = await executeTerminalCommand(home.session, "ls -a");
    expect(listing.output.join("\n")).toContain(".leftShift3");
    const root = await executeTerminalCommand(home.session, "cd ../../../../");
    expect(root.session.cwd).toBe("/");
  });

  it("pipes filtered log output into a line counter", async () => {
    const result = await executeTerminalCommand(createTerminalSession(3), "grep -i error logs/server_logs.txt | wc -l");
    expect(result.output).toEqual(["3"]);
  });

  it("supports virtual file creation, copying, moving, and redirected writes", async () => {
    let session = createTerminalSession(4);
    session = (await executeTerminalCommand(session, "mkdir work")).session;
    session = (await executeTerminalCommand(session, "cp Q3patches.txt work")).session;
    session = (await executeTerminalCommand(session, "mv work/Q3patches.txt reports")).session;
    session = (await executeTerminalCommand(session, 'echo "Completed the lab" >> notes/tasks.txt')).session;
    expect(session.files["/home/analyst/reports/Q3patches.txt"]?.content).toContain("Patch review");
    expect(session.files["/home/analyst/notes/tasks.txt"]?.content).toContain("Completed the lab");
    expect(session.files["/home/analyst/work/Q3patches.txt"]).toBeUndefined();
  });

  it("requires a confirmation before recursive removal and protects virtual system roots", async () => {
    const session = createTerminalSession(4);
    const confirmation = await executeTerminalCommand(session, "rm -r drafts");
    expect(confirmation.confirmation?.question).toContain("[y/N]");
    expect(confirmation.session.files["/home/analyst/drafts"]).toBeDefined();
    const removed = await executeTerminalCommand(session, "rm -r drafts", { confirmed: true });
    expect(removed.session.files["/home/analyst/drafts"]).toBeUndefined();
    const root = await executeTerminalCommand(session, "rm -r /", { confirmed: true });
    expect(root.output.join()).toContain("protected training root");
    expect(root.session.files["/home/analyst"]).toBeDefined();
  });

  it("applies symbolic and numeric permission changes", async () => {
    const initial = createTerminalSession(5);
    const symbolic = await executeTerminalCommand(initial, "chmod g+w access.txt");
    expect(symbolic.session.files["/home/analyst/access.txt"]?.permissions).toBe("-rw-rw----");
    const numeric = await executeTerminalCommand(symbolic.session, "chmod 640 access.txt");
    expect(numeric.session.files["/home/analyst/access.txt"]?.permissions).toBe("-rw-r-----");
  });

  it("requires sudo for account administration and applies group membership", async () => {
    const initial = createTerminalSession(5);
    const denied = await executeTerminalCommand(initial, "useradd tnguyen");
    expect(denied.output.join()).toContain("Try sudo");
    const created = await executeTerminalCommand(initial, "sudo useradd tnguyen");
    const updated = await executeTerminalCommand(created.session, "sudo usermod -aG security tnguyen");
    expect(updated.session.users.tnguyen).toContain("security");
  });

  it("uses a real SHA-256 digest for virtual file content", async () => {
    const session = createTerminalSession();
    const result = await executeTerminalCommand(session, "sha256sum readme.txt");
    const expected = createHash("sha256")
      .update("Welcome, analyst. All commands here run in a fictional training environment.")
      .digest("hex");
    expect(result.output[0]).toBe(`${expected}  readme.txt`);
  });

  it("evaluates simple arithmetic without executing JavaScript", async () => {
    const valid = await executeTerminalCommand(createTerminalSession(), "expr 7 + 5 * 2");
    expect(valid.output).toEqual(["17"]);
    const invalid = await executeTerminalCommand(createTerminalSession(), 'expr process.exit(1)');
    expect(invalid.output.join()).toContain("invalid expression");
  });
});
