# Atoms Mini

一句话生成可运行网页应用的 MVP（ROOT 笔试 Demo）。技术栈：Next.js 15 (App Router) + TypeScript + Prisma + SQLite + Stripe。

## 功能（P0 已实现）
- 昵称注册 + httpOnly cookie 会话
- 主工作台：左侧对话，右侧 iframe 实时预览
- 输入需求 → LLM 流式生成单文件 HTML（SSE）→ 实时预览
- 项目与对话落库，历史项目列表与切换
- Stripe 订阅支付（checkout + webhook，自动升级套餐/积分）
- 可部署到 Vercel

## 快速开始
```bash
npm install
cp .env.example .env   # 填入 OPENAI_API_KEY 等
npx prisma db push
npm run dev
```
打开 http://localhost:3000

## 环境变量
见 `.env.example`。本地用 SQLite；上线换 Postgres 只改 `prisma/schema.prisma` 的 provider 和 `DATABASE_URL`。

## Stripe 配置
1. 在 Stripe 建两个月付价格，把 `price_xxx` 填进 `.env`。
2. 本地用 `stripe listen --forward-to localhost:3000/api/stripe/webhook` 拿 webhook secret。
3. 部署后在 Stripe 后台配 webhook 指向 `/api/stripe/webhook`。

## 部署到 Vercel
```bash
# 推到 GitHub 后在 Vercel 导入
# 环境变量填入所有 .env 变量
# 数据库：本地 SQLite 在 serverless 只读，上线请换 Postgres（如 Supabase/Neon）或 Turso
```
注意：SQLite 不适合 Vercel serverless（文件系统只读）。上线时把 `DATABASE_URL` 换成 Postgres/Turso，并把 `schema.prisma` 的 provider 改为 `postgresql`。

## 架构
- `lib/llm/provider.ts`：LLM 抽象层（OpenAI / Anthropic 双协议），换模型只改这里。
- `lib/orchestrator` 逻辑目前内联在 `app/api/generate/route.ts`：单步生成，后续可扩展为 planner→coder→reviewer 多智能体。
- 预览用 `iframe sandbox="allow-scripts"` 隔离，API key 只在服务端。

## 取舍说明
- 只做单智能体生成单文件 HTML，不做 8 智能体/多文件工程沙箱（见产品功能文档优先级）。
- 账号用昵称 cookie，未做 OAuth。
