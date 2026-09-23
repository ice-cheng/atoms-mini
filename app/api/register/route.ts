import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

const schema = z.object({ name: z.string().min(1).max(30) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入昵称（1-30 字）" }, { status: 400 });
  }
  const user = await prisma.user.create({
    data: { name: parsed.data.name.trim(), credits: 25 },
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true, user: { name: user.name, credits: user.credits, plan: user.plan } });
}
