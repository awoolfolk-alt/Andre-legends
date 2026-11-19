import initSqlJs from "sql.js/dist/sql-asm.js";
import type { Database } from "sql.js";

let sqlEnginePromise: ReturnType<typeof initSqlJs> | null = null;

function sqlEngine() {
  sqlEnginePromise ??= initSqlJs();
  return sqlEnginePromise;
}

function randomSource(seed: number) {
  let state = Math.max(1, Math.floor(seed) >>> 0);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

export async function createSqlTrainingDatabase(seed = Date.now()): Promise<Database> {
  const SQL = await sqlEngine();
  const db = new SQL.Database();
  const random = randomSource(seed);
  db.run(`
    CREATE TABLE log_in_attempts (
      event_id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      login_date TEXT NOT NULL,
      login_time TEXT NOT NULL,
      country TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      success INTEGER NOT NULL CHECK (success IN (0, 1))
    );
    CREATE TABLE employees (
      employee_id INTEGER PRIMARY KEY,
      device_id TEXT NOT NULL,
      username TEXT NOT NULL,
      department TEXT NOT NULL,
      office TEXT NOT NULL
    );
    CREATE TABLE machines (
      device_id TEXT PRIMARY KEY,
      operating_system TEXT NOT NULL,
      email_client TEXT NOT NULL,
      os_patch_date TEXT NOT NULL
    );
    CREATE TABLE lab_users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL
    );
  `);

  const users = ["analyst", "jdoe", "bmoreno", "kpatel", "tnguyen", "rlee"];
  const countries = ["USA", "USA", "CAN", "MEX", "MEXICO", "GBR"];
  const times = ["08:15", "09:40", "12:05", "17:45", "18:10", "20:30", "22:15"];
  const insertLogin = db.prepare("INSERT INTO log_in_attempts VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (let event = 1; event <= 36; event += 1) {
    const day = Math.floor(random() * 12) + 1;
    insertLogin.run([
      event,
      pick(users, random),
      `2026-03-${String(day).padStart(2, "0")}`,
      pick(times, random),
      pick(countries, random),
      `192.0.2.${Math.floor(random() * 200) + 10}`,
      random() < 0.65 ? 1 : 0,
    ]);
  }
  insertLogin.free();

  const employeeRows = [
    ["D-100", "analyst", "Security", "East-1"],
    ["D-101", "jdoe", "Marketing", "East-2"],
    ["D-102", "bmoreno", "Finance", "West-1"],
    ["D-103", "kpatel", "Marketing", "East-3"],
    ["D-104", "tnguyen", "Operations", "West-2"],
    ["D-105", "rlee", "Marketing", "East-4"],
  ] as const;
  const insertEmployee = db.prepare("INSERT INTO employees VALUES (?, ?, ?, ?, ?)");
  const insertMachine = db.prepare("INSERT INTO machines VALUES (?, ?, ?, ?)");
  employeeRows.forEach(([device, username, department, office], index) => {
    insertEmployee.run([index + 1, device, username, department, office]);
    insertMachine.run([device, index % 2 ? "Windows 11" : "macOS 14", "Training Mail", `2026-02-${String(index + 5).padStart(2, "0")}`]);
  });
  insertEmployee.free();
  insertMachine.free();
  db.run("INSERT INTO lab_users VALUES ('analyst', 'training-only-password')");
  db.run("PRAGMA query_only = ON");
  return db;
}

export type SqlQueryResult = { columns: string[]; rows: (string | number | null)[][]; error?: string };

export function executeReadOnlySql(db: Database, source: string): SqlQueryResult {
  const sql = source.trim();
  if (!sql) return { columns: [], rows: [], error: "Enter a SELECT query to begin." };
  if (sql.length > 2000) return { columns: [], rows: [], error: "This practice query is too long. Keep it under 2,000 characters." };
  if (!/^(select|with)\b/i.test(sql)) {
    return { columns: [], rows: [], error: "This lab is read-only. Use a SELECT query; changes to tables are blocked." };
  }
  if (sql.replace(/;\s*$/, "").includes(";")) {
    return { columns: [], rows: [], error: "Run one query at a time." };
  }
  try {
    const statement = db.prepare(sql);
    const columns = statement.getColumnNames();
    const rows: (string | number | null)[][] = [];
    while (statement.step()) rows.push(statement.get().map((value) => value === undefined ? null : value as string | number | null));
    statement.free();
    return { columns, rows };
  } catch (error) {
    return { columns: [], rows: [], error: `SQL error: ${error instanceof Error ? error.message : "The query could not be run."}` };
  }
}

export function runParameterizedLogin(db: Database, username: string, password: string): SqlQueryResult {
  try {
    const statement = db.prepare("SELECT username FROM lab_users WHERE username = ? AND password = ?");
    statement.bind([username, password]);
    const rows: (string | number | null)[][] = [];
    while (statement.step()) rows.push(statement.get().map((value) => value === undefined ? null : value as string | number | null));
    statement.free();
    return { columns: ["username"], rows };
  } catch (error) {
    return { columns: [], rows: [], error: `Login simulation error: ${error instanceof Error ? error.message : "The simulated query failed."}` };
  }
}
