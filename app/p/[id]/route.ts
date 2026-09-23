import { prisma } from "@/lib/db";

// 公开分享页：无需登录，直接渲染该项目生成的 HTML。
// 对应 P0 "可测试的在线访问链接 / 发布"。
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { html: true, title: true },
  });
  if (!project || !project.html) {
    return new Response("项目不存在或尚未生成", { status: 404 });
  }
  return new Response(project.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
