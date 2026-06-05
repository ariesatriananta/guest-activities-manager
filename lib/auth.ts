import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { dbQuery, type ProfileRow } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email || "").trim().toLowerCase()
        const password = credentials?.password || ""
        if (!email || !password) return null

        const rows = await dbQuery<ProfileRow[]>(
          `
          SELECT id, email, password_hash, name, role, avatar_img, created_at, updated_at
          FROM profiles
          WHERE LOWER(email) = ?
          LIMIT 1
        `,
          [email],
        )
        const user = rows?.[0]
        if (!user) return null

        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar_img || undefined,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id
        ;(token as any).role = (user as any).role
        token.name = user.name
        token.email = user.email
        token.picture = (user as any).image
      }
      if (trigger === "update" && session) {
        if (typeof (session as any).name !== "undefined") token.name = (session as any).name as any
        if (typeof (session as any).image !== "undefined") (token as any).picture = (session as any).image as any
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id as string
        ;(session.user as any).role = (token as any).role as string
        session.user.name = token.name as string | null
        session.user.email = token.email as string | null
        session.user.image = (token as any).picture as string | null
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
