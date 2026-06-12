import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, docId } = await params;

  try {
    await requireWorkspaceAccess(id, session.user.id);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const document = await prisma.document.findFirst({
    where: { id: docId, workspaceId: id },
    include: {
      uploader: { select: { id: true, name: true, image: true } },
      _count: { select: { chunks: true } },
    },
  });

  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  return NextResponse.json(document);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, docId } = await params;

  try {
    await requireWorkspaceAccess(id, session.user.id);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const doc = await prisma.document.findFirst({
    where: { id: docId, workspaceId: id },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const member = doc.workspace.members[0];
  const canDelete =
    doc.uploadedBy === session.user.id ||
    member?.role === "owner" ||
    member?.role === "admin";

  if (!canDelete)
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  await prisma.document.delete({ where: { id: docId } });
  return NextResponse.json({ success: true });
}
