import { clearAuth } from "@/lib/auth";

export async function POST() {
  await clearAuth();
  return Response.json({ ok: true });
}
