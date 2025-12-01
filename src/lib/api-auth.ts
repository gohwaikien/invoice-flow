import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

interface AuthResult {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
  };
}

/**
 * Authenticate request via session cookie OR API key
 * API key should be passed in header: X-API-Key: your_api_key
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult | null> {
  // First try API key authentication
  const apiKey = request.headers.get("X-API-Key");

  if (apiKey) {
    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (user) {
      return {
        userId: user.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }
  }

  // Fall back to session authentication
  const session = await auth();

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || null,
        role: session.user.role || null,
      },
    };
  }

  return null;
}

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  return `inv_${crypto.randomBytes(32).toString("hex")}`;
}


