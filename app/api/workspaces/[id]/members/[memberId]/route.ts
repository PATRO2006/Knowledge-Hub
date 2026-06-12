import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireWorkspaceAdmin } from "@/lib/permissions";
import { z } from "zod";

const UpdateRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await params;

  try {
    await requireWorkspaceAdmin(id, session.user.id);
  } catch {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { id: memberId, workspaceId: id },
  });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (target.role === "owner")
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 400 });

  const body = await req.json();
  const parsed = UpdateRoleSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await params;

  const target = await prisma.workspaceMember.findUnique({
    where: { id: memberId, workspaceId: id },
  });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (target.role === "owner")
    return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });

  // Allow self-removal or admin removal
  const isAdmin =
    target.userId === session.user.id
      ? true
      : await prisma.workspaceMember
          .findUnique({
            where: { workspaceId_userId: { workspaceId: id, userId: session.user.id } },
          })
          .then((m) => m?.role === "owner" || m?.role === "admin");

  if (!isAdmin)
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  await prisma.workspaceMember.delete({ where: { id: memberId } });
  return NextResponse.json({ success: true });
}
