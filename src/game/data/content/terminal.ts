export type VirtualNode = {
  kind: "file" | "dir";
  content: string;
  owner: string;
  group: string;
  permissions: string;
};

export type TerminalSession = {
  level: number;
  cwd: string;
  files: Record<string, VirtualNode>;
  users: Record<string, string[]>;
  history: string[];
  output: string[];
};

export type TerminalResult = {
  session: TerminalSession;
  output: string[];
  cleared?: boolean;
  confirmation?: { command: string; question: string };
};

const USERS = { analyst: ["analyst", "security"], jdoe: ["staff"] };

function node(kind: VirtualNode["kind"], content = "", permissions = kind === "dir" ? "rwxr-xr-x" : "rw-r--r--"): VirtualNode {
  const withType = permissions.length === 9 ? `${kind === "dir" ? "d" : "-"}${permissions}` : permissions;
  return { kind, content, owner: "analyst", group: "analyst", permissions: withType };
}

function filesForLevel(level: number): Record<string, VirtualNode> {
  const files: Record<string, VirtualNode> = {
    "/": node("dir", "", "rwxr-xr-x"),
    "/home": node("dir", "", "rwxr-xr-x"),
    "/home/analyst": node("dir", "", "rwxr-x---"),
    "/home/analyst/notes": node("dir"),
    "/home/analyst/notes/tasks.txt": node("file", ""),
    "/home/analyst/readme.txt": node("file", "Welcome, analyst. All commands here run in a fictional training environment."),
    "/tmp": node("dir", "", "rwxrwxrwx"),
  };
  if (level >= 2) {
    files["/home/analyst/reports"] = node("dir");
    files["/home/analyst/reports/Q1_added_users.txt"] = node("file", "analyst\nbmoreno\njhill\n");
    files["/home/analyst/reports/Q1_deleted_users.txt"] = node("file", "olduser\n");
    files["/home/analyst/.leftShift3"] = node("file", "vhfxulwb lv d whdp vsr uw");
    files["/home/analyst/temp"] = node("dir");
  }
  if (level >= 3) {
    files["/home/analyst/logs"] = node("dir");
    files["/home/analyst/logs/server_logs.txt"] = node("file",
      "INFO backup complete\nERROR disk full\nINFO user signed in\nERROR retry failed\nWARN storage low\nERROR service unavailable\n");
    files["/home/analyst/logs/auth.log"] = node("file",
      "2026-03-02T09:10:00Z user=analyst action=success\n2026-03-02T09:12:00Z user=bmoreno action=failed\n2026-03-02T09:14:00Z user=analyst action=failed\n");
  }
  if (level >= 4) {
    files["/home/analyst/Q3patches.txt"] = node("file", "Patch review complete.\n");
    files["/home/analyst/drafts"] = node("dir");
    files["/home/analyst/drafts/old.txt"] = node("file", "Temporary draft.\n");
  }
  if (level >= 5) {
    files["/home/analyst/access.txt"] = node("file", "Restricted training file.\n", "rw-r-----");
    files["/home/analyst/onboarding.txt"] = node("file", "New analyst: tnguyen\nTeam: security\n");
  }
  return files;
}

export function createTerminalSession(level = 1): TerminalSession {
  return {
    level: Math.min(5, Math.max(1, Math.floor(level))),
    cwd: "/home/analyst",
    files: filesForLevel(level),
    users: structuredClone(USERS),
    history: [],
    output: [
      "CyberPrep Bash Simulator · fictional filesystem only",
      "Type help for available commands. Nothing runs on your computer.",
    ],
  };
}

export function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let token = "";
  let quote: "'" | '"' | null = null;
  let escaping = false;
  let active = false;

  for (const character of command) {
    if (escaping) {
      token += character;
      escaping = false;
      active = true;
    } else if (character === "\\" && quote !== "'") {
      escaping = true;
      active = true;
    } else if (quote) {
      if (character === quote) quote = null;
      else token += character;
    } else if (character === "'" || character === '"') {
      quote = character;
      active = true;
    } else if (/\s/.test(character)) {
      if (active) tokens.push(token);
      token = "";
      active = false;
    } else {
      token += character;
      active = true;
    }
  }
  if (escaping) token += "\\";
  if (quote) throw new Error("syntax error: missing closing quote");
  if (active) tokens.push(token);
  return tokens;
}

function splitOutsideQuotes(input: string, separator: string): string[] {
  const parts: string[] = [];
  let quote: "'" | '"' | null = null;
  let start = 0;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quote) {
      if (character === quote && input[index - 1] !== "\\") quote = null;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === separator) {
      parts.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(input.slice(start).trim());
  return parts;
}

function resolvePath(cwd: string, input = "."): string {
  const expanded = input === "~" ? "/home/analyst" : input.startsWith("~/") ? `/home/analyst/${input.slice(2)}` : input;
  const segments = (expanded.startsWith("/") ? expanded : `${cwd}/${expanded}`).split("/");
  const result: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") result.pop();
    else result.push(segment);
  }
  return `/${result.join("/")}`;
}

function parentPath(path: string) {
  const parent = path.slice(0, path.lastIndexOf("/"));
  return parent || "/";
}

function baseName(path: string) {
  return path.slice(path.lastIndexOf("/") + 1) || "/";
}

function error(message: string) {
  return `bash: ${message}`;
}

function expandRange(charset: string): string {
  let result = "";
  for (let index = 0; index < charset.length; index += 1) {
    if (charset[index + 1] === "-" && charset[index + 2]) {
      const start = charset.charCodeAt(index);
      let end = charset.charCodeAt(index + 2);
      if (end < start) end += 26;
      for (let code = start; code <= end; code += 1) result += String.fromCharCode(code > 122 ? code - 26 : code);
      index += 2;
    } else {
      result += charset[index];
    }
  }
  return result;
}

function calculateExpression(expression: string): string {
  const tokens = expression.match(/\d+(?:\.\d+)?|[()+*/%-]/g);
  if (!tokens || tokens.join("") !== expression.replace(/\s+/g, "")) return error("expr: invalid expression");
  const values: number[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };
  const apply = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (!operator || left === undefined || right === undefined) throw new Error("invalid expression");
    if ((operator === "/" || operator === "%") && right === 0) throw new Error("division by zero");
    values.push(operator === "+" ? left + right
      : operator === "-" ? left - right
        : operator === "*" ? left * right
          : operator === "/" ? left / right
            : left % right);
  };
  try {
    for (const token of tokens) {
      if (/^\d/.test(token)) values.push(Number(token));
      else if (token === "(") operators.push(token);
      else if (token === ")") {
        while (operators.length && operators.at(-1) !== "(") apply();
        if (operators.pop() !== "(") throw new Error("unmatched parenthesis");
      } else {
        while (operators.length && (precedence[operators.at(-1)!] ?? 0) >= precedence[token]) apply();
        operators.push(token);
      }
    }
    while (operators.length) apply();
    if (values.length !== 1 || !Number.isFinite(values[0])) throw new Error("invalid expression");
    return String(values[0]);
  } catch (caught) {
    return error(`expr: ${caught instanceof Error ? caught.message : "invalid expression"}`);
  }
}

async function runCommand(session: TerminalSession, source: string, input: string, confirmed: boolean): Promise<{ output: string; cleared?: boolean; confirmation?: TerminalResult["confirmation"] }> {
  const args = tokenize(source);
  if (!args.length) return { output: "" };
  let command = args.shift()!;
  let sudo = false;
  if (command === "sudo") {
    sudo = true;
    command = args.shift() ?? "";
  }
  const { files, cwd } = session;
  const fileAt = (path: string) => files[resolvePath(cwd, path)];
  const requireFile = (path: string) => {
    const target = fileAt(path);
    if (!target) throw new Error(`No such file or directory: ${path}`);
    return target;
  };
  const requireDir = (path: string) => {
    const target = requireFile(path);
    if (target.kind !== "dir") throw new Error(`Not a directory: ${path}`);
    return target;
  };
  const privileged = () => {
    if (!sudo) throw new Error("Permission denied. Try sudo for this administrative training task.");
  };

  try {
    switch (command) {
      case "help":
        return { output: "pwd ls cd cat head tail less echo expr clear grep find wc mkdir rmdir touch rm mv cp nano chmod chown sudo useradd userdel usermod man whatis apropos tr sha256sum cmp tcpdump suricata jq curl ifconfig" };
      case "pwd": return { output: cwd };
      case "clear": return { output: "", cleared: true };
      case "ls": {
        const all = args.some((arg) => /^-.*a/.test(arg));
        const long = args.some((arg) => /^-.*l/.test(arg));
        const targetArg = args.find((arg) => !arg.startsWith("-")) ?? ".";
        const targetPath = resolvePath(cwd, targetArg);
        const target = files[targetPath];
        if (!target) throw new Error(`No such file or directory: ${targetArg}`);
        const entries = target.kind === "dir"
          ? Object.keys(files).filter((path) => parentPath(path) === targetPath && (all || !baseName(path).startsWith(".")))
          : [targetPath];
        return { output: entries.sort().map((path) => {
          const item = files[path];
          return long
            ? `${item.permissions} 1 ${item.owner} ${item.group} ${item.kind === "dir" ? "0" : item.content.length} ${baseName(path)}`
            : `${baseName(path)}${item.kind === "dir" ? "/" : ""}`;
        }).join("\n") };
      }
      case "cd": {
        const next = resolvePath(cwd, args[0] ?? "~");
        requireDir(next);
        session.cwd = next;
        return { output: "" };
      }
      case "cat":
      case "head":
      case "tail":
      case "less": {
        let count = 10;
        const pathArgs = [...args];
        const nIndex = pathArgs.findIndex((arg) => arg === "-n");
        if (nIndex >= 0) {
          count = Number(pathArgs[nIndex + 1]);
          if (!Number.isInteger(count) || count < 0) throw new Error("invalid line count");
          pathArgs.splice(nIndex, 2);
        }
        const content = pathArgs.length
          ? pathArgs.map((path) => {
            const item = requireFile(path);
            if (item.kind !== "file") throw new Error(`Is a directory: ${path}`);
            return item.content;
          }).join("")
          : input;
        if (!content && !pathArgs.length) throw new Error("missing file operand");
        const lines = content.split(/\r?\n/);
        if (command === "head") return { output: lines.slice(0, count).join("\n") };
        if (command === "tail") return { output: count === 0 ? "" : lines.slice(-count).join("\n") };
        return { output: content };
      }
      case "echo": return { output: args.join(" ") };
      case "expr": return { output: calculateExpression(args.join(" ")) };
      case "grep": {
        let insensitive = false;
        let invert = false;
        let countOnly = false;
        const operands: string[] = [];
        for (const arg of args) {
          if (arg.startsWith("-") && arg !== "-") {
            if (arg.includes("i")) insensitive = true;
            if (arg.includes("v")) invert = true;
            if (arg.includes("c")) countOnly = true;
          } else operands.push(arg);
        }
        const pattern = operands.shift();
        if (!pattern) throw new Error("usage: grep [OPTION]... PATTERN [FILE]...");
        const content = operands.length
          ? operands.map((path) => requireFile(path).content).join("")
          : input;
        if (!content && !operands.length) throw new Error("missing input");
        const matcher = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), insensitive ? "i" : "");
        const matches = content.split(/\r?\n/).filter((line) => Boolean(matcher.test(line)) !== invert);
        return { output: countOnly ? String(matches.length) : matches.join("\n") };
      }
      case "wc": {
        const countLines = args.includes("-l");
        const paths = args.filter((arg) => !arg.startsWith("-"));
        const content = paths.length ? paths.map((path) => requireFile(path).content).join("") : input;
        const count = countLines ? content.split(/\r?\n/).filter(Boolean).length : content.length;
        return { output: String(count) };
      }
      case "mkdir":
      case "touch": {
        if (!args.length) throw new Error(`missing operand`);
        for (const arg of args) {
          const path = resolvePath(cwd, arg);
          if (files[path]) throw new Error(`File exists: ${arg}`);
          requireDir(parentPath(path));
          files[path] = node(command === "mkdir" ? "dir" : "file");
        }
        return { output: "" };
      }
      case "rmdir":
      case "rm": {
        const recursive = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
        const targets = args.filter((arg) => !arg.startsWith("-"));
        if (!targets.length) throw new Error("missing operand");
        if (command === "rm" && recursive && !confirmed) {
          return { output: "", confirmation: { command: source, question: "Remove the selected virtual files and folders recursively? [y/N]" } };
        }
        for (const target of targets) {
          const path = resolvePath(cwd, target);
          if (path === "/" || path === "/home" || path === "/home/analyst") throw new Error("refusing to remove a protected training root");
          const item = files[path];
          if (!item) throw new Error(`No such file or directory: ${target}`);
          const children = Object.keys(files).filter((candidate) => candidate !== path && candidate.startsWith(`${path}/`));
          if (command === "rmdir" && (item.kind !== "dir" || children.length)) throw new Error(`Directory not empty or invalid: ${target}`);
          if (item.kind === "dir" && children.length && !recursive) throw new Error(`Is a directory: ${target}`);
          delete files[path];
          if (recursive) children.forEach((child) => delete files[child]);
        }
        return { output: "" };
      }
      case "cp":
      case "mv": {
        if (args.length !== 2) throw new Error(`usage: ${command} SOURCE DEST`);
        const source = resolvePath(cwd, args[0]);
        const destination = resolvePath(cwd, args[1]);
        const item = files[source];
        if (!item) throw new Error(`No such file or directory: ${args[0]}`);
        const finalPath = files[destination]?.kind === "dir" ? `${destination}/${baseName(source)}` : destination;
        requireDir(parentPath(finalPath));
        if (files[finalPath]) throw new Error(`File exists: ${args[1]}`);
        files[finalPath] = { ...item };
        if (command === "mv") delete files[source];
        return { output: "" };
      }
      case "find": {
        const path = resolvePath(cwd, args.find((arg) => !arg.startsWith("-")) ?? ".");
        requireDir(path);
        const name = args[args.indexOf("-name") + 1]?.replaceAll("*", "");
        return { output: Object.keys(files).filter((candidate) => candidate.startsWith(`${path}/`) && (!name || baseName(candidate).includes(name))).sort().join("\n") };
      }
      case "chmod": {
        if (args.length !== 2) throw new Error("usage: chmod MODE FILE");
        const item = requireFile(args[1]);
        const mode = args[0];
        if (/^[0-7]{3,4}$/.test(mode)) {
          const numeric = mode.slice(-3).split("").map((digit) => {
            const value = Number(digit);
            return `${value & 4 ? "r" : "-"}${value & 2 ? "w" : "-"}${value & 1 ? "x" : "-"}`;
          }).join("");
          item.permissions = `${item.kind === "dir" ? "d" : "-"}${numeric}`;
        } else {
          for (const change of mode.split(",")) {
            const match = /^([ugoa]+)([+-])([rwx]+)$/.exec(change);
            if (!match) throw new Error(`invalid mode: ${mode}`);
            const targets = match[1] === "a" ? ["u", "g", "o"] : [...match[1]];
            const permissions = match[3];
            const chars = item.permissions.split("");
            for (const target of targets) {
              const start = target === "u" ? 1 : target === "g" ? 4 : 7;
              for (const [offset, permission] of ["r", "w", "x"].entries()) {
                if (!permissions.includes(permission)) continue;
                chars[start + offset] = match[2] === "+" ? permission : "-";
              }
            }
            item.permissions = chars.join("");
          }
        }
        return { output: "" };
      }
      case "chown": {
        privileged();
        if (args.length !== 2) throw new Error("usage: sudo chown USER[:GROUP] FILE");
        const [owner, group] = args[0].split(":");
        const item = requireFile(args[1]);
        if (!session.users[owner]) throw new Error(`invalid user: ${owner}`);
        item.owner = owner;
        if (group) item.group = group;
        return { output: "" };
      }
      case "useradd": {
        privileged();
        const username = args.at(-1);
        if (!username) throw new Error("missing username");
        if (session.users[username]) throw new Error(`user exists: ${username}`);
        const groupFlag = args.indexOf("-g");
        session.users[username] = groupFlag >= 0 && args[groupFlag + 1] ? [args[groupFlag + 1]] : ["users"];
        return { output: "" };
      }
      case "userdel": {
        privileged();
        if (!args[0] || !session.users[args[0]]) throw new Error(`unknown user: ${args[0] ?? ""}`);
        delete session.users[args[0]];
        return { output: "" };
      }
      case "usermod": {
        privileged();
        const username = args.at(-1);
        const groupFlag = args.findIndex((argument) => argument === "-G" || argument === "-aG");
        if (!username || !session.users[username] || groupFlag < 0 || !args[groupFlag + 1]) throw new Error("usage: sudo usermod -aG GROUP USER");
        if (!args.includes("-a") && !args.includes("-aG")) session.users[username] = [];
        if (!session.users[username].includes(args[groupFlag + 1])) session.users[username].push(args[groupFlag + 1]);
        return { output: "" };
      }
      case "man":
      case "whatis":
      case "apropos": {
        const manuals: Record<string, string> = {
          pwd: "pwd — print the current virtual directory.",
          ls: "ls — list virtual files and directories; -a includes hidden files, -l shows details.",
          cd: "cd — change the current virtual directory.",
          cat: "cat — display virtual file contents.",
          grep: "grep — find lines matching a text pattern.",
          chmod: "chmod — change virtual file permissions.",
          wc: "wc — count lines or characters in virtual input.",
          find: "find — search the virtual directory tree.",
        };
        if (command === "apropos") return { output: Object.keys(manuals).filter((name) => args.some((arg) => manuals[name].toLowerCase().includes(arg.toLowerCase()))).map((name) => manuals[name]).join("\n") || "No matching manual entry." };
        const topic = args[0] ?? "";
        return { output: manuals[topic] ?? `No manual entry for ${topic}` };
      }
      case "tr": {
        if (args.length < 2) throw new Error("usage: tr SET1 SET2");
        const from = expandRange(args[0]);
        const to = expandRange(args[1]);
        const map = new Map([...from].map((character, index) => [character, to[index] ?? to.at(-1) ?? ""]));
        return { output: [...input].map((character) => map.get(character) ?? character).join("") };
      }
      case "cmp": {
        if (args.length !== 2) throw new Error("usage: cmp FILE1 FILE2");
        return { output: requireFile(args[0]).content === requireFile(args[1]).content ? "" : `${args[0]} ${args[1]} differ` };
      }
      case "sha256sum":
        return { output: (await Promise.all(args.map(async (path) => {
          const item = requireFile(path);
          if (!globalThis.crypto?.subtle) throw new Error("SHA-256 is unavailable in this browser context.");
          const bytes = new TextEncoder().encode(item.content);
          const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
          const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
          return `${hash}  ${path}`;
        }))).join("\n") };
      case "ifconfig":
        return { output: "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>\n  inet 192.0.2.25  netmask 255.255.255.0\nlo: flags=73<UP,LOOPBACK,RUNNING>\n  inet 127.0.0.1" };
      case "curl":
        if (!args[0]) throw new Error("missing URL");
        return { output: "SIMULATED HTTP RESPONSE\nstatus: 200 OK\nbody: Training traffic generated locally in the virtual lab." };
      case "tcpdump":
        if (args.includes("-D")) return { output: "1.eth0 [virtual training interface]\n2.lo [virtual loopback]" };
        if (args.includes("-r") || args.includes("-i")) return { output: "09:14:22.000000 IP 192.0.2.25.51514 > 198.51.100.8.443: Flags [S], length 0\n09:14:22.020000 IP 198.51.100.8.443 > 192.0.2.25.51514: Flags [S.], length 0" };
        return { output: "tcpdump: simulated only; use -D to list virtual interfaces." };
      case "suricata":
        return { output: "Suricata simulation: 1 sample alert written to the virtual fast.log and eve.json." };
      case "jq": {
        const text = args.at(-1)?.startsWith("{") ? args.at(-1)! : input;
        try {
          const parsed: unknown = JSON.parse(text);
          if (args.includes(".")) return { output: JSON.stringify(parsed, null, args.includes("-c") ? 0 : 2) };
          return { output: JSON.stringify(parsed) };
        } catch {
          throw new Error("jq: invalid JSON input");
        }
      }
      case "openssl":
        return { output: "Decrypt simulation: use the lab-provided key on the training cipher. No real cryptography or files are accessed." };
      case "python3":
        return { output: "Python is restricted to the Code Typer lab and is not executed by this shell simulator." };
      case "nano": {
        const path = args[0] ? resolvePath(cwd, args[0]) : "";
        if (!path) throw new Error("usage: nano FILE");
        if (files[path]?.kind === "dir") throw new Error(`Is a directory: ${args[0]}`);
        if (!files[path]) files[path] = node("file");
        return { output: `EDITOR:${path}` };
      }
      default:
        throw new Error(`command not found: ${command}`);
    }
  } catch (caught) {
    return { output: error(caught instanceof Error ? caught.message : "command failed") };
  }
}

export async function executeTerminalCommand(
  current: TerminalSession,
  rawCommand: string,
  options: { confirmed?: boolean } = {},
): Promise<TerminalResult> {
  const session: TerminalSession = {
    ...current,
    files: structuredClone(current.files),
    users: structuredClone(current.users),
    history: [...current.history],
    output: [...current.output],
  };
  const source = rawCommand.trim();
  if (!source) return { session, output: [] };
  session.history.push(source);
  try {
    let command = source;
    const isBackground = /(?:^|\s)&$/.test(command);
    if (isBackground) command = command.replace(/\s*&$/, "");

    const redirection = /(?:^|\s)(>>|>)\s*(\S+)\s*$/.exec(command);
    const append = redirection?.[1] === ">>";
    const redirectPath = redirection?.[2];
    if (redirection) command = command.slice(0, redirection.index).trim();

    const pipeline = splitOutsideQuotes(command, "|");
    let input = "";
    let cleared = false;
    for (const part of pipeline) {
      const result = await runCommand(session, part, input, Boolean(options.confirmed));
      if (result.confirmation) return { session: current, output: [result.confirmation.question], confirmation: result.confirmation };
      input = result.output;
      cleared = Boolean(result.cleared);
      if (input.startsWith("bash:")) break;
    }
    const output = isBackground && input ? `${input}\n[1] ${Math.floor(Math.random() * 9000) + 1000}` : input;
    if (redirectPath && !output.startsWith("bash:")) {
      const path = resolvePath(session.cwd, redirectPath);
      const file = session.files[path];
      if (file && file.kind !== "file") throw new Error(`Is a directory: ${redirectPath}`);
      if (!file && !session.files[parentPath(path)]) throw new Error(`No such directory: ${parentPath(path)}`);
      if (file) file.content = `${append ? file.content : ""}${output}${output ? "\n" : ""}`;
      else session.files[path] = node("file", `${output}${output ? "\n" : ""}`);
      return { session, output: [], cleared };
    }
    return { session, output: output ? output.split("\n") : [], cleared };
  } catch (caught) {
    return { session, output: [error(caught instanceof Error ? caught.message : "command failed")] };
  }
}
