import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * Расширяем встроенный тип Session
   */
  interface Session {
    accessToken?: string
    user: {
      login?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  /**
   * Расширяем встроенный тип JWT
   */
  interface JWT {
    accessToken?: string
  }
}