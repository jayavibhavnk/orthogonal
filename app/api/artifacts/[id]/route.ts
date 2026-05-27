import {
  authErrorResponse,
  requireAuth,
} from "@/lib/auth";
import { getOrCreateSessionId } from "@/lib/session";
import { getArtifactForChat } from "@/lib/db/artifacts";
import { getChatForOwner } from "@/lib/db/chats";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const sessionId = await getOrCreateSessionId();
    const { id } = await params;
    const chatId = new URL(req.url).searchParams.get("chatId");

    if (!chatId) {
      return Response.json({ error: "chatId required" }, { status: 400 });
    }

    const chat = await getChatForOwner(chatId, sessionId, user.id);
    if (!chat) return Response.json({ error: "Not found" }, { status: 404 });

    const artifact = await getArtifactForChat(id, chatId);
    if (!artifact) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({ artifact });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
