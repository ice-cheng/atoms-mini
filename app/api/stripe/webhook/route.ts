import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe, PRICE_TO_PLAN, PLAN_CREDITS } from "@/lib/stripe";

// Stripe webhook：raw body 验签后处理 subscription 事件
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "未配置 webhook secret" }, { status: 500 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "缺少签名" }, { status: 400 });

  const raw = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "签名无效" }, { status: 400 });
  }

  // checkout 完成 / 订阅更新时，按价格更新用户 plan 与积分
  if (event.type === "checkout.session.completed" || event.type === "customer.subscription.updated") {
    const session = event.data.object as { customer?: string; subscription?: string };
    const customerId = session.customer;
    if (customerId) {
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (user) {
        // 取订阅里的第一个价格
        const subId = session.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId as string);
          const priceId = sub.items.data[0]?.price.id;
          const plan = (priceId && PRICE_TO_PLAN[priceId]) || "free";
          await prisma.user.update({
            where: { id: user.id },
            data: { plan, credits: PLAN_CREDITS[plan] ?? 25 },
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
