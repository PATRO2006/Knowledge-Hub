// Generates embeddings using Voyage AI (recommended) or falls back to simple TF-IDF heuristic

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

export async function generateEmbedding(text: string): Promise<number[]> {
  if (VOYAGE_API_KEY) {
    return generateVoyageEmbedding(text);
  }
  return generateSimpleEmbedding(text);
}

async function generateVoyageEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: "voyage-3-lite",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Voyage AI error: ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}

// Simple deterministic embedding using character n-gram frequency hashing
// Works without any API key; quality is lower than neural embeddings
function generateSimpleEmbedding(text: string): number[] {
  const dim = 512;
  const vector = new Float64Array(dim);
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();

  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3);
    let hash = 0;
    for (let j = 0; j < trigram.length; j++) {
      hash = (hash * 31 + trigram.charCodeAt(j)) & 0x7fffffff;
    }
    vector[hash % dim] += 1;
  }

  // L2 normalize
  const magnitude = Math.sqrt(
    Array.from(vector).reduce((sum, v) => sum + v * v, 0)
  );
  if (magnitude === 0) return Array(dim).fill(0);
  return Array.from(vector).map((v) => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk);
    i += chunkSize - overlap;
  }

  return chunks;
}
