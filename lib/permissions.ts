import { prisma } from "@/lib/db";

export type Role = "owner" | "admin" | "member";

export async function getWorkspaceMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

export async function requireWorkspaceAccess(
  workspaceId: string,
  userId: string
) {
  const member = await getWorkspaceMember(workspaceId, userId);
  if (!member) throw new Error("Not a member of this workspace");
  return member;
}

export async function requireWorkspaceAdmin(
  workspaceId: string,
  userId: string
) {
  const member = await requireWorkspaceAccess(workspaceId, userId);
  if (member.role === "member") throw new Error("Admin access required");
  return member;
}

export function canManageMembers(role: string) {
  return role === "owner" || role === "admin";
}

export function canDeleteWorkspace(role: string) {
  return role === "owner";
}
