import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      // Запрашиваем права на чтение репозиториев, чтобы потом показывать их список
      authorization: {
        params: {
          scope: 'read:user repo', 
        },
      },
    }),
  ],
  callbacks: {
    // Нам нужно сохранить accessToken, чтобы потом от имени юзера скачивать его репозитории
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };