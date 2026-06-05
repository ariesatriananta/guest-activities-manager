import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise"

type QueryParams = readonly any[]

let pool: Pool | null = null

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("Missing env: DATABASE_URL")
  }
  if (!url.startsWith("mysql://") && !url.startsWith("mysql2://")) {
    throw new Error("DATABASE_URL must use mysql:// after the MySQL migration")
  }
  return url
}

export function getPool() {
  if (!pool) {
    const url = new URL(getDatabaseUrl())
    const sslMode = url.searchParams.get("ssl") || url.searchParams.get("sslmode")
    pool = mysql.createPool({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
      charset: "utf8mb4",
      timezone: "Z",
      namedPlaceholders: false,
      supportBigNumbers: true,
      ssl: sslMode === "true" || sslMode === "require" ? {} : undefined,
    })
  }
  return pool
}

export async function dbQuery<T extends RowDataPacket[] | any[] = any[]>(statement: string, params: QueryParams = []): Promise<T> {
  const [rows] = await getPool().execute(statement, [...params])
  return rows as T
}

export async function dbExecute(statement: string, params: QueryParams = []): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(statement, [...params])
  return result
}

export async function dbTransaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection()
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export function bool(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

export function mysqlDuplicateCode(error: unknown): boolean {
  return (error as any)?.code === "ER_DUP_ENTRY" || (error as any)?.errno === 1062
}

export type ProfileRow = {
  id: string
  email: string
  password_hash: string
  name: string
  role: "admin" | "staff" | "viewer"
  avatar_img: string | null
  created_at: string
  updated_at: string
}
