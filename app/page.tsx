"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function start() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error ?? "出错了");
      setBusy(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "80px 20px" }}>
      <h1 style={{ fontSize: 40, marginBottom: 8 }}>Atoms Mini</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>
        用一句话，让 AI 为你生成可运行的网页应用。
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          className="input"
          placeholder="输入你的昵称开始"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && start()}
        />
        {err && <span style={{ color: "#ff6b6b", fontSize: 13 }}>{err}</span>}
        <button className="btn" disabled={busy || !name.trim()} onClick={start}>
          {busy ? "进入中…" : "开始构建"}
        </button>
        <a href="/pricing" style={{ fontSize: 13, alignSelf: "center" }}>查看套餐</a>
      </div>
    </main>
  );
}
