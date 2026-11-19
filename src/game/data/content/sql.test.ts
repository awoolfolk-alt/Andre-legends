import { afterEach, describe, expect, it } from "vitest";
import { createSqlTrainingDatabase, executeReadOnlySql, runParameterizedLogin } from "./sql";

const databases: Awaited<ReturnType<typeof createSqlTrainingDatabase>>[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

describe("SQL Detective sandbox", () => {
  it("creates seeded investigation tables and runs real SELECT queries", async () => {
    const db = await createSqlTrainingDatabase(11);
    databases.push(db);
    const result = executeReadOnlySql(db, "SELECT username, event_id FROM log_in_attempts WHERE success = 0");
    expect(result.error).toBeUndefined();
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.columns).toEqual(["username", "event_id"]);
  });

  it("keeps the database read-only and accepts only one statement", async () => {
    const db = await createSqlTrainingDatabase(12);
    databases.push(db);
    expect(executeReadOnlySql(db, "DELETE FROM employees").error).toContain("read-only");
    expect(executeReadOnlySql(db, "SELECT 1; SELECT 2").error).toContain("one query");
    expect(executeReadOnlySql(db, "SELECT COUNT(*) FROM employees").rows[0][0]).toBe(6);
  });

  it("generates different fake log data for different runs", async () => {
    const first = await createSqlTrainingDatabase(101);
    const second = await createSqlTrainingDatabase(202);
    databases.push(first, second);
    const query = "SELECT login_time, country FROM log_in_attempts ORDER BY event_id LIMIT 10";
    expect(executeReadOnlySql(first, query).rows).not.toEqual(executeReadOnlySql(second, query).rows);
  });

  it("uses bound parameters for the simulated login-injection lesson", async () => {
    const db = await createSqlTrainingDatabase(13);
    databases.push(db);
    expect(runParameterizedLogin(db, "' OR 1=1 --", "anything").rows).toEqual([]);
    expect(runParameterizedLogin(db, "analyst", "training-only-password").rows).toEqual([["analyst"]]);
  });
});
