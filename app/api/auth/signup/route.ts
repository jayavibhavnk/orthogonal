import { z } from "zod";
import { attachUserToSession, authErrorResponse } from "@/lib/auth";
import { createUser, getUserByEmail } from "@/lib/auth/users";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = signupSchema.parse(await req.json());
    const existing = await getUserByEmail(body.email);
    if (existing) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    const user = await createUser(body.email, body.password);
    await attachUserToSession(user.id);

    return Response.json({
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[auth/signup]", error);
    return Response.json({ error: "Signup failed" }, { status: 500 });
  }
}
