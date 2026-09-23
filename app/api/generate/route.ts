import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { streamChat, type ChatMessage } from "@/lib/llm/provider";
import { SYSTEM_PROMPT, buildInitialPrompt, buildIteratePrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("未登录", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { message, projectId } = body as { message?: string; projectId?: string };
  if (!message || !message.trim()) return new Response("需求不能为空", { status: 400 });

  // 积分检查
  if (user.credits < 1) {
    return new Response(JSON.stringify({ error: "积分不足，请升级套餐" }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1) 确定或新建项目
  let project = projectId
    ? await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })
    : null;

  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: user.id,
        title: message.trim().slice(0, 30) + (message.trim().length > 30 ? "…" : ""),
        prompt: message.trim(),
      },
    });
  }

  // 2) 记录用户消息
  await prisma.message.create({
    data: { projectId: project.id, role: "user", content: message.trim() },
  });

  // 3) 组装消息
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];
  if (project.html) {
    messages.push({ role: "user", content: buildIteratePrompt(project.html, message.trim()) });
  } else {
    messages.push({ role: "user", content: buildInitialPrompt(message.trim()) });
  }

  // 4) SSE 流式输出
  const encoder = new TextEncoder();
  let assistantText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      try {
        send("project", { id: project!.id });
        for await (const delta of streamChat(messages)) {
          assistantText += delta;
          send("delta", { text: delta });
        }

        // 5) 落库：更新 html + 写 assistant 消息 + 扣积分
        await prisma.project.update({
          where: { id: project!.id },
          data: { html: assistantText, updatedAt: new Date() },
        });
        await prisma.message.create({
          data: { projectId: project!.id, role: "assistant", content: assistantText },
        });
        await prisma.user.update({ where: { id: user.id }, data: { credits: { decrement: 1 } } });

        send("done", { html: assistantText, credits: user.credits - 1 });
      } catch (e) {
        send("error", { message: e instanceof Error ? e.message : "生成失败" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
