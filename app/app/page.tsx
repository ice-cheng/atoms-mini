"use client";
import { useEffect, useRef, useState } from "react";

type ProjectSummary = { id: string; title: string; updatedAt: string };
type Me = { name: string; credits: number; plan: string };

export default function Workspace() {
  const [me, setMe] = useState<Me | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [html, setHtml] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 初始加载
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          location.href = "/";
          return;
        }
        setMe(data.user);
        setProjects(data.projects);
      });
  }, []);

  async function loadProject(id: string) {
    const res = await fetch(`/api/projects/${id}`);
    const data = await res.json();
    setActiveId(id);
    setHtml(data.project.html ?? "");
    setChat(data.project.messages);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    setChat((c) => [...c, { role: "user", content: text }]);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, projectId: activeId }),
    });

    if (!res.body) {
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let acc = "";
    let projectId = activeId;

    const handleEvent = (event: string, data: string) => {
      try {
        const obj = JSON.parse(data);
        if (event === "project") {
          projectId = obj.id;
          setActiveId(obj.id);
          setProjects((ps) => [{ id: obj.id, title: text.slice(0, 30), updatedAt: new Date().toISOString() }, ...ps]);
        } else if (event === "delta") {
          acc += obj.text;
          setHtml(acc);
        } else if (event === "done") {
          setMe((m) => (m ? { ...m, credits: obj.credits } : m));
          setChat((c) => [...c, { role: "assistant", content: obj.html }]);
          setBusy(false);
        } else if (event === "error") {
          alert(obj.message);
          setBusy(false);
        }
      } catch {
        /* ignore */
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        let event = "message";
        let data = "";
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (data) handleEvent(event, data);
      }
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 侧栏 */}
      <aside style={{ width: 240, background: "var(--panel)", borderRight: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Atoms Mini</div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 16 }}>
          {me?.name} · {me?.credits} 积分 · {me?.plan}
        </div>
        <button
          className="btn-ghost"
          style={{ marginBottom: 12 }}
          onClick={() => { setActiveId(null); setHtml(""); setChat([]); inputRef.current?.focus(); }}
        >
          + 新建项目
        </button>
        <div style={{ flex: 1, overflow: "auto" }}>
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => loadProject(p.id)}
              style={{
                padding: "8px 10px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                background: p.id === activeId ? "var(--panel2)" : "transparent",
                marginBottom: 2,
              }}
            >
              {p.title}
            </div>
          ))}
        </div>
        <a href="/pricing" style={{ fontSize: 12 }}>升级套餐</a>
      </aside>

      {/* 主区 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* 对话 */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {chat.length === 0 && (
            <div style={{ color: "var(--muted)", marginTop: 40 }}>
              你想创造什么？描述一个网页应用，AI 会实时生成并预览。
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} style={{ marginBottom: 12, textAlign: m.role === "user" ? "right" : "left" }}>
              <span style={{
                display: "inline-block", maxWidth: "80%", padding: "8px 12px", borderRadius: 10,
                background: m.role === "user" ? "var(--accent)" : "var(--panel2)",
                color: "#fff", fontSize: 13,
              }}>
                {m.content}
              </span>
            </div>
          ))}
        </div>
        {/* 输入 */}
        <div style={{ borderTop: "1px solid var(--border)", padding: 12 }}>
          <textarea
            ref={inputRef}
            className="input"
            rows={2}
            placeholder="描述你想要的应用… 例如：做一个番茄钟，25分钟工作5分钟休息"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn" disabled={busy} onClick={send}>{busy ? "生成中…" : "生成"}</button>
          </div>
        </div>
      </div>

      {/* 预览 */}
      <div style={{ width: "45%", borderLeft: "1px solid var(--border)", background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#f5f5f5" }}>
          <span style={{ fontSize: 12, color: "#666" }}>预览</span>
          {activeId && html && (
            <button
              className="btn-ghost"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => {
                const url = `${location.origin}/p/${activeId}`;
                navigator.clipboard.writeText(url).then(() => alert("发布链接已复制：\n" + url));
              }}
            >
              复制发布链接
            </button>
          )}
        </div>
        {html ? (
          <iframe sandbox="allow-scripts" title="preview" srcDoc={html} style={{ flex: 1, width: "100%", border: 0 }} />
        ) : (
          <div style={{ color: "#888", padding: 24, fontSize: 13 }}>预览区：生成后这里实时显示</div>
        )}
      </div>
    </div>
  );
}
