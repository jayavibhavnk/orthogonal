import { MODEL_CATALOG } from "@/lib/agent/models";

export async function GET() {
  return Response.json({ models: MODEL_CATALOG });
}
