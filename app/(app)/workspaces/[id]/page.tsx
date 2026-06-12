import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function WorkspacePage({
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
    include: {
      _count: { select: { members: true, documents: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          uploader: { select: { name: true } },
          _count: { select: { chunks: true } },
        },
      },
    },
  });

  if (!workspace) notFound();

  const nav = [
    {
      href: `/workspaces/${id}/documents`,
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      label: "Documents",
      desc: "Upload and manage files",
      count: workspace._count.documents,
    },
    {
      href: `/workspaces/${id}/chat`,
      icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
      label: "AI Chat",
      desc: "Ask questions about documents",
      count: null,
    },
    {
      href: `/workspaces/${id}/members`,
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      label: "Members",
      desc: "Manage team access",
      count: workspace._count.members,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700">Workspaces</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{workspace.name}</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-sm text-gray-500 mt-1">{workspace.description}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          member.role === "owner"
            ? "bg-purple-50 text-purple-700"
            : member.role === "admin"
            ? "bg-blue-50 text-blue-700"
            : "bg-gray-100 text-gray-600"
        }`}>
          {member.role}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              {item.count !== null && (
                <span className="text-2xl font-bold text-gray-900">{item.count}</span>
              )}
            </div>
            <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {item.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>

      {workspace.documents.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Documents</h2>
            <Link
              href={`/workspaces/${id}/documents`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {workspace.documents.map((doc) => (
              <li key={doc.id} className="px-6 py-3 flex items-center gap-3">
                <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                  doc.type === "pdf"
                    ? "bg-red-100 text-red-700"
                    : doc.type === "docx"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {doc.type.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    by {doc.uploader.name} · {doc._count.chunks} chunks indexed
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
