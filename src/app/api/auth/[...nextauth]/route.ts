import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(`${NEXTAUTH_URL}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.user && data.token) {
          return {
            ...data.user,
            role: data.role,
            token: data.token,
          };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role;
        token.accessToken = (user as any).token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          name: token.name as string,
          email: token.email as string,
        };
        (session as any).role = token.role;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
});

export { handler as GET, handler as POST };
