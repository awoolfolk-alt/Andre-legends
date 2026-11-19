export type PowerShellRecord = Record<string, string | number | boolean>;
export type PowerShellSession = {
  cwd: string;
  files: Record<string, { path: string; content: string; directory: boolean }>;
  processes: PowerShellRecord[];
  services: PowerShellRecord[];
  users: PowerShellRecord[];
  output: string[];
  history: string[];
  elevated: boolean;
};

const ROOT = "C:\\Users\\analyst";
const initialFiles: PowerShellSession["files"] = Object.fromEntries([
  [ROOT, { path: ROOT, content: "", directory: true }],
  [`${ROOT}\\Documents`, { path: `${ROOT}\\Documents`, content: "", directory: true }],
  [`${ROOT}\\Documents\\readme.txt`, { path: `${ROOT}\\Documents\\readme.txt`, content: "CyberPrep PowerShell lab. All commands are simulated.", directory: false }],
  [`${ROOT}\\Documents\\auth.log`, { path: `${ROOT}\\Documents\\auth.log`, content: "2026-03-02 user=analyst event=4624 status=success\n2026-03-02 user=jdoe event=4625 status=failed\n2026-03-02 user=jdoe event=4625 status=failed\n2026-03-02 user=bmorris event=4720 status=created\n", directory: false }],
  [`${ROOT}\\Documents\\tasks.txt`, { path: `${ROOT}\\Documents\\tasks.txt`, content: "Review the training files.\n", directory: false }],
  ["C:\\Windows", { path: "C:\\Windows", content: "", directory: true }],
]);

export function createPowerShellSession(): PowerShellSession {
  return {
    cwd: `${ROOT}\\Documents`,
    files: Object.fromEntries(Object.entries(initialFiles).map(([path, file]) => [path.toLowerCase(), structuredClone(file)])),
    processes: [
      { Id: 420, Name: "Browser", CPU: 3, Status: "Running" },
      { Id: 812, Name: "Updater", CPU: 95, Status: "Running" },
      { Id: 910, Name: "Indexer", CPU: 12, Status: "Running" },
    ],
    services: [
      { Name: "EventLog", Status: "Running" },
      { Name: "TrainingAgent", Status: "Stopped" },
    ],
    users: [
      { Name: "analyst", Enabled: true, Groups: "Users" },
      { Name: "jdoe", Enabled: true, Groups: "Users" },
    ],
    output: ["CyberPrep PowerShell simulator · fictional Windows environment only.", "Type Get-Help for examples. Nothing runs on your computer."],
    history: [],
    elevated: false,
  };
}

function tokenize(line: string): string[] {
  const result: string[] = [];
  let token = "";
  let quote = "";
  for (const char of line.trim()) {
    if (quote) {
      if (char === quote) quote = "";
      else token += char;
    } else if (char === "'" || char === '"') quote = char;
    else if (/\s/.test(char)) {
      if (token) result.push(token);
      token = "";
    } else token += char;
  }
  if (quote) throw new Error("Missing closing quote.");
  if (token) result.push(token);
  return result;
}

function resolvePath(cwd: string, input = "."): string {
  let expanded = input.replace(/\//g, "\\");
  if (expanded === "~") expanded = ROOT;
  else if (expanded.startsWith(".\\")) expanded = `${cwd}\\${expanded.slice(2)}`;
  else if (expanded === "..") expanded = cwd.slice(0, cwd.lastIndexOf("\\"));
  else if (expanded.startsWith("..\\")) expanded = `${cwd.slice(0, cwd.lastIndexOf("\\"))}\\${expanded.slice(3)}`;
  else if (!/^[a-z]:\\/i.test(expanded)) expanded = `${cwd}\\${expanded}`;
  return expanded.replace(/\\+/g, "\\").replace(/\\$/, "").toLowerCase();
}

function format(records: PowerShellRecord[]): string[] {
  return records.map((record) => Object.entries(record).map(([key, value]) => `${key}: ${value}`).join("  "));
}

export function executePowerShell(session: PowerShellSession, command: string): PowerShellSession {
  const next = structuredClone(session);
  const entered = command.trim();
  if (!entered) return next;
  next.history.push(entered);
  try {
    const stages = entered.split(/\s+\|\s+/);
    let rows: PowerShellRecord[] = [];
    let lines: string[] = [];
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
      const args = tokenize(stages[stageIndex]);
      const name = (args.shift() ?? "").toLowerCase();
      const option = (key: string) => {
        const index = args.findIndex((arg) => arg.toLowerCase() === key.toLowerCase());
        return index >= 0 ? args[index + 1] : undefined;
      };
      if (stageIndex > 0) {
        if (name === "where-object") {
          const expression = args.join(" ").replace(/^\{|\}$/g, "").trim();
          const match = /^\$_\.([a-z0-9_]+)\s+-(eq|ne|gt|lt|like)\s+['"]?(.+?)['"]?$/i.exec(expression);
          if (!match) throw new Error("Use a simple filter such as Where-Object {$_.Status -eq 'Running'}.");
          const [, property, operator, rawValue] = match;
          rows = rows.filter((row) => {
            const value = row[property] ?? row[property[0].toUpperCase() + property.slice(1)];
            if (value === undefined) return false;
            if (operator.toLowerCase() === "like") return String(value).toLowerCase().includes(rawValue.replace(/\*/g, "").toLowerCase());
            if (operator.toLowerCase() === "eq") return String(value).toLowerCase() === rawValue.toLowerCase();
            if (operator.toLowerCase() === "ne") return String(value).toLowerCase() !== rawValue.toLowerCase();
            return operator.toLowerCase() === "gt" ? Number(value) > Number(rawValue) : Number(value) < Number(rawValue);
          });
        } else if (name === "select-object") {
          const columns = args.filter((arg) => !arg.startsWith("-")).map((arg) => arg.split(",")).flat();
          if (columns.length) rows = rows.map((row) => Object.fromEntries(columns.flatMap((column) => {
            const found = Object.keys(row).find((key) => key.toLowerCase() === column.toLowerCase());
            return found ? [[found, row[found]]] : [];
          })));
        } else if (name !== "measure-object") {
          throw new Error(`${args[0] ?? name} is not a supported pipeline command in this lesson.`);
        }
        continue;
      }

      switch (name) {
        case "get-help":
        case "help":
          lines = ["Get-Location · Get-ChildItem · Set-Location · Get-Content", "Get-Process · Get-Service · Select-String · Where-Object · Select-Object", "Aliases: ls/dir, cd, cat/type. Use the Study Menu for a Linux ↔ PowerShell map."];
          break;
        case "clear":
        case "cls":
          next.output = [];
          return next;
        case "get-location":
        case "pwd":
          lines = [next.cwd];
          break;
        case "set-location":
        case "cd": {
          const destination = resolvePath(next.cwd, args[0] ?? ROOT);
          if (!next.files[destination]?.directory) throw new Error(`Path not found: ${args[0] ?? ROOT}`);
          next.cwd = next.files[destination].path;
          lines = [next.cwd];
          break;
        }
        case "get-childitem":
        case "ls":
        case "dir": {
          const target = resolvePath(next.cwd, args.find((arg) => !arg.startsWith("-")) ?? ".");
          const folder = next.files[target];
          if (!folder?.directory) throw new Error(`Path not found: ${target}`);
          lines = Object.values(next.files)
            .filter((file) => file.path.toLowerCase() !== target && file.path.toLowerCase().startsWith(`${target}\\`)
              && file.path.slice(target.length + 1).split("\\").length === 1)
            .map((file) => `${file.directory ? "<DIR>" : "      "} ${file.path.split("\\").pop()}`);
          if (!lines.length) lines = ["Directory is empty."];
          break;
        }
        case "get-content":
        case "cat":
        case "type": {
          const path = resolvePath(next.cwd, args.find((arg) => !arg.startsWith("-")) ?? "");
          const file = next.files[path];
          if (!file || file.directory) throw new Error(`File not found: ${path}`);
          lines = file.content.split("\n");
          const tail = Number(option("-Tail"));
          const total = Number(option("-TotalCount"));
          if (tail > 0) lines = lines.slice(-tail);
          else if (total > 0) lines = lines.slice(0, total);
          break;
        }
        case "select-string": {
          const pattern = option("-Pattern") ?? args.find((arg) => !arg.startsWith("-"));
          const fileArg = option("-Path") ?? args.find((arg) => !arg.startsWith("-") && arg !== pattern);
          if (!pattern || !fileArg) throw new Error("Use Select-String -Pattern 'failed' -Path auth.log.");
          const file = next.files[resolvePath(next.cwd, fileArg)];
          if (!file || file.directory) throw new Error(`File not found: ${fileArg}`);
          rows = file.content.split("\n").flatMap((line, index) => line.toLowerCase().includes(pattern.toLowerCase())
            ? [{ Line: line, LineNumber: index + 1, Path: file.path }]
            : []);
          lines = format(rows);
          break;
        }
        case "get-process":
          rows = structuredClone(next.processes);
          lines = format(rows);
          break;
        case "stop-process": {
          const id = Number(option("-Id"));
          const process = next.processes.find((item) => item.Id === id);
          if (!process) throw new Error("Process not found. Use Get-Process to inspect the simulated list.");
          process.Status = "Stopped";
          lines = [`Stopped simulated process ${process.Name} (ID ${id}).`];
          break;
        }
        case "get-service":
          rows = structuredClone(next.services);
          lines = format(rows);
          break;
        case "start-service":
        case "stop-service": {
          const serviceName = option("-Name") ?? args[0];
          const service = next.services.find((item) => String(item.Name).toLowerCase() === serviceName?.toLowerCase());
          if (!service) throw new Error("Service not found in the fictional lab.");
          service.Status = name === "start-service" ? "Running" : "Stopped";
          lines = [`${service.Name} is now ${service.Status}.`];
          break;
        }
        case "get-localuser":
        case "net": {
          rows = structuredClone(next.users);
          lines = format(rows);
          break;
        }
        case "disable-localuser": {
          if (!next.elevated) throw new Error("Access denied. Choose Run as Administrator in this simulator, then retry.");
          const username = option("-Name") ?? args[0];
          const user = next.users.find((item) => String(item.Name).toLowerCase() === username?.toLowerCase());
          if (!user) throw new Error("User not found in this training environment.");
          user.Enabled = false;
          lines = [`Disabled simulated account ${username}.`];
          break;
        }
        case "new-localuser":
        case "add-localgroupmember":
          if (!next.elevated) throw new Error("Access denied. Choose Run as Administrator in this simulator, then retry.");
          lines = ["Simulated account/group change recorded for this lab."];
          break;
        case "ipconfig":
          lines = ["Ethernet adapter Training:", "   IPv4 Address . . . . . . . . . . : 192.0.2.24", "   Default Gateway . . . . . . . . : 192.0.2.1"];
          break;
        case "get-winevent":
          rows = [{ Id: 4624, User: "analyst", Meaning: "successful logon" }, { Id: 4625, User: "jdoe", Meaning: "failed logon" }, { Id: 4720, User: "bmorris", Meaning: "account created" }];
          lines = format(rows);
          break;
        case "get-filehash": {
          const target = option("-Path") ?? args[0];
          const file = target ? next.files[resolvePath(next.cwd, target)] : undefined;
          if (!file || file.directory) throw new Error("File not found. Try Get-FileHash -Path readme.txt.");
          lines = [`Algorithm: SHA256`, `Path: ${file.path}`, `Hash: TRAINING-${file.content.length.toString(16).padStart(8, "0")}`];
          break;
        }
        default:
          throw new Error(`${name || "That command"} is not available in this safe simulator. Try Get-Help.`);
      }
    }
    if (stages.length > 1) lines = format(rows);
    next.output = [...next.output, `PS ${session.cwd}> ${entered}`, ...lines];
  } catch (error) {
    next.output = [...next.output, `PS ${session.cwd}> ${entered}`, `Error: ${error instanceof Error ? error.message : "The simulated command failed."}`];
  }
  return next;
}
