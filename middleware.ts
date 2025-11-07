import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname
      if (!token) return false
      if (pathname.startsWith("/settings")) {
        return (token as any).role === "admin"
      }
      if (pathname.startsWith("/reports")) {
        const role = (token as any).role
        return role === "admin" || role === "staff"
      }
      return true
    },
  },
})

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico)).*)",
  ],
}
