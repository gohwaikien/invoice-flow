import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignedFileUrl } from "@/lib/s3";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key } = await params;
    
    // Decode the key (it might be URL encoded)
    const decodedKey = decodeURIComponent(key);
    
    // Generate signed URL
    const signedUrl = await getSignedFileUrl(decodedKey);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: "Failed to generate file URL" },
      { status: 500 }
    );
  }
}

