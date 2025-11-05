import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "admin" | "staff"
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "admin" | "staff"
  }
}

