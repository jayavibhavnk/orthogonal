import {
  authErrorResponse,
  requireAuth,
} from "@/lib/auth";
import { getOrCreateSessionId } from "@/lib/session";
import {
  deleteChat,
  getChatForOwner,
  getMessagesForChat,
  updateChat,
} from "@/lib/db/chats";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const sessionId = await getOrCreateSessionId();
    const { id } = await params;
    const chat = await getChatForOwner(id, sessionId, user.id);
    if (!chat) return Response.json({ error: "Not found" }, { status: 404 });
    const chatMessages = await getMessagesForChat(id);
    return Response.json({ chat, messages: chatMessages });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const sessionId = await getOrCreateSessionId();
    const { id } = await params;
    const chat = await getChatForOwner(id, sessionId, user.id);
    if (!chat) return Response.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as { title?: string; modelId?: string };
    const updated = await updateChat(id, body);
    return Response.json({ chat: updated });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const sessionId = await getOrCreateSessionId();
    const { id } = await params;
    const chat = await getChatForOwner(id, sessionId, user.id);
    if (!chat) return Response.json({ error: "Not found" }, { status: 404 });
    await deleteChat(id);
    return Response.json({ ok: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
