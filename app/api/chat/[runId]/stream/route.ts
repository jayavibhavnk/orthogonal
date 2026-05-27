import { getRun } from "workflow/api";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const { searchParams } = new URL(req.url);
  const startIndexParam = searchParams.get("startIndex");
  const startIndex = startIndexParam ? Number(startIndexParam) : undefined;

  const run = getRun(runId);
  const stream = run.getReadable(
    startIndex != null && !Number.isNaN(startIndex) ? { startIndex } : undefined,
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
