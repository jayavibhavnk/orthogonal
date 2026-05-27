import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { start } from "workflow/api";
import { chatWorkflow } from "@/workflows/chat";
import {
  getChatForOwner,
  saveMessage,
  updateChat,
} from "@/lib/db/chats";
import {
  authErrorResponse,
  requireAuth,
} from "@/lib/auth";
import { getOrCreateSessionId } from "@/lib/session";
import { checkSessionRateLimit } from "@/lib/orthogonal/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const sessionId = await getOrCreateSessionId();
    const rate = await checkSessionRateLimit(sessionId);
    if (!rate.success) {
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = (await req.json()) as {
      chatId: string;
      messages: UIMessage[];
      modelId?: string;
    };

    const chat = await getChatForOwner(body.chatId, sessionId, user.id);
    if (!chat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }

    const latestUser = [...body.messages].reverse().find((m) => m.role === "user");
    if (latestUser) {
      await saveMessage(chat.id, "user", latestUser.parts ?? []);
      const textPart = latestUser.parts?.find((p) => p.type === "text") as
        | { text?: string }
        | undefined;
      if (textPart?.text && chat.title === "New chat") {
        await updateChat(chat.id, {
          title: textPart.text.slice(0, 80),
        });
      }
    }

    const modelId = body.modelId ?? chat.modelId;
    const run = await start(chatWorkflow, [
      {
        chatId: chat.id,
        userId: user.id,
        modelId,
        messages: body.messages,
      },
    ]);

    await updateChat(chat.id, { workflowRunId: run.runId });

    return createUIMessageStreamResponse({
      stream: run.readable,
      headers: {
        "x-workflow-run-id": run.runId,
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[api/chat]", error);
    return Response.json({ error: "Chat failed" }, { status: 500 });
  }
}
