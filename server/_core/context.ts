import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    if (!process.env.OAUTH_SERVER_URL || process.env.NODE_ENV === "development") {
      try {
        user = (await db.getUserById(1)) ?? (await db.getUserByOpenId("demo-admin")) ?? null;
      } catch (dbErr) {
        console.error("[Context] Fallback user error:", dbErr);
        user = null;
      }
    } else {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
