import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireWorkspaceAccess, requireWorkspaceAdmin } from "@/lib/permissions";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const member = await requireWorkspaceAccess(id, session.user.id);
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, documents: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    return NextResponse.json({ ...workspace, currentUserRole: member.role });
  } catch {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await requireWorkspaceAdmin(id, session.user.id);
  } catch {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await prisma.workspace.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(workspace);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: session.user.id } },
  });

  if (!member || member.role !== "owner")
    return NextResponse.json({ error: "Owner access required" }, { status: 403 });

  await prisma.workspace.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
