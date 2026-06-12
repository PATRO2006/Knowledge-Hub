import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/permissions";
import { extractText, getDocumentType } from "@/lib/documents";
import { chunkText, generateEmbedding } from "@/lib/embeddings";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await requireWorkspaceAccess(id, session.user.id);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const documents = await prisma.document.findMany({
    where: { workspaceId: id },
    include: {
      uploader: { select: { id: true, name: true, image: true } },
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await requireWorkspaceAccess(id, session.user.id);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const docType = getDocumentType(file.type, file.name);
  if (!docType)
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, DOCX, or TXT files." },
      { status: 400 }
    );

  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let content: string;

  try {
    content = await extractText(buffer, file.type, file.name);
  } catch (err) {
    console.error("Text extraction failed:", err);
    return NextResponse.json({ error: "Failed to extract text from file" }, { status: 422 });
  }

  if (!content.trim())
    return NextResponse.json({ error: "No text content found in file" }, { status: 422 });

  const document = await prisma.document.create({
    data: {
      workspaceId: id,
      uploadedBy: session.user.id,
      name: file.name,
      type: docType,
      size: file.size,
      content,
    },
  });

  // Generate chunks and embeddings asynchronously
  void generateChunksAndEmbeddings(document.id, content);

  return NextResponse.json(
    { ...document, processing: true },
    { status: 201 }
  );
}

async function generateChunksAndEmbeddings(documentId: string, content: string) {
  try {
    const chunks = chunkText(content);
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      await prisma.documentChunk.create({
        data: {
          documentId,
          content: chunks[i],
          embedding: JSON.stringify(embedding),
          chunkIndex: i,
        },
      });
    }
  } catch (err) {
    console.error("Embedding generation failed for document", documentId, err);
  }
}
