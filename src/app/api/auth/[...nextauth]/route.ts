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
          scope: 'read:user repo', 
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
      if (account && user && user.email) {
        token.accessToken = account.access_token;
        
        const profileAny = profile as { login?: string; username?: string };
        const userLogin = profileAny?.login || profileAny?.username || user.email.split('@')[0];
        
        try {
          const userRef = db.ref(`users/${user.email.replace(/\./g, '_')}`);
          const userData = {
            email: user.email,
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
              ...userData,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Ошибка сохранения пользователя в Firebase:', error);
        }
        
        token.email = user.email;
        token.login = userLogin;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.email = token.email || session.user.email;
        session.user.login = token.login || token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };