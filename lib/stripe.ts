import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("缺少 STRIPE_SECRET_KEY");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// 价格 -> 计划映射
export const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER ?? ""]: "starter",
  [process.env.STRIPE_PRICE_PRO ?? ""]: "pro",
};

// 各计划每月赠送的积分
export const PLAN_CREDITS: Record<string, number> = {
  free: 25,
  starter: 100,
  pro: 500,
};
