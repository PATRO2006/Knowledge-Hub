import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import DocumentList from "@/components/DocumentList";

export default async function DocumentsPage({
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

  const documents = await prisma.document.findMany({
    where: { workspaceId: id },
    include: {
      uploader: { select: { id: true, name: true, image: true } },
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700">Workspaces</Link>
        <span>/</span>
        <Link href={`/workspaces/${id}`} className="hover:text-gray-700">{workspace.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Documents</span>
      </div>

      <DocumentList
        workspaceId={id}
        initialDocuments={documents}
        currentUserId={session.user.id}
        userRole={member.role}
      />
    </div>
  );
}
