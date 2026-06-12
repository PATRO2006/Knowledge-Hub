import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import CreateWorkspaceButton from "@/components/CreateWorkspaceButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: { _count: { select: { members: true, documents: true } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Workspaces</h1>
          <p className="text-sm text-gray-500 mt-1">
            Collaborate with your team on shared knowledge bases
          </p>
        </div>
        <CreateWorkspaceButton />
      </div>

      {memberships.length === 0 ? (
        <div className="text-center py-20 card">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Create your first workspace to start uploading documents and collaborating
          </p>
          <CreateWorkspaceButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberships.map(({ workspace, role }) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}`}
              className="card p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {workspace.name[0].toUpperCase()}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  role === "owner"
                    ? "bg-purple-50 text-purple-700"
                    : role === "admin"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {role}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                {workspace.name}
              </h3>
              {workspace.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {workspace.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {workspace._count.members} member{workspace._count.members !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {workspace._count.documents} doc{workspace._count.documents !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
