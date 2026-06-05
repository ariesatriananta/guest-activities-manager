import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import mysql from "mysql2/promise"

const TABLES = ["activity_categories", "profiles", "venues", "activities", "bookings", "booking_history"]
const DROP_ORDER = ["booking_history", "bookings", "activities", "venues", "profiles", "activity_categories"]
const EXPECTED_COUNTS = {
  activities: 111,
  activity_categories: 9,
  booking_history: 15103,
  bookings: 3692,
  profiles: 12,
  venues: 22,
}

const COLUMNS = {
  activity_categories: ["id", "name", "description", "created_at", "updated_at"],
  profiles: ["id", "email", "password_hash", "name", "role", "avatar_img", "created_at", "updated_at"],
  venues: ["id", "name", "is_single_booking_per_day", "location", "capacity", "created_at", "updated_at", "is_exclusive_by_time"],
  activities: ["id", "category_id", "name", "is_active", "description", "duration", "max_capacity", "created_at", "updated_at"],
  bookings: [
    "id",
    "date",
    "start_time",
    "end_time",
    "activity_id",
    "venue_id",
    "guest_name",
    "suite_number",
    "pax",
    "ga_name",
    "driver_name",
    "remark",
    "status",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "bill",
  ],
  booking_history: ["id", "booking_id", "actor_id", "action", "changes", "created_at"],
}

const BOOLEAN_COLUMNS = new Set([
  "activities.is_active",
  "venues.is_single_booking_per_day",
  "venues.is_exclusive_by_time",
])

const TIMESTAMP_COLUMNS = new Set([
  "activity_categories.created_at",
  "activity_categories.updated_at",
  "profiles.created_at",
  "profiles.updated_at",
  "venues.created_at",
  "venues.updated_at",
  "activities.created_at",
  "activities.updated_at",
  "bookings.created_at",
  "bookings.updated_at",
  "booking_history.created_at",
])

const JSON_COLUMNS = new Set(["booking_history.changes"])

const args = parseArgs(process.argv.slice(2))
const dumpPath = path.resolve(args.dump || "sql/neondb-20260605-2300.sql")
const schemaPath = path.resolve(args.schema || "sql/mysql-schema.sql")
const envPath = args.env ? path.resolve(args.env) : null
const reset = Boolean(args.reset)
const verifyOnly = Boolean(args["verify-only"])
const parseOnly = Boolean(args["parse-only"])
const outputSqlPath = args.out ? path.resolve(args.out) : null

const dumpContent = fs.readFileSync(dumpPath, "utf8")
const sourceRows = parseDump(dumpContent)
validateSourceCounts(sourceRows)

if (parseOnly) {
  console.log("Dump parse validation passed.")
  for (const table of TABLES) console.log(`${table}: ${sourceRows[table].length}`)
  process.exit(0)
}

if (outputSqlPath) {
  writeSqlFile(outputSqlPath, schemaPath, sourceRows)
  console.log(`MySQL import SQL written to ${outputSqlPath}`)
  process.exit(0)
}

if (envPath) loadEnv(envPath)
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Use --env .env.mysql.local or export DATABASE_URL.")
}

const databaseUrl = new URL(process.env.DATABASE_URL)
if (!["mysql:", "mysql2:"].includes(databaseUrl.protocol)) {
  throw new Error("DATABASE_URL must start with mysql://")
}

const database = databaseUrl.pathname.replace(/^\//, "")
if (!database) throw new Error("DATABASE_URL must include a database name")
const sslMode = databaseUrl.searchParams.get("ssl") || databaseUrl.searchParams.get("sslmode")
const ssl = sslMode === "true" || sslMode === "require" ? {} : undefined

const serverConnection = await mysql.createConnection({
  host: databaseUrl.hostname,
  port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  ssl,
  multipleStatements: false,
})

await serverConnection.query(
  `CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
)
await serverConnection.end()

const connection = await mysql.createConnection({
  host: databaseUrl.hostname,
  port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database,
  charset: "utf8mb4",
  timezone: "Z",
  dateStrings: true,
  ssl,
  multipleStatements: false,
})

try {
  if (!verifyOnly) {
    await assertTargetIsSafe(connection, reset)
    if (reset) await dropExistingTables(connection)
    await createSchema(connection, schemaPath)
    await importRows(connection, sourceRows)
  }
  await verifyDatabase(connection, sourceRows)
  console.log("MySQL migration verification passed.")
} finally {
  await connection.end()
}

function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (!arg.startsWith("--")) continue
    const key = arg.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith("--")) {
      result[key] = true
    } else {
      result[key] = next
      index++
    }
  }
  return result
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Env file not found: ${filePath}`)
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
}

function parseDump(content) {
  const rows = Object.fromEntries(TABLES.map((table) => [table, []]))
  let cursor = 0
  const marker = 'INSERT INTO "public"."'
  while (cursor < content.length) {
    const start = content.indexOf(marker, cursor)
    if (start === -1) break
    const tableStart = start + marker.length
    const tableEnd = content.indexOf('"', tableStart)
    const table = content.slice(tableStart, tableEnd)
    const statementEnd = findStatementEnd(content, tableEnd)
    const statement = content.slice(start, statementEnd + 1)
    cursor = statementEnd + 1

    if (!rows[table]) continue
    const valuesStart = statement.indexOf("VALUES")
    const tupleStart = statement.indexOf("(", valuesStart)
    const tupleEnd = statement.lastIndexOf(")")
    const rawValues = parseTuple(statement.slice(tupleStart + 1, tupleEnd))
    rows[table].push(convertValues(table, rawValues))
  }
  return rows
}

function findStatementEnd(content, start) {
  let inString = false
  for (let index = start; index < content.length; index++) {
    const char = content[index]
    if (char === "'") {
      if (inString && content[index + 1] === "'") {
        index++
      } else {
        inString = !inString
      }
      continue
    }
    if (char === ";" && !inString) return index
  }
  throw new Error("Unterminated INSERT statement in dump")
}

function parseTuple(tuple) {
  const values = []
  let index = 0
  while (index < tuple.length) {
    while (tuple[index] === " " || tuple[index] === "\n" || tuple[index] === "\r" || tuple[index] === "\t") index++
    if (tuple[index] === "'") {
      index++
      let value = ""
      while (index < tuple.length) {
        const char = tuple[index]
        if (char === "'") {
          if (tuple[index + 1] === "'") {
            value += "'"
            index += 2
            continue
          }
          index++
          break
        }
        value += char
        index++
      }
      values.push(value)
    } else {
      const nextComma = tuple.indexOf(",", index)
      const end = nextComma === -1 ? tuple.length : nextComma
      const token = tuple.slice(index, end).trim()
      if (token.toUpperCase() === "NULL") values.push(null)
      else if (/^-?\d+$/.test(token)) values.push(Number(token))
      else values.push(token)
      index = end
    }
    while (tuple[index] === " " || tuple[index] === "\n" || tuple[index] === "\r" || tuple[index] === "\t") index++
    if (tuple[index] === ",") index++
  }
  return values
}

function convertValues(table, values) {
  const columns = COLUMNS[table]
  if (values.length !== columns.length) {
    throw new Error(`Column mismatch for ${table}: expected ${columns.length}, got ${values.length}`)
  }
  return values.map((value, index) => convertValue(table, columns[index], value))
}

function convertValue(table, column, value) {
  if (value === null) return null
  const key = `${table}.${column}`
  if (BOOLEAN_COLUMNS.has(key)) return value === "t" || value === true || value === 1 ? 1 : 0
  if (TIMESTAMP_COLUMNS.has(key)) return normalizeDateTimeString(String(value))
  if (JSON_COLUMNS.has(key)) return canonicalJson(value)
  return value
}

function validateSourceCounts(rows) {
  for (const table of TABLES) {
    const actual = rows[table].length
    const expected = EXPECTED_COUNTS[table]
    if (actual !== expected) {
      throw new Error(`Unexpected source count for ${table}: expected ${expected}, got ${actual}`)
    }
  }
}

async function assertTargetIsSafe(connection, allowReset) {
  const [tables] = await connection.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
    [database],
  )
  if (tables.length > 0 && !allowReset) {
    throw new Error(`Target database ${database} is not empty. Re-run with --reset only after confirming this is the intended target.`)
  }
}

async function dropExistingTables(connection) {
  await connection.query("SET FOREIGN_KEY_CHECKS = 0")
  for (const table of DROP_ORDER) {
    await connection.query(`DROP TABLE IF EXISTS ${mysql.escapeId(table)}`)
  }
  await connection.query("SET FOREIGN_KEY_CHECKS = 1")
}

async function createSchema(connection, filePath) {
  const schema = fs.readFileSync(filePath, "utf8")
  for (const statement of splitSchemaStatements(schema)) {
    await connection.query(statement)
  }
}

function splitSchemaStatements(schema) {
  return schema
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
}

function writeSqlFile(filePath, schemaFilePath, rowsByTable) {
  const schema = fs.readFileSync(schemaFilePath, "utf8").trim()
  const chunks = [
    "-- Generated MySQL import SQL for Guest Activities Manager",
    `-- Source dump: ${path.relative(process.cwd(), dumpPath).replace(/\\/g, "/")}`,
    "-- Execute against an empty MySQL database.",
    "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;",
    "SET time_zone = '+00:00';",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
    schema,
    "",
  ]

  for (const table of TABLES) {
    const columns = COLUMNS[table]
    const rows = rowsByTable[table]
    const columnSql = columns.map((column) => mysql.escapeId(column)).join(", ")
    chunks.push(`-- ${table}: ${rows.length} rows`)
    for (const batch of chunk(rows, 250)) {
      const valuesSql = batch
        .map((row) => `(${row.map((value) => formatSqlValue(value)).join(", ")})`)
        .join(",\n")
      chunks.push(`INSERT INTO ${mysql.escapeId(table)} (${columnSql}) VALUES\n${valuesSql};`)
    }
    chunks.push("")
  }

  chunks.push("SET FOREIGN_KEY_CHECKS = 1;")
  chunks.push("")
  chunks.push("-- Row count verification")
  chunks.push(
    TABLES.map((table) => `SELECT '${table}' AS table_name, COUNT(*) AS row_count FROM ${mysql.escapeId(table)}`).join("\nUNION ALL\n") +
      ";",
  )
  chunks.push("")

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, chunks.join("\n"), "utf8")
}

function chunk(rows, size) {
  const chunks = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks
}

function formatSqlValue(value) {
  if (value === null || typeof value === "undefined") return "NULL"
  return mysql.escape(value)
}

async function importRows(connection, rowsByTable) {
  await connection.query("SET FOREIGN_KEY_CHECKS = 0")
  try {
    for (const table of TABLES) {
      const rows = rowsByTable[table]
      const columns = COLUMNS[table]
      const columnSql = columns.map((column) => mysql.escapeId(column)).join(", ")
      const placeholders = `(${columns.map(() => "?").join(", ")})`
      const statement = `INSERT INTO ${mysql.escapeId(table)} (${columnSql}) VALUES ${placeholders}`
      for (const row of rows) {
        await connection.execute(statement, row)
      }
      console.log(`Imported ${rows.length} rows into ${table}`)
    }
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1")
  }
}

async function verifyDatabase(connection, sourceRows) {
  for (const table of TABLES) {
    const [countRows] = await connection.execute(`SELECT COUNT(*) AS count FROM ${mysql.escapeId(table)}`)
    const count = Number(countRows[0].count)
    if (count !== EXPECTED_COUNTS[table]) {
      throw new Error(`Count mismatch for ${table}: expected ${EXPECTED_COUNTS[table]}, got ${count}`)
    }

    const columns = COLUMNS[table]
    const [targetRows] = await connection.execute(
      `SELECT ${columns.map((column) => mysql.escapeId(column)).join(", ")} FROM ${mysql.escapeId(table)} ORDER BY id`,
    )
    const sourceHash = checksum(sourceRows[table].slice().sort((a, b) => String(a[0]).localeCompare(String(b[0]))))
    const targetHash = checksum(targetRows.map((row) => columns.map((column) => normalizeTargetValue(row[column]))))
    if (sourceHash !== targetHash) {
      throw new Error(`Checksum mismatch for ${table}`)
    }
  }

  const orphanChecks = [
    "SELECT COUNT(*) AS count FROM activities a LEFT JOIN activity_categories c ON c.id = a.category_id WHERE c.id IS NULL",
    "SELECT COUNT(*) AS count FROM bookings b LEFT JOIN activities a ON a.id = b.activity_id WHERE a.id IS NULL",
    "SELECT COUNT(*) AS count FROM bookings b LEFT JOIN venues v ON v.id = b.venue_id WHERE v.id IS NULL",
    "SELECT COUNT(*) AS count FROM bookings b LEFT JOIN profiles p ON p.id = b.created_by WHERE b.created_by IS NOT NULL AND p.id IS NULL",
    "SELECT COUNT(*) AS count FROM bookings b LEFT JOIN profiles p ON p.id = b.updated_by WHERE b.updated_by IS NOT NULL AND p.id IS NULL",
    "SELECT COUNT(*) AS count FROM booking_history h LEFT JOIN bookings b ON b.id = h.booking_id WHERE b.id IS NULL",
    "SELECT COUNT(*) AS count FROM booking_history h LEFT JOIN profiles p ON p.id = h.actor_id WHERE h.actor_id IS NOT NULL AND p.id IS NULL",
  ]

  for (const check of orphanChecks) {
    const [rows] = await connection.execute(check)
    if (Number(rows[0].count) !== 0) throw new Error(`FK parity check failed: ${check}`)
  }
}

function checksum(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value.map((row) => row.map(normalizeTargetValue)))).digest("hex")
}

function normalizeTargetValue(value) {
  if (value === null || typeof value === "undefined") return null
  if (Buffer.isBuffer(value)) return value.toString("utf8")
  if (value instanceof Date) return normalizeDateTimeString(value.toISOString().replace("T", " ").replace(/Z$/, ""))
  if (typeof value === "object") return canonicalJson(value)
  const stringValue = String(value)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:\+00)?$/.test(stringValue)) {
    return normalizeDateTimeString(stringValue)
  }
  if ((stringValue.startsWith("[") || stringValue.startsWith("{")) && stringValue !== "") {
    return canonicalJson(stringValue)
  }
  return stringValue
}

function normalizeDateTimeString(value) {
  const withoutZone = value.replace(/\+00$/, "")
  return withoutZone.replace(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?$/, (_match, prefix, fraction = "") => {
    return `${prefix}.${fraction.padEnd(6, "0")}`
  })
}

function canonicalJson(value) {
  if (value === null || typeof value === "undefined") return null
  if (typeof value === "string") return JSON.stringify(JSON.parse(value))
  return JSON.stringify(value)
}
