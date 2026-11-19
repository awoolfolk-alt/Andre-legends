import { describe, expect, it } from "vitest";
import { createPowerShellSession, executePowerShell } from "./powershell";

describe("PowerShell training simulator", () => {
  it("supports navigation, aliases, and filtering fictional log data", () => {
    let session = createPowerShellSession();
    session = executePowerShell(session, "pwd");
    session = executePowerShell(session, "Select-String -Pattern failed -Path auth.log");
    expect(session.output.join("\n")).toContain("event=4625");
    session = executePowerShell(session, "cd C:\\Users\\analyst");
    expect(session.cwd).toBe("C:\\Users\\analyst");
  });

  it("passes simulated objects through Where-Object and Select-Object", () => {
    const session = executePowerShell(createPowerShellSession(), "Get-Process | Where-Object {$_.CPU -gt 50} | Select-Object Name,CPU");
    expect(session.output.join("\n")).toContain("Updater");
    expect(session.output.join("\n")).not.toContain("Browser");
  });

  it("requires simulated elevation for account changes", () => {
    const guest = executePowerShell(createPowerShellSession(), "Disable-LocalUser -Name jdoe");
    expect(guest.output.join("\n")).toContain("Access denied");
    const admin = { ...createPowerShellSession(), elevated: true };
    const changed = executePowerShell(admin, "Disable-LocalUser -Name jdoe");
    expect(changed.users.find((user) => user.Name === "jdoe")?.Enabled).toBe(false);
  });

  it("never executes unsupported or real system commands", () => {
    const session = executePowerShell(createPowerShellSession(), "format c:");
    expect(session.output.join("\n")).toContain("not available in this safe simulator");
    expect(session.files["c:\\users\\analyst\\documents\\readme.txt"].content).toContain("fictional");
  });
});
