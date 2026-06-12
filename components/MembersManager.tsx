"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Member {
  id: string;
  role: string;
  joinedAt: Date | string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

interface Props {
  workspaceId: string;
  initialMembers: Member[];
  currentUserId: string;
  currentUserRole: string;
}

export default function MembersManager({
  workspaceId,
  initialMembers,
  currentUserId,
  currentUserRole,
}: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const router = useRouter();

  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error ?? "Failed to add member");
        return;
      }

      setMembers((prev) => [...prev, data]);
      setInviteEmail("");
      setInviteSuccess(`Added ${data.user.name ?? data.user.email} successfully`);
      router.refresh();
    } catch {
      setInviteError("Something went wrong");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: "admin" | "member") => {
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
        router.refresh();
      }
    } catch {
      // ignore
    }
  };

  const handleRemove = async (memberId: string, memberName: string | null) => {
    if (!confirm(`Remove ${memberName ?? "this member"} from the workspace?`)) return;

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${memberId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        router.refresh();
      }
    } catch {
      // ignore
    }
  };

  const roleColors: Record<string, string> = {
    owner: "bg-purple-50 text-purple-700",
    admin: "bg-blue-50 text-blue-700",
    member: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {canManage && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Add Member</h2>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="input flex-1"
              placeholder="user@example.com"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
              className="input w-full sm:w-32"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail}
              className="btn-primary whitespace-nowrap"
            >
              {inviting ? "Adding..." : "Add Member"}
            </button>
          </form>

          {inviteError && (
            <p className="mt-2 text-sm text-red-600">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="mt-2 text-sm text-green-600">{inviteSuccess}</p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            The user must have signed in at least once before they can be added.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-4 px-6 py-4">
              {m.user.image ? (
                <Image
                  src={m.user.image}
                  alt=""
                  width={36}
                  height={36}
                  className="rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600 flex-shrink-0">
                  {m.user.name?.[0] ?? m.user.email?.[0] ?? "?"}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {m.user.name ?? "Unknown"}
                  {m.user.id === currentUserId && (
                    <span className="ml-2 text-xs text-gray-400">(you)</span>
                  )}
                </p>
                <p className="text-sm text-gray-500 truncate">{m.user.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {canManage && m.role !== "owner" && m.user.id !== currentUserId ? (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      handleRoleChange(m.id, e.target.value as "admin" | "member")
                    }
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleColors[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {m.role}
                  </span>
                )}

                {canManage && m.role !== "owner" && (
                  <button
                    onClick={() => handleRemove(m.id, m.user.name)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove member"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
