import { authErrorResponse, requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();
    return Response.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
