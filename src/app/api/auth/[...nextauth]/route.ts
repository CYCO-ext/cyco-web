import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

type TSessionOutputDTO = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: "WASTE_COLLECTOR" | "GENERATOR";
  token: string;
};

type SessionRole = TSessionOutputDTO["role"];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function sessionRole(value: unknown): SessionRole | undefined {
  return value === "GENERATOR" || value === "WASTE_COLLECTOR" ? value : undefined;
}

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
        const data = await res.json() as Partial<TSessionOutputDTO>;
        if (data && data.user && data.token) {
          return {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
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
        const userRecord = asRecord(user);
        token.id = optionalString(userRecord.id);
        token.name = optionalString(userRecord.name);
        token.email = optionalString(userRecord.email);
        token.role = sessionRole(userRecord.role);
        token.token = optionalString(userRecord.token);
        console.log("JWT callback token after modification:", token);
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id ?? "",
          name: token.name ?? "",
          email: token.email ?? "",
        };
        const sessionRecord = session as unknown as Record<string, unknown>;
        sessionRecord.role = token.role;
        sessionRecord.token = token.token;
        sessionRecord.accessToken = token.token;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
});

export { handler as GET, handler as POST };
