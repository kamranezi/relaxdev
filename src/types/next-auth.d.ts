import { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Расширяем встроенный тип Session
   */
  interface Session {
    accessToken?: string;
    user: {
      id: string; // <-- ДОБАВЛЯЕМ ID ПОЛЬЗОВАТЕЛЯ
      login?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Расширяем встроенный тип JWT
   */
  interface JWT {
    accessToken?: string;
    uid?: string; // <-- ДОБАВЛЯЕМ UID (ID пользователя)
    email?: string | null; // <-- УТОЧНЯЕМ, ЧТО EMAIL МОЖЕТ БЫТЬ NULL
    login?: string;
  }
}
