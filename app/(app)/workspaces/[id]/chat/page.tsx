import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ChatInterface from "@/components/ChatInterface";

export default async function ChatPage({
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
    select: { id: true, name: true, _count: { select: { documents: true } } },
  });

  if (!workspace) notFound();

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/dashboard" className="hover:text-gray-700">Workspaces</Link>
        <span>/</span>
        <Link href={`/workspaces/${id}`} className="hover:text-gray-700">{workspace.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">AI Chat</span>
      </div>

      {workspace._count.documents === 0 ? (
        <div className="card flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No documents yet</p>
            <p className="text-sm text-gray-400 mt-1">
              <Link href={`/workspaces/${id}/documents`} className="text-blue-600 hover:underline">
                Upload some documents
              </Link>{" "}
              first to start chatting
            </p>
          </div>
        </div>
      ) : (
        <ChatInterface workspaceId={id} workspaceName={workspace.name} />
      )}
    </div>
  );
}
