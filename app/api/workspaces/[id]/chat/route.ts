import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { requireWorkspaceAccess } from "@/lib/permissions";
import { semanticSearch } from "@/lib/search";
import { z } from "zod";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(20)
    .default([]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    await requireWorkspaceAccess(id, session.user.id);
  } catch {
    return new Response("Unauthorized", { status: 403 });
  }

  const body = await req.json();
  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success)
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

  const { message, history } = parsed.data;

  // Retrieve relevant context
  const searchResults = await semanticSearch(id, message, 6);

  const contextBlock =
    searchResults.length > 0
      ? searchResults
          .map(
            (r, i) =>
              `[Source ${i + 1}: ${r.documentName}]\n${r.chunkContent}`
          )
          .join("\n\n---\n\n")
      : "No relevant documents found in this workspace.";

  const systemPrompt = `You are a helpful AI assistant for a team knowledge hub. Your job is to answer questions based on the documents uploaded to this workspace.

When answering:
- Base your answers on the provided document context
- Cite which document(s) you're drawing from
- If the context doesn't contain enough information, say so clearly
- Be concise and accurate

DOCUMENT CONTEXT:
${contextBlock}`;

  const ollamaMessages = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: ollamaMessages, stream: true }),
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Could not connect to Ollama. Make sure it is running: https://ollama.com" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!ollamaRes.ok) {
    const err = await ollamaRes.text();
    return new Response(
      JSON.stringify({ error: `Ollama error: ${err}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const reader = ollamaRes.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value).split("\n").filter(Boolean);
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              const text = json.message?.content ?? "";
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            } catch {
              // skip malformed lines
            }
          }
        }

        if (searchResults.length > 0) {
          const sources = searchResults.map((r) => ({
            documentId: r.documentId,
            documentName: r.documentName,
            score: r.score,
          }));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("Chat stream error:", err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
