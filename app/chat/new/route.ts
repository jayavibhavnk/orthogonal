import { redirect } from "next/navigation";
import { getOrCreateSessionId } from "@/lib/session";
import { requireAuth } from "@/lib/auth";
import { createChat } from "@/lib/db/chats";

export async function GET() {
  const user = await requireAuth();
  const sessionId = await getOrCreateSessionId();
  const chat = await createChat(sessionId, undefined, user.id);
  redirect(`/chat/${chat.id}`);
}
