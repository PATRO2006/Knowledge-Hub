import { prisma } from "@/lib/db";
import { generateEmbedding, cosineSimilarity } from "@/lib/embeddings";

export interface SearchResult {
  documentId: string;
  documentName: string;
  chunkContent: string;
  score: number;
}

export async function semanticSearch(
  workspaceId: string,
  query: string,
  topK = 5
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);

  const chunks = await prisma.documentChunk.findMany({
    where: {
      document: { workspaceId },
    },
    include: {
      document: { select: { id: true, name: true } },
    },
  });

  const scored = chunks.map((chunk) => {
    const embedding = JSON.parse(chunk.embedding) as number[];
    return {
      documentId: chunk.document.id,
      documentName: chunk.document.name,
      chunkContent: chunk.content,
      score: cosineSimilarity(queryEmbedding, embedding),
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((r) => r.score > 0.01);
}
