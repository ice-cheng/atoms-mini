"use client";
import { useState } from "react";

export default function Pricing() {
  const [busy, setBusy] = useState<string>("");

  async function checkout(plan: string) {
    setBusy(plan);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.url) location.href = data.url;
    else alert(data.error ?? "出错了");
    setBusy("");
  }

  const plans = [
    { id: "free", name: "免费版", price: "$0", desc: "25 积分，体验核心流程" },
    { id: "starter", name: "基础版", price: "$20", desc: "100 积分/月，专业使用" },
    { id: "pro", name: "专业版", price: "$100", desc: "500 积分/月，更高额度" },
  ];

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 60 }}>
      <h1>选择套餐</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 32 }}>
        {plans.map((p) => (
          <div key={p.id} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
            <h3>{p.name}</h3>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{p.price}<span style={{ fontSize: 13, color: "var(--muted)" }}>/月</span></div>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>{p.desc}</p>
            {p.id === "free" ? (
              <a className="btn-ghost" href="/" style={{ display: "block", textAlign: "center" }}>免费开始</a>
            ) : (
              <button className="btn" style={{ width: "100%" }} disabled={!!busy} onClick={() => checkout(p.id)}>
                {busy === p.id ? "跳转中…" : "升级"}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
