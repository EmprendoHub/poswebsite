import NextAuth from "next-auth/next";
import { options } from "./options";
import { NextAuthOptions } from "next-auth";

const handler = NextAuth(options as NextAuthOptions);

export { handler as GET, handler as POST };
