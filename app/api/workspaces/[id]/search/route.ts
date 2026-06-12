import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireWorkspaceAccess } from "@/lib/permissions";
import { semanticSearch } from "@/lib/search";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await requireWorkspaceAccess(id, session.user.id);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 2)
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });

  const results = await semanticSearch(id, query.trim());
  return NextResponse.json({ results });
}
