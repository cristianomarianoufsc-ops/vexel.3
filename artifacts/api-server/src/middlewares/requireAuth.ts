import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.userId = userId;

  // JIT-provision user row
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (existing.length === 0) {
    const sessionClaims = auth.sessionClaims as Record<string, unknown> | undefined;
    const email =
      (sessionClaims?.email as string | undefined) ||
      `${userId}@unknown.com`;
    const name =
      (sessionClaims?.name as string | undefined) ||
      (sessionClaims?.full_name as string | undefined) ||
      null;
    const avatarUrl = (sessionClaims?.image_url as string | undefined) || null;

    await db.insert(usersTable).values({ id: userId, email, name, avatarUrl });
  }

  next();
};
