import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Simple middleware - just pass through
  // Auth checks are done in individual pages/API routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
