"use client";

import { useEffect, useRef, useState } from "react";
import type { Database } from "sql.js";
import {
  createSqlTrainingDatabase,
  executeReadOnlySql,
  runParameterizedLogin,
  type SqlQueryResult,
} from "@/game/data/content/sql";

const CASES = [
  {
    title: "Schema Card",
    goal: "Inspect the login table. Start by asking SQLite for the column names.",
    hint: "Try SELECT name FROM pragma_table_info('log_in_attempts');",
    example: "SELECT name FROM pragma_table_info('log_in_attempts');",
    check: (sql: string, result: SqlQueryResult) => /pragma_table_info|select\s+\*\s+from\s+log_in_attempts/i.test(sql) && result.rows.length > 0,
  },
  {
    title: "First Query",
    goal: "Show the login-attempt records so you can inspect the evidence.",
    hint: "Start with SELECT * FROM log_in_attempts;",
    example: "SELECT * FROM log_in_attempts;",
    check: (sql: string, result: SqlQueryResult) => /select\s+.+\s+from\s+log_in_attempts/i.test(sql) && result.rows.length > 0,
  },
  {
    title: "Find Failed Logins",
    goal: "Find attempts where success is false. In this SQLite table, false is stored as 0.",
    hint: "Use WHERE success = 0. Select the username and event_id to keep the result readable.",
    example: "SELECT username, event_id FROM log_in_attempts WHERE success = 0;",
    check: (sql: string, result: SqlQueryResult) => /where[\s\S]*success\s*=\s*(0|false)/i.test(sql) && result.rows.length > 0,
  },
  {
    title: "After Hours",
    goal: "Find unsuccessful logins after 6 PM. Combine the two conditions with AND.",
    hint: "Filter login_time after '18:00' and success = 0.",
    example: "SELECT username, login_time FROM log_in_attempts WHERE login_time > '18:00' AND success = 0;",
    check: (sql: string, result: SqlQueryResult) => /login_time\s*>\s*['"]18:00['"]/i.test(sql) && /and[\s\S]*success\s*=\s*(0|false)/i.test(sql) && result.rows.length > 0,
  },
  {
    title: "Date Range",
    goal: "Review attempts during the first five days of March with BETWEEN.",
    hint: "Use login_date BETWEEN '2026-03-01' AND '2026-03-05'.",
    example: "SELECT username, login_date FROM log_in_attempts WHERE login_date BETWEEN '2026-03-01' AND '2026-03-05';",
    check: (sql: string, result: SqlQueryResult) => /login_date[\s\S]*between[\s\S]*and/i.test(sql) && result.rows.length > 0,
  },
  {
    title: "Off-Country Sweep",
    goal: "Find attempts whose country does not start with MEX. LIKE uses % as a wildcard.",
    hint: "Use WHERE country NOT LIKE 'MEX%'.",
    example: "SELECT username, country FROM log_in_attempts WHERE country NOT LIKE 'MEX%';",
    check: (sql: string, result: SqlQueryResult) => /country\s+not\s+like\s+['"]MEX%['"]/i.test(sql) && result.rows.length > 0,
  },
  {
    title: "Department Sweep",
    goal: "Find employees in Marketing whose office begins with East.",
    hint: "Combine department = 'Marketing' AND office LIKE 'East%'.",
    example: "SELECT username, office FROM employees WHERE department = 'Marketing' AND office LIKE 'East%';",
    check: (sql: string, result: SqlQueryResult) => /department\s*=\s*['"]Marketing['"]/i.test(sql) && /office\s+like\s+['"]East%['"]/i.test(sql) && result.rows.length > 0,
  },
  {
    title: "Join the Dots",
    goal: "Match each employee to their machine by the shared device_id.",
    hint: "Join employees to machines ON employees.device_id = machines.device_id.",
    example: "SELECT employees.username, machines.operating_system FROM employees JOIN machines ON employees.device_id = machines.device_id;",
    check: (sql: string, result: SqlQueryResult) => /join\s+machines/i.test(sql) && /device_id\s*=\s*.*device_id/i.test(sql) && result.rows.length > 0,
  },
  {
    title: "Syntax Sniper",
    goal: "Repair the clause order. SQL reads SELECT, FROM, WHERE, then ORDER BY.",
    hint: "Move FROM log_in_attempts before WHERE success = 0.",
    example: "SELECT username, event_id FROM log_in_attempts WHERE success = 0 ORDER BY event_id;",
    check: (sql: string, result: SqlQueryResult) => {
      const select = sql.search(/\bselect\b/i);
      const from = sql.search(/\bfrom\b/i);
      const where = sql.search(/\bwhere\b/i);
      return select >= 0 && from > select && where > from && /log_in_attempts/i.test(sql) && result.rows.length > 0;
    },
  },
  {
    title: "Injection Lab",
    goal: "Try the training string in the username box. The app binds it as data, so it cannot change the query.",
    hint: "Use ' OR 1=1 -- as the fake username, then run the prepared-statement check.",
    example: "",
    check: (_sql: string, result: SqlQueryResult) => result.rows.length === 0 && !result.error,
  },
];

export default function SQLDetective() {
  const [level, setLevel] = useState(0);
  const [database, setDatabase] = useState<Database | null>(null);
  const [query, setQuery] = useState(CASES[0].example);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [complete, setComplete] = useState(false);
  const [hint, setHint] = useState(false);
  const [username, setUsername] = useState("' OR 1=1 --");
  const [password, setPassword] = useState("not-a-real-password");
  const [injectionResult, setInjectionResult] = useState<SqlQueryResult | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const databaseRef = useRef<Database | null>(null);
  const currentCase = CASES[level];

  useEffect(() => {
    let disposed = false;
    createSqlTrainingDatabase()
      .then((nextDatabase) => {
        if (disposed) {
          nextDatabase.close();
          return;
        }
        databaseRef.current = nextDatabase;
        setDatabase(nextDatabase);
      })
      .catch((error: unknown) => {
        console.error("Could not initialize the SQL Detective sandbox.", error);
        setLoadingError(error instanceof Error ? error.message : "The SQL sandbox could not start.");
      });
    return () => {
      disposed = true;
      databaseRef.current?.close();
      databaseRef.current = null;
    };
  }, []);

  function runQuery(event: React.FormEvent) {
    event.preventDefault();
    const activeDatabase = databaseRef.current;
    if (!activeDatabase || level === 9) return;
    const response = executeReadOnlySql(activeDatabase, query);
    setResult(response);
    setComplete(currentCase.check(query, response));
  }

  function runInjectionDemo() {
    const activeDatabase = databaseRef.current;
    if (!activeDatabase) return;
    const response = runParameterizedLogin(activeDatabase, username, password);
    setInjectionResult(response);
    setResult(response);
    setComplete(currentCase.check("", response));
  }

  function selectCase(nextLevel: number) {
    setLevel(nextLevel);
    setQuery(CASES[nextLevel].example);
    setResult(null);
    setInjectionResult(null);
    setComplete(false);
    setHint(false);
  }

  return (
    <section className="space-y-4 rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <header>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">SQL DETECTIVE · GENERATED PRACTICE DATA</p>
        <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">{currentCase.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#dbe1d4]">{currentCase.goal}</p>
      </header>
      <div className="flex flex-wrap gap-2" aria-label="SQL Detective cases">
        {CASES.map((item, index) => <button key={item.title} type="button" onClick={() => selectCase(index)} aria-pressed={level === index} className={`min-h-10 rounded border px-3 text-xs ${level === index ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>Case {index + 1}</button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["log_in_attempts", "event_id · username · login_date · login_time · country · ip_address · success"],
          ["employees", "employee_id · device_id · username · department · office"],
          ["machines", "device_id · operating_system · email_client · os_patch_date"],
        ].map(([table, columns]) => <div key={table} className="rounded border border-[#405148] bg-[#101815] p-3">
          <p className="font-mono text-xs font-bold text-[#e7d8ac]">{table}</p>
          <p className="mt-2 text-xs leading-5 text-[#c5cebf]">{columns}</p>
        </div>)}
      </div>
      {level < 9 ? (
        <form onSubmit={runQuery} className="space-y-3">
          <label htmlFor="sql-query" className="block font-mono text-xs text-[#9bc5a8]">SQL QUERY · SELECT ONLY</label>
          <textarea id="sql-query" value={query} onChange={(event) => setQuery(event.target.value)} rows={4} spellCheck={false} className="min-h-28 w-full rounded border border-[#526a59] bg-[#0b100e] p-3 font-mono text-sm text-[#c7f1cf]" />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!database} className="min-h-11 rounded bg-[#344c3b] px-4 font-mono text-xs disabled:opacity-40">Run query</button>
            <button type="button" onClick={() => setHint(true)} className="min-h-11 rounded border border-[#665d3e] px-3 text-xs">Show a hint</button>
            {hint && <p className="text-sm text-[#e7d8ac]">{currentCase.hint}</p>}
          </div>
        </form>
      ) : (
        <div className="space-y-3 rounded border border-[#665d3e] bg-[#28271e] p-4">
          <p className="text-sm leading-6 text-[#e4dfce]">A vulnerable program might paste text into SQL code. This simulator never runs an unsafe query: it uses SQLite bound parameters, so the input remains a value.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs">Fake username<input value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#101815] px-3 font-mono text-sm text-white" /></label>
            <label className="text-xs">Fake password<input value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#101815] px-3 font-mono text-sm text-white" /></label>
          </div>
          <button type="button" onClick={runInjectionDemo} disabled={!database} className="min-h-11 rounded bg-[#344c3b] px-4 font-mono text-xs disabled:opacity-40">Run prepared-statement check</button>
          {injectionResult && <p className="text-xs text-[#c5cebf]">Bound query: <code>SELECT username FROM lab_users WHERE username = ? AND password = ?</code> · Input is data, not SQL code.</p>}
        </div>
      )}

      {loadingError && <p role="alert" className="text-sm text-amber-200">Could not start the SQL simulator: {loadingError}</p>}
      {result && (
        <div className="overflow-x-auto rounded border border-[#405148] bg-[#101815]">
          {result.error ? <p role="alert" className="p-3 text-sm text-amber-200">{result.error}</p> : (
            <table className="w-full border-collapse text-left text-xs">
              <caption className="p-2 text-left text-[#9bc5a8]">Query output · {result.rows.length} rows</caption>
              <thead><tr>{result.columns.map((column) => <th key={column} scope="col" className="border-b border-[#405148] px-3 py-2 font-mono text-[#e7d8ac]">{column}</th>)}</tr></thead>
              <tbody>{result.rows.slice(0, 100).map((row, rowIndex) => <tr key={rowIndex}>{row.map((value, columnIndex) => <td key={columnIndex} className="border-b border-[#27352c] px-3 py-2 text-[#dbe1d4]">{String(value ?? "NULL")}</td>)}</tr>)}</tbody>
            </table>
          )}
          {result.rows.length > 100 && <p className="p-2 text-xs text-[#aeb7a7]">Showing the first 100 rows.</p>}
        </div>
      )}
      {result && <p className="font-mono text-xs" aria-live="polite">{complete ? "CASE COMPLETE · checkpoint reached" : "CASE IN PROGRESS · compare the result to your goal"}</p>}
      <p className="text-xs text-[#aeb7a7]">All records are invented and generated when the lab starts. The database exists only in this page; writes are disabled and no network request is made.</p>
    </section>
  );
}
