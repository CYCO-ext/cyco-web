import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
    } & DefaultSession["user"];
    role?: "WASTE_COLLECTOR" | "GENERATOR";
    token?: string;
    accessToken?: string;
  }

  interface User {
    id: string;
    role?: "WASTE_COLLECTOR" | "GENERATOR";
    token?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "WASTE_COLLECTOR" | "GENERATOR";
    token?: string;
  }
}
