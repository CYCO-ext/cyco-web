import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

type TSessionOutputDTO = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: "WASTE_COLLECTOR" | "GENERATOR" | "DELIVERYMAN";
  token: string;
};

type SessionRole = TSessionOutputDTO["role"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function sessionRole(value: unknown): SessionRole | undefined {
  return value === "GENERATOR" || value === "WASTE_COLLECTOR" || value === "DELIVERYMAN" ? value : undefined;
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("credentials", credentials)
        const res = await fetch(`${NEXTAUTH_URL}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });

        const data = await res.json();
        console.log("API response", data)

        if (!res.ok || !data?.token) {
          return null;
        }

        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.role,
          token: data.token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("JWT callback user:", user);
        const userRecord = asRecord(user);
        token.id = optionalString(userRecord.id);
        token.name = optionalString(userRecord.name);
        token.email = optionalString(userRecord.email);
        (token as Record<string, unknown>).role = sessionRole(userRecord.role);
        token.token = optionalString(userRecord.token);
        console.log("JWT callback token after modification:", token);
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: optionalString(token.id) ?? "",
        name: optionalString(token.name) ?? "",
        email: optionalString(token.email) ?? "",
      };
      const sessionRecord = session as unknown as Record<string, unknown>;
      sessionRecord.role = token.role;
      sessionRecord.token = token.token;
      sessionRecord.accessToken = token.token;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
