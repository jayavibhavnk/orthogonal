import {
  authErrorResponse,
  requireAuth,
} from "@/lib/auth";
import { getOrCreateSessionId } from "@/lib/session";
import {
  createChat,
  getChatForOwner,
  listChatsForOwner,
} from "@/lib/db/chats";

export async function GET() {
  try {
    const user = await requireAuth();
    const sessionId = await getOrCreateSessionId();
    const chats = await listChatsForOwner(sessionId, user.id);
    return Response.json({ chats });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const sessionId = await getOrCreateSessionId();
    const body = (await req.json().catch(() => ({}))) as { modelId?: string };
    const chat = await createChat(sessionId, body.modelId, user.id);
    return Response.json({ chat });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
