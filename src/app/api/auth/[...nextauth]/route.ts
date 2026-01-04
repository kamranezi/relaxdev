import NextAuth, { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

// 1. Экспортируем настройки (authOptions) отдельно
export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user repo', 
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      // Добавляем логин пользователя в сессию (пригодится для фильтрации проектов)
      if (session.user) {
         // @ts-ignore
         session.user.login = token.sub; // Или другое поле, где лежит логин
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

// 2. Экспортируем GET и POST для работы роутинга
export { handler as GET, handler as POST };