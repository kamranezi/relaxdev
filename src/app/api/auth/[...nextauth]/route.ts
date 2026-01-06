import NextAuth, { AuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/firebase";

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user public_repo repo:read',
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, user, profile }) {
      // При первом входе (когда есть account и user)
      if (account && user) {
        token.accessToken = account.access_token;
        // Используем user.id в качестве UID
        token.uid = user.id;
        token.email = user.email;

        const profileAny = profile as { login?: string; username?: string };
        const userLogin = profileAny?.login || profileAny?.username || user.email?.split('@')[0];
        token.login = userLogin;

        try {
          // ИСПОЛЬЗУЕМ UID В КАЧЕСТВЕ КЛЮЧА В БАЗЕ ДАННЫХ
          const userRef = db.ref(`users/${user.id}`);
          const userData = {
            email: user.email || '',
            name: user.name || '',
            image: user.image || '',
            login: userLogin,
            provider: account.provider,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            role: user.email === 'alexrus1144@gmail.com' ? 'admin' : 'user',
          };

          const snapshot = await userRef.once('value');
          if (!snapshot.exists()) {
            await userRef.set(userData);
          } else {
            await userRef.update({
              name: user.name || '',
              image: user.image || '',
              login: userLogin,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Ошибка сохранения пользователя в Firebase:', error);
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Передаем данные из токена в сессию
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.email = token.email;
        session.user.login = token.login;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
