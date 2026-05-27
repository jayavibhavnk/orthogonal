import type { UIMessage } from "ai";
import {
  authErrorResponse,
  requireAuth,
} from "@/lib/auth";
import { getOrCreateSessionId } from "@/lib/session";
import { getChatForOwner } from "@/lib/db/chats";
import { persistAssistantMessage } from "@/lib/db/persist";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const sessionId = await getOrCreateSessionId();
    const { id } = await params;
    const chat = await getChatForOwner(id, sessionId, user.id);
    if (!chat) return Response.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as { messages: UIMessage[] };
    const saved = await persistAssistantMessage(id, body.messages ?? []);
    return Response.json({ message: saved });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
