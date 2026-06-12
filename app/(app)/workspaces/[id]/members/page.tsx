import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import MembersManager from "@/components/MembersManager";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: session.user.id } },
  });

  if (!member) notFound();

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!workspace) notFound();

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700">Workspaces</Link>
        <span>/</span>
        <Link href={`/workspaces/${id}`} className="hover:text-gray-700">{workspace.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Members</span>
      </div>

      <MembersManager
        workspaceId={id}
        initialMembers={members}
        currentUserId={session.user.id}
        currentUserRole={member.role}
      />
    </div>
  );
}
