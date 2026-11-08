import { DefaultSession } from "next-auth";

type CycoRole = "WASTE_COLLECTOR" | "GENERATOR" | "DELIVERYMAN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
    } & DefaultSession["user"];
    role?: CycoRole;
    token?: string;
    accessToken?: string;
  }

  interface User {
    id: string;
    role?: CycoRole;
    token?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: CycoRole;
    token?: string;
  }
}
