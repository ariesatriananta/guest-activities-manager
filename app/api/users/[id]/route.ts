import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "staff"]).optional(),
  avatar_img: z.string().url().optional().or(z.literal("")).optional(),
  password: z.string().min(4).optional(),
})

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const id = params.id
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { name, role, avatar_img, password } = parsed.data
  const password_hash = password ? await bcrypt.hash(password, 10) : null

  try {
    const updated = await sql`
      UPDATE profiles
      SET
        name = COALESCE(${name ?? null}, name),
        role = COALESCE(${(role as any) ?? null}::text, role),
        avatar_img = COALESCE(${avatar_img ?? null}, avatar_img),
        password_hash = COALESCE(${password_hash}, password_hash),
        updated_at = now()
      WHERE id = ${id}
      RETURNING id, email, name, role, avatar_img, created_at, updated_at
    `
    return NextResponse.json(updated[0])
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const id = params.id
  const meId = (session.user as any).id as string | undefined
  if (meId && id === meId) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
  }
  await sql`DELETE FROM profiles WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
