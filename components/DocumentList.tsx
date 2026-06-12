"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date | string;
  uploadedBy: string;
  uploader: { id: string; name: string | null; image: string | null };
  _count: { chunks: number };
}

interface Props {
  workspaceId: string;
  initialDocuments: Document[];
  currentUserId: string;
  userRole: string;
}

export default function DocumentList({
  workspaceId,
  initialDocuments,
  currentUserId,
  userRole,
}: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        return;
      }

      setDocuments((prev) => [data, ...prev]);
      router.refresh();
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeletingId(docId);

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/documents/${docId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const typeColors: Record<string, string> = {
    pdf: "bg-red-100 text-red-700",
    docx: "bg-blue-100 text-blue-700",
    txt: "bg-gray-100 text-gray-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            {documents.length} document{documents.length !== 1 ? "s" : ""} in this workspace
          </p>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Document
              </>
            )}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value) setSearchResults(null);
          }}
          className="input flex-1"
          placeholder="Search documents semantically..."
        />
        <button type="submit" disabled={searching} className="btn-secondary whitespace-nowrap">
          {searching ? "Searching..." : "Search"}
        </button>
        {searchResults !== null && (
          <button
            type="button"
            onClick={() => { setSearchResults(null); setSearchQuery(""); }}
            className="btn-secondary"
          >
            Clear
          </button>
        )}
      </form>

      {/* Search Results */}
      {searchResults !== null && (
        <div className="mb-6 card">
          <div className="px-6 py-3 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">
              Search Results
              <span className="ml-2 text-sm text-gray-400 font-normal">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
              </span>
            </h3>
          </div>
          {searchResults.length === 0 ? (
            <p className="px-6 py-4 text-sm text-gray-500">No results found.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {searchResults.map((r, i) => (
                <li key={i} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-600">{r.documentName}</span>
                    <span className="text-xs text-gray-400">
                      {Math.round(r.score * 100)}% match
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">{r.chunkContent}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No documents yet. Upload a PDF, DOCX, or TXT file.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600 hidden sm:table-cell">Uploaded by</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600 hidden md:table-cell">Size</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600 hidden md:table-cell">Indexed</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${typeColors[doc.type] ?? "bg-gray-100 text-gray-700"}`}>
                        {doc.type.toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-900 truncate max-w-xs">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      {doc.uploader.image ? (
                        <Image
                          src={doc.uploader.image}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-medium">
                          {doc.uploader.name?.[0] ?? "?"}
                        </div>
                      )}
                      <span className="text-gray-600">{doc.uploader.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-500 hidden md:table-cell">
                    {formatBytes(doc.size)}
                  </td>
                  <td className="px-6 py-3 hidden md:table-cell">
                    {doc._count.chunks > 0 ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {doc._count.chunks} chunks
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Processing…</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {(doc.uploader.id === currentUserId ||
                      userRole === "owner" ||
                      userRole === "admin") && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface SearchResult {
  documentId: string;
  documentName: string;
  chunkContent: string;
  score: number;
}
