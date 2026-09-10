/* ==========================================================================
   Pi Studio — front-end
   ========================================================================== */

/* ------------------------------- utils ---------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function timeAgo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const d = Date.now() - t;
  if (d < 45_000) return "刚刚";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} 分钟前`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} 小时前`;
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)} 天前`;
  return new Date(t).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}
function clockTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}
function fmtBytes(n) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** 难度（思考等级）的中文说明 */
const THINK_META = {
  off: { label: "关闭", desc: "不进行思考，最快、最省钱" },
  minimal: { label: "极简", desc: "极少推理" },
  low: { label: "简单", desc: "轻量推理，适合日常小改动" },
  medium: { label: "标准", desc: "速度与质量的平衡" },
  high: { label: "深入", desc: "更充分的推理，适合难 bug / 重构" },
  xhigh: { label: "极深", desc: "大量推理，明显更慢也更贵" },
  max: { label: "最大", desc: "不计成本地推理" },
};
const thinkLabel = (lv) => (THINK_META[lv] ? THINK_META[lv].label : lv || "关闭");

function fmtTokens(n) {
  n = Number(n) || 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0) + "k";
  return (n / 1_000_000).toFixed(2) + "M";
}
function fmtCost(c) {
  c = Number(c) || 0;
  if (c === 0) return "$0";
  if (c < 0.01) return "$" + c.toFixed(4);
  if (c < 1) return "$" + c.toFixed(3);
  return "$" + c.toFixed(2);
}

/* ------------------------------- icons ---------------------------------- */
const P = {
  plus: "M12 5v14M5 12h14",
  send: "M4.5 12h14M12.5 5.5l6.5 6.5-6.5 6.5",
  stop: "M7 7h10v10H7z",
  folder: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  chevron: "M9 6l6 6-6 6",
  chevD: "M6 9l6 6 6-6",
  copy: "M9 9h9a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2zM5 15H4a1 1 0 01-1-1V5a2 2 0 012-2h8a1 1 0 011 1v1",
  trash: "M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13",
  pencil: "M4 20h4l10-10-4-4L4 16zM14.5 5.5l4 4",
  pin: "M12 17v5M8 3h8l-1 7 3 3H6l3-3z",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  check: "M5 13l4 4L19 7",
  x: "M6 6l12 12M18 6L6 18",
  alert: "M12 9v4m0 4h.01M10.3 3.6L2.5 17a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.6a2 2 0 00-3.4 0z",
  info: "M12 16v-5m0-3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  brain: "M9 3a3 3 0 00-3 3v1a3 3 0 00-1 5.8V15a3 3 0 003 3h1a3 3 0 003 3v-3M9 3a3 3 0 013 3v15M15 3a3 3 0 013 3v1a3 3 0 011 5.8V15a3 3 0 01-3 3h-1a3 3 0 01-3 3",
  file: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5",
  terminal: "M5 7l5 5-5 5M13 17h6",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18",
  sparkle: "M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2 2 2 0 11-4 0 1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 15a2 2 0 010-4 1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0010 4.2a2 2 0 014 0 1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1A1.7 1.7 0 0021 11a2 2 0 010 4z",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 19h16",
  dot: "M12 12h.01",
  refresh: "M20 11a8 8 0 10-2.3 6.3M20 5v6h-6",
  menu: "M4 6h16M4 12h16M4 18h16",
  chat: "M21 12a8 8 0 01-11.4 7.2L3 21l1.8-6.6A8 8 0 1121 12z",
  sun: [
    "M12 17a5 5 0 100-10 5 5 0 000 10z",
    "M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  ],
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  chart: ["M4 20V11M10 20V4M16 20v-6M22 20H2"],
  coin: ["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 7v10M9.5 9.5h5M9.5 14.5h5"],
};
const svg = (path, cls = "") =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${(Array.isArray(path) ? path : [path])
    .map((d) => `<path d="${d}" />`)
    .join("")}</svg>`;
const pinIcon = (n) => svg(P[n]);

const TOOL_ICON = {
  read: "file",
  write: "pencil",
  edit: "pencil",
  bash: "terminal",
  powershell: "terminal",
  grep: "search",
  find: "search",
  ls: "folder",
  web_search: "globe",
  fetch: "globe",
};
const toolIcon = (name) => svg(P[TOOL_ICON[name]] || P.sparkle);

/* ------------------------------ markdown -------------------------------- */
function inlineFmt(s) {
  // 已被 mdToHtml 转义；内联代码已替换为 \u0000ICn\u0000 占位符。
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  s = s.replace(
    /\[([^\]]*)\]\(([^)\s]+)\)/g,
    (m, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t || u}</a>`
  );
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  return s;
}
function restoreCodes(html, codes) {
  return html.replace(/\u0000IC(\d+)\u0000/g, (m, a) => {
    const c = codes[Number(a)] ?? "";
    return `<code class="inline">${c}</code>`;
  });
}

function mdToHtml(src) {
  if (!src) return "";
  const blocks = [];
  let text = String(src).replace(/```([^\n`]*)\r?\n([\s\S]*?)(?:```|$)/g, (m, lang, code) => {
    const i = blocks.push({ lang: String(lang || "").trim(), code: code.replace(/\n$/, "") }) - 1;
    return `\u0000CB${i}\u0000`;
  });

  const inlineCodes = [];
  // protect inline code before escaping
  text = text.replace(/`([^`\n]+)`/g, (m, c) => `\u0000IC${inlineCodes.push(c) - 1}\u0000`);
  text = esc(text);

  const lines = text.split(/\r?\n/);
  const out = [];
  let i = 0;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${restoreCodes(inlineFmt(para.join("<br>")), inlineCodes)}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    const cb = line.match(/^\u0000CB(\d+)\u0000\s*$/);
    if (cb) {
      flushPara();
      const b = blocks[Number(cb[1])];
      out.push(renderCodeBlock(b.lang, b.code));
      i++;
      continue;
    }

    if (!line.trim()) {
      flushPara();
      i++;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const lvl = Math.min(h[1].length, 4);
      out.push(`<h${lvl}>${restoreCodes(inlineFmt(h[2]), inlineCodes)}</h${lvl}>`);
      i++;
      continue;
    }

    if (/^\s*([-*_])\s*\1\s*\1[\s\S]*$/.test(line) && line.replace(/[\s\-*_]/g, "") === "") {
      flushPara();
      out.push("<hr>");
      i++;
      continue;
    }

    // table
    if (line.includes("|") && lines[i + 1] && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      flushPara();
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(
        `<table><thead><tr>${head
          .map((c) => `<th>${restoreCodes(inlineFmt(c), inlineCodes)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${restoreCodes(inlineFmt(c), inlineCodes)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`
      );
      continue;
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${restoreCodes(inlineFmt(buf.join("<br>")), inlineCodes)}</blockquote>`);
      continue;
    }

    // lists
    const isUl = /^\s*[-*+]\s+/.test(line);
    const isOl = /^\s*\d+[.)]\s+/.test(line);
    if (isUl || isOl) {
      flushPara();
      const tag = isUl ? "ul" : "ol";
      const items = [];
      const re = isUl ? /^\s*[-*+]\s+(.*)$/ : /^\s*\d+[.)]\s+(.*)$/;
      while (i < lines.length) {
        const m = lines[i].match(re);
        if (!m) {
          // allow wrapped continuation lines
          if (lines[i].trim() && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) && items.length) {
            items[items.length - 1] += "<br>" + lines[i].trim();
            i++;
            continue;
          }
          break;
        }
        items.push(m[1]);
        i++;
      }
      out.push(
        `<${tag}>${items.map((t) => `<li>${restoreCodes(inlineFmt(t), inlineCodes)}</li>`).join("")}</${tag}>`
      );
      continue;
    }

    para.push(line);
    i++;
  }
  flushPara();
  return out.join("\n");
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function renderCodeBlock(lang, code) {
  return `<div class="codeblock">
    <div class="cb-head">
      <span class="cb-lang">${esc(lang || "text")}</span>
      <button class="cb-copy" type="button" data-act="copy-code">${pinIcon("copy")}复制</button>
    </div>
    <pre><code>${esc(code)}</code></pre>
  </div>`;
}

/* ------------------------------- api ----------------------------------- */
const QS = new URLSearchParams(location.search);
const NOSTREAM = QS.has("nostream") || QS.has("shot"); // 调试/截图用：不建立 SSE 长连接
// 演示模式：托管在 GitHub Pages 上，或显式加 ?demo
const DEMO_WANTED =
  /\.github\.io$/i.test(location.hostname) || QS.has("demo") || QS.has("autoplay");

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const txt = await res.text();
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = { ok: false, error: txt };
  }
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `请求失败 (${res.status})`);
    err.payload = data;
    throw err;
  }
  return data;
}

/* ------------------------------- state ---------------------------------- */
const S = {
  boot: null,
  projects: [],
  tasks: {}, // projectId -> task[]
  expanded: {}, // projectId -> bool
  activeProjectId: null,
  activeTaskId: null,
  messages: [],
  stream: null,
  toolRuns: {}, // toolCallId -> {text,isError,name,args,status}
  toolResults: {}, // toolCallId -> ToolResultMessage
  status: { streaming: false, status: "idle", model: null, thinkingLevel: "off", thinkingLevels: [] },
  stats: null,
  liveUsage: null,
  commands: [],
  models: null,
  loadingTask: false,
  es: null,
  drafts: {},
  queue: { steering: [], followUp: [] },
  pendingUi: null,
};

/* ------------------------------- theme ---------------------------------- */
const ACCENTS = [
  { id: "violet", name: "紫青", grad: "linear-gradient(135deg,#7c6cff,#29c3f6)" },
  { id: "mint", name: "浅绿", grad: "linear-gradient(135deg,#22c55e,#14b8a6)" },
  { id: "amber", name: "浅黄", grad: "linear-gradient(135deg,#f59e0b,#fbbf24)" },
  { id: "sakura", name: "樱花粉", grad: "linear-gradient(135deg,#f472b6,#ec4899)" },
  { id: "sky", name: "天蓝", grad: "linear-gradient(135deg,#38bdf8,#0891b2)" },
  { id: "lavender", name: "薰衣草", grad: "linear-gradient(135deg,#a78bfa,#8b5cf6)" },
];

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
function currentAccent() {
  const a = document.documentElement.getAttribute("data-accent");
  return ACCENTS.some((x) => x.id === a) ? a : "violet";
}
function applyTheme(theme, accent, persist = true) {
  const t = theme === "dark" ? "dark" : "light";
  const a = accent || currentAccent();
  document.documentElement.setAttribute("data-theme", t);
  document.documentElement.setAttribute("data-accent", a);
  if (persist && !window.__appearanceFromUrl) {
    try {
      localStorage.setItem("piStudioTheme", t);
      localStorage.setItem("piStudioAccent", a);
    } catch {}
  }
  const btn = $("#themeBtn");
  if (btn) {
    btn.innerHTML = t === "light" ? pinIcon("moon") : pinIcon("sun");
    btn.title = `外观（当前：${t === "light" ? "浅色" : "深色"} / ${ACCENTS.find((x) => x.id === a)?.name || a}）`;
  }
}
function toggleTheme() {
  applyTheme(currentTheme() === "light" ? "dark" : "light");
}

function openAppearanceModal() {
  const t = currentTheme();
  const a = currentAccent();
  openModal({
    title: "外观",
    wide: true,
    bodyHtml: `
      <div class="field">
        <label>明暗</label>
        <div class="scope-row">
          <button class="scope-opt ${t === "light" ? "sel" : ""}" data-scope="light">${pinIcon("sun")} 浅色</button>
          <button class="scope-opt ${t === "dark" ? "sel" : ""}" data-scope="dark">${pinIcon("moon")} 深色</button>
        </div>
      </div>
      <div class="field">
        <label>配色</label>
        <div class="accent-grid">
          ${ACCENTS.map(
            (x) => `<button class="accent-opt ${x.id === a ? "sel" : ""}" data-accent="${x.id}">
              <div class="accent-swatch" style="background:${x.grad}"></div>
              <div class="accent-name">${esc(x.name)}</div>
            </button>`
          ).join("")}
        </div>
        <div class="hint">快捷键 <code>Ctrl+Shift+L</code> 可快速切换明暗</div>
      </div>`,
    onMount({ overlay }) {
      overlay.addEventListener("click", (e) => {
        const s = e.target.closest("[data-scope]");
        if (s) {
          applyTheme(s.dataset.scope);
          overlay.querySelectorAll("[data-scope]").forEach((x) => x.classList.toggle("sel", x === s));
          return;
        }
        const ac = e.target.closest("[data-accent]");
        if (ac) {
          applyTheme(currentTheme(), ac.dataset.accent);
          overlay.querySelectorAll("[data-accent]").forEach((x) => x.classList.toggle("sel", x === ac));
        }
      });
    },
  });
}

/* --------------------------- 侧栏宽度拖动 -------------------------------- */
const SIDEBAR_MIN = 216;
const SIDEBAR_MAX = 540;
function initSidebarResize() {
  const handle = $("#sidebarResizer");
  if (!handle) return;
  try {
    const w = Number(localStorage.getItem("piStudioSidebarW"));
    if (w) document.documentElement.style.setProperty("--sidebar-w", clamp(w, SIDEBAR_MIN, SIDEBAR_MAX) + "px");
  } catch {}

  let dragging = false;
  let startX = 0;
  let startW = 0;

  const onMove = (e) => {
    if (!dragging) return;
    const w = clamp(startW + (e.clientX - startX), SIDEBAR_MIN, SIDEBAR_MAX);
    document.documentElement.style.setProperty("--sidebar-w", w + "px");
    e.preventDefault();
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    document.body.classList.remove("resizing");
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    const w = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-w"), 10);
    try {
      localStorage.setItem("piStudioSidebarW", String(w));
    } catch {}
  };

  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.clientX;
    startW = handle.parentElement.getBoundingClientRect().width;
    handle.classList.add("dragging");
    document.body.classList.add("resizing");
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    e.preventDefault();
  });
  handle.addEventListener("dblclick", () => {
    document.documentElement.style.removeProperty("--sidebar-w");
    try {
      localStorage.removeItem("piStudioSidebarW");
    } catch {}
    toast("侧栏宽度已复位", "ok", 1500);
  });
}

/* ------------------------ 对话内查找 (Ctrl+F) ---------------------------- */
S.find = { hits: [], idx: -1, query: "" };

function openFind() {
  if (!S.activeTaskId) {
    toast("先打开一个任务再查找", "info", 1800);
    return;
  }
  const bar = $("#findBar");
  if (!bar) return;
  bar.hidden = false;
  const input = $("#findInput");
  input.focus();
  input.select();
  if (input.value) runFind(input.value);
}

function closeFind() {
  const bar = $("#findBar");
  if (bar) bar.hidden = true;
  const input = $("#findInput");
  if (input) input.value = "";
  clearFindMarks();
  S.find = { hits: [], idx: -1, query: "" };
}

function clearFindMarks() {
  const thread = $("#thread");
  if (!thread) return;
  thread.querySelectorAll("mark.find-hit").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent || ""), m);
    parent.normalize();
  });
}

function runFind(query) {
  clearFindMarks();
  S.find = { hits: [], idx: -1, query: query || "" };
  const thread = $("#thread");
  const q = (query || "").trim();
  if (!thread || !q) return updateFindCount();
  const ql = q.toLowerCase();

  const walker = document.createTreeWalker(thread, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const v = node.nodeValue;
      if (!v || !v.trim()) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest("mark.find-hit")) return NodeFilter.FILTER_REJECT;
      if (p.closest("script, style")) return NodeFilter.FILTER_REJECT;
      return v.toLowerCase().includes(ql) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const targets = [];
  let n;
  while ((n = walker.nextNode())) targets.push(n);

  for (const textNode of targets) {
    const text = textNode.nodeValue;
    const lower = text.toLowerCase();
    const frag = document.createDocumentFragment();
    let pos = 0;
    let i;
    while ((i = lower.indexOf(ql, pos)) >= 0) {
      if (i > pos) frag.appendChild(document.createTextNode(text.slice(pos, i)));
      const mark = document.createElement("mark");
      mark.className = "find-hit";
      mark.textContent = text.slice(i, i + ql.length);
      frag.appendChild(mark);
      S.find.hits.push(mark);
      pos = i + ql.length;
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    textNode.parentNode.replaceChild(frag, textNode);
  }

  if (S.find.hits.length) S.find.idx = 0;
  updateFindCount();
  focusFindHit();
}

function updateFindCount() {
  const el = $("#findCount");
  if (!el) return;
  const f = S.find;
  el.textContent = f && f.hits.length ? `${f.idx + 1}/${f.hits.length}` : "0/0";
}

function focusFindHit() {
  const f = S.find;
  if (!f || !f.hits.length) return;
  f.hits.forEach((m, i) => m.classList.toggle("current", i === f.idx));
  const cur = f.hits[f.idx];
  if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "center", behavior: "smooth" });
}

function findStep(delta) {
  const f = S.find;
  if (!f || !f.hits.length) return;
  f.idx = (f.idx + delta + f.hits.length) % f.hits.length;
  updateFindCount();
  focusFindHit();
}

/* ------------------------- 跳转到某条消息 --------------------------------- */
function midOf(m) {
  return `${m.role}-${m.timestamp ?? ""}`;
}
function withMid(html, m) {
  if (!html) return html;
  return html.replace(/^<(\w+)/, `<$1 data-mid="${esc(midOf(m))}"`);
}
function jumpToMessage(role, timestamp) {
  const sel = `[data-mid="${cssEsc(`${role}-${timestamp ?? ""}`)}"]`;
  const el = document.querySelector(sel);
  if (!el) return false;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 1800);
  return true;
}

/* ------------------------ 全局搜索（跨会话） ----------------------------- */
function openSearch(initial = "") {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.style.alignItems = "flex-start";
  overlay.innerHTML = `
    <div class="search-panel">
      <div class="search-head">
        ${pinIcon("search")}
        <input id="srInput" type="text" autocomplete="off" placeholder="搜索所有历史对话 —— 问过的问题、助手的回答…" value="${esc(initial)}" />
      </div>
      <div class="search-filters">
        <button class="chip on" data-role="all">全部</button>
        <button class="chip" data-role="user">我问过的</button>
        <button class="chip" data-role="assistant">助手的回答</button>
        <span class="spacer"></span>
        <span class="muted" id="srMeta" style="font-size:11.5px"></span>
      </div>
      <div class="search-body" id="srBody">
        <div class="sr-empty">输入关键词开始搜索（支持中文）</div>
      </div>
      <div class="sr-foot"><span>↑↓ 选择 · Enter 打开 · Esc 关闭</span></div>
    </div>`;
  $("#modalRoot").appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const input = overlay.querySelector("#srInput");
  const body = overlay.querySelector("#srBody");
  const meta = overlay.querySelector("#srMeta");
  let role = "all";
  let flatHits = [];
  let cursor = 0;
  let seq = 0;
  let timer = null;

  const draw = (data) => {
    flatHits = [];
    if (!data || !data.results.length) {
      body.innerHTML = `<div class="sr-empty">${
        data && data.query ? `没有匹配「${esc(data.query)}」的内容` : "输入关键词开始搜索"
      }</div>`;
      meta.textContent = data ? `扫描 ${data.scanned} 个会话，用时 ${data.elapsedMs}ms` : "";
      return;
    }
    body.innerHTML = data.results
      .map(
        (r) => `
      <div class="sr-group">
        <div class="sr-head">
          <span class="sr-emoji" style="background:linear-gradient(135deg, ${esc(r.projectColor)}33, ${esc(
          r.projectColor
        )}14);border-color:${esc(r.projectColor)}55">${esc(r.projectEmoji)}</span>
          <span class="sr-title">${esc(r.title)}</span>
          <span class="sr-proj">${esc(r.projectName)} · ${esc(timeAgo(new Date(r.mtime).toISOString()))}</span>
        </div>
        ${r.hits
          .map((h, hi) => {
            const i = flatHits.length;
            flatHits.push({ r, h });
            return `<div class="sr-hit" data-i="${i}">
              <span class="sr-role ${h.role}">${h.role === "user" ? "我" : "Pi"}</span>
              <span class="sr-text">${esc(h.pre)}<mark>${esc(h.hit)}</mark>${esc(h.post)}</span>
            </div>`;
          })
          .join("")}
      </div>`
      )
      .join("");
    meta.textContent = `${data.results.length} 个会话 / ${data.totalHits} 处命中${data.truncated ? "（已截断）" : ""} · ${data.elapsedMs}ms`;
    cursor = 0;
    markCursor();
    body.querySelectorAll(".sr-hit").forEach((el) => {
      el.addEventListener("click", () => pick(Number(el.dataset.i)));
    });
  };

  const markCursor = () => {
    body.querySelectorAll(".sr-hit").forEach((el, i) => el.classList.toggle("active", i === cursor));
  };

  const pick = async (i) => {
    const item = flatHits[i];
    if (!item) return;
    close();
    const { r, h } = item;
    try {
      if (S.activeTaskId !== r.sessionId) {
        if (!r.projectId) {
          toast("这个会话所属的项目已不在列表中", "err", 5000);
          return;
        }
        await openTask(r.projectId, r.sessionId);
      }
      setTimeout(() => {
        if (!jumpToMessage(h.role, h.timestamp)) toast("已打开该会话，但没定位到那条消息", "info", 2500);
      }, 220);
    } catch (err) {
      toast(err.message, "err", 6000);
    }
  };

  const search = async () => {
    const q = input.value.trim();
    const mySeq = ++seq;
    if (!q) {
      draw(null);
      return;
    }
    meta.textContent = "搜索中…";
    try {
      const r = await api("GET", `/api/search?q=${encodeURIComponent(q)}&role=${role}`);
      if (mySeq !== seq) return;
      draw(r);
    } catch (err) {
      if (mySeq !== seq) return;
      body.innerHTML = `<div class="sr-empty">搜索失败：${esc(err.message)}</div>`;
    }
  };

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(search, 220);
  });
  overlay.querySelectorAll("[data-role]").forEach((chip) => {
    chip.addEventListener("click", () => {
      role = chip.dataset.role;
      overlay.querySelectorAll("[data-role]").forEach((c) => c.classList.toggle("on", c === chip));
      search();
    });
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cursor = clamp(cursor + 1, 0, Math.max(0, flatHits.length - 1));
      markCursor();
      body.querySelector(".sr-hit.active")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cursor = clamp(cursor - 1, 0, Math.max(0, flatHits.length - 1));
      markCursor();
      body.querySelector(".sr-hit.active")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(cursor);
    } else if (e.key === "Escape") {
      close();
    }
  });

  if (initial) search();
  setTimeout(() => input.focus(), 40);
}

/* ------------------------------ toasts ---------------------------------- */
function toast(msg, kind = "info", ms = 3600) {
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  const ic = kind === "ok" ? "check" : kind === "err" ? "alert" : "info";
  node.innerHTML = `<div class="t-ico">${pinIcon(ic)}</div><div class="t-msg">${esc(msg)}</div>`;
  $("#toasts").appendChild(node);
  setTimeout(() => {
    node.classList.add("out");
    setTimeout(() => node.remove(), 240);
  }, ms);
}

/* ------------------------------ modals ---------------------------------- */
function openModal({ title, bodyHtml, footHtml = "", wide = false, onMount }) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>${esc(title)}</h3>
        <button class="icon-btn" data-act="close-modal">${pinIcon("x")}</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ""}
    </div>`;
  $("#modalRoot").appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target.closest("[data-act='close-modal']")) close();
  });
  const apiObj = { overlay, close, $: (s) => overlay.querySelector(s) };
  onMount?.(apiObj);
  const first = overlay.querySelector("input,textarea,select,button.btn-primary");
  setTimeout(() => first?.focus(), 40);
  return apiObj;
}

function confirmDialog(title, message, { danger = true, okText = "确定" } = {}) {
  return new Promise((resolve) => {
    const m = openModal({
      title,
      bodyHtml: `<p style="margin:4px 0 8px;color:var(--text-dim);font-size:13.5px;white-space:pre-wrap">${esc(message)}</p>`,
      footHtml: `<button class="btn" data-act="close-modal">取消</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="okBtn">${esc(okText)}</button>`,
      onMount({ overlay, close }) {
        overlay.querySelector("#okBtn").addEventListener("click", () => {
          close();
          resolve(true);
        });
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay || e.target.closest("[data-act='close-modal']")) resolve(false);
        });
      },
    });
    void m;
  });
}

/* =========================================================================
   RENDER — sidebar
   ========================================================================= */
function renderSidebar() {
  const root = $("#projectList");
  if (!S.projects.length) {
    root.innerHTML = `<div class="empty-hint" style="margin:10px 4px;padding:26px 14px;font-size:12.5px">
      还没有项目<br/><span style="font-size:11.5px">点上方「新建项目」开始</span></div>`;
    return;
  }
  root.innerHTML = S.projects
    .map((p) => {
      const tasks = S.tasks[p.id] || [];
      const open = S.expanded[p.id] !== false;
      const active = p.id === S.activeProjectId;
      const running = tasks.some((t) => t.status === "ready" || t.status === "starting");
      return `
      <div class="p-item ${active ? "active" : ""}" data-act="open-project" data-id="${p.id}" title="${esc(p.path)}">
        <div class="p-avatar" style="background:linear-gradient(135deg, ${esc(p.color)}33, ${esc(p.color)}14);border-color:${esc(
        p.color
      )}55">${esc(p.emoji || "📁")}</div>
        <div class="p-main">
          <div class="p-name">${esc(p.name)}</div>
          <div class="p-sub">${tasks.length} 个任务${running ? " · <span style='color:var(--c)'>运行中</span>" : ""}</div>
        </div>
        <div class="p-actions">
          <button class="mini-btn" data-act="new-task" data-id="${p.id}" title="新建任务">${pinIcon("plus")}</button>
          <button class="mini-btn" data-act="project-menu" data-id="${p.id}" title="更多">${pinIcon("menu")}</button>
        </div>
      </div>
      <div class="p-tasks" style="${open ? "" : "display:none"}">
        ${
          tasks.length
            ? tasks
                .map(
                  (t) => `
          <div class="t-item ${t.id === S.activeTaskId ? "active" : ""}" data-act="open-task" data-id="${t.id}" data-project="${
                    p.id
                  }" title="${esc(t.title)}">
            <span class="t-dot ${t.status === "ready" ? "ready" : t.status === "starting" ? "running" : ""}"></span>
            <span class="t-title">${esc(t.title || "新任务")}</span>
            <button class="mini-btn" data-act="task-menu" data-id="${t.id}" data-project="${p.id}">${pinIcon("menu")}</button>
          </div>`
                )
                .join("")
            : `<div class="t-empty">暂无任务</div>`
        }
      </div>`;
    })
    .join("");
}

function renderTopbar() {
  const p = S.projects.find((x) => x.id === S.activeProjectId);
  const t = (S.tasks[S.activeProjectId] || []).find((x) => x.id === S.activeTaskId);
  const crumb = $("#crumb");
  if (t) {
    crumb.innerHTML = `
      <span class="c-proj">${esc(p?.emoji || "")} ${esc(p?.name || "")}</span>
      <span class="sep">/</span>
      <span class="c-name editable" data-act="rename-task" title="点击重命名">${esc(t.title || "新任务")}</span>
      ${S.status.streaming ? `<span class="pill accent" style="height:24px;font-size:11px">生成中…</span>` : ""}`;
  } else if (p) {
    crumb.innerHTML = `<span class="c-proj">${esc(p.emoji || "")} ${esc(p.name)}</span>`;
  } else {
    crumb.innerHTML = `<span class="c-proj muted">Pi Studio</span>`;
  }

  const right = $("#topbarRight");
  const model = S.status.model;
  const think = S.status.thinkingLevel || "off";
  const usage = S.stats?.contextUsage;
  const pct = usage?.percent ?? null;
  const live = S.liveUsage || {};
  const totalTokens = (S.stats?.tokens?.total ?? 0) + (live.totalTokens ?? 0);
  const totalCost = (S.stats?.cost ?? 0) + (live.cost?.total ?? 0);
  const streaming = S.status.streaming;

  right.innerHTML = t
    ? `
    <button class="pill" data-act="pick-model" title="切换模型">
      <span class="p-dot"></span>
      <span class="p-text">${esc(model?.name || model?.id || "模型")}</span>
    </button>

    <button class="pill ${think !== "off" ? "accent" : ""}" data-act="pick-thinking"
            title="切换难度（思考深度）">
      ${pinIcon("brain")}
      <span class="p-text">难度 · ${esc(thinkLabel(think))}</span>
    </button>

    <button class="pill usage-pill ${streaming && live.totalTokens ? "live" : ""}" data-act="show-stats"
            title="本次任务的 token 花销（点击看详情）">
      ${pinIcon("coin")}
      <span class="p-text mono">${esc(fmtTokens(totalTokens))} · ${esc(fmtCost(totalCost))}</span>
    </button>

    <div class="ctx-ring" data-act="show-stats" title="上下文窗口用量">
      <svg viewBox="0 0 36 36">
        <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7c6cff"/><stop offset="1" stop-color="#29c3f6"/>
        </linearGradient></defs>
        <circle class="bg" cx="18" cy="18" r="15"></circle>
        <circle class="fg" cx="18" cy="18" r="15"
          stroke-dasharray="${pct == null ? 0 : (clamp(pct, 0, 100) / 100) * 94.2} 94.2"></circle>
      </svg>
      <span>${pct == null ? "—" : Math.round(pct) + "%"}</span>
    </div>`
    : "";
}

/* =========================================================================
   RENDER — stage
   ========================================================================= */
function renderStage() {
  const stage = $("#stage");
  stage.classList.toggle("wide", !!S.activeTaskId || !!S.activeProjectId);
  const p = S.projects.find((x) => x.id === S.activeProjectId);
  const t = (S.tasks[S.activeProjectId] || []).find((x) => x.id === S.activeTaskId);

  if (t) {
    stage.innerHTML = `<div class="scroll-pad"><div class="thread" id="thread"></div></div>`;
    renderThread();
    renderComposerVisibility(true);
    return;
  }
  if (p) {
    stage.innerHTML = renderProjectHome(p);
    renderComposerVisibility(false);
    return;
  }
  stage.innerHTML = renderWelcome();
  renderComposerVisibility(false);
}

function renderWelcome() {
  const recent = S.projects.slice(0, 6);
  return `<div class="welcome">
    <div class="hero-orb">${svg(P.sparkle)}</div>
    <h1>欢迎回到 Pi Studio</h1>
    <p>选一个项目开始，或者新建一个 —— 每个项目都有自己独立的文件夹，任务井井有条。</p>
    <div class="hero-actions">
      <button class="btn btn-primary" data-act="new-project">${pinIcon("plus")} 新建项目</button>
      ${
        recent.length
          ? `<button class="btn" data-act="open-project" data-id="${recent[0].id}">继续「${esc(recent[0].name)}」</button>`
          : ""
      }
    </div>
    ${
      recent.length
        ? `<div class="recent"><h3>最近项目</h3><div class="recent-grid">${recent
            .map((x) => {
              const n = (S.tasks[x.id] || []).length;
              return `<div class="recent-card" data-act="open-project" data-id="${x.id}">
                <div class="p-avatar" style="background:linear-gradient(135deg, ${esc(x.color)}33, ${esc(x.color)}14);border-color:${esc(
                x.color
              )}55">${esc(x.emoji || "📁")}</div>
                <div class="rc-main">
                  <div class="rc-name">${esc(x.name)}</div>
                  <div class="rc-sub">${n} 个任务 · ${timeAgo(x.createdAt)}</div>
                </div>
              </div>`;
            })
            .join("")}</div></div>`
        : ""
    }
  </div>`;
}

function renderProjectHome(p) {
  const tasks = S.tasks[p.id] || [];
  return `
  <div class="proj-home">
    <div class="proj-hero">
      <div class="ph-avatar" style="background:linear-gradient(135deg, ${esc(p.color)}33, ${esc(p.color)}14);border-color:${esc(
    p.color
  )}66">${esc(p.emoji || "📁")}</div>
      <div style="min-width:0">
        <h2>${esc(p.name)}</h2>
        <div class="ph-path">${pinIcon("folder")}<span title="${esc(p.path)}">${esc(p.path)}</span></div>
      </div>
    </div>
    <div class="proj-actions">
      <button class="btn btn-primary" data-act="new-task" data-id="${p.id}">${pinIcon("plus")} 新建任务</button>
      <button class="btn" data-act="reveal" data-path="${esc(p.path)}">${pinIcon("folder")} 打开文件夹</button>
      <button class="btn" data-act="project-menu" data-id="${p.id}">${pinIcon("settings")} 项目设置</button>
    </div>
    ${
      tasks.length
        ? `<div class="task-grid">
            <div class="task-card new-card" data-act="new-task" data-id="${p.id}">
              ${pinIcon("plus")}<div>开始一个新任务</div>
            </div>
            ${tasks
              .map(
                (t) => `
              <div class="task-card" data-act="open-task" data-id="${t.id}" data-project="${p.id}">
                <div class="tc-top">
                  <span class="t-dot ${t.status === "ready" ? "ready" : t.status === "starting" ? "running" : ""}"></span>
                  <span class="tc-title">${esc(t.title || "新任务")}</span>
                  ${t.pinned ? `<span class="muted" style="font-size:11px">📌</span>` : ""}
                </div>
                <div class="tc-preview">${esc(t.preview || "还没有对话内容")}</div>
                <div class="tc-meta">
                  <span>${timeAgo(t.lastActivity || t.createdAt)}</span>
                  ${t.userMessages ? `<span class="dot-sep">·</span><span>${t.userMessages} 条消息</span>` : ""}
                  ${t.model ? `<span class="dot-sep">·</span><span class="mono">${esc(String(t.model).split("/").pop())}</span>` : ""}
                </div>
              </div>`
              )
              .join("")}
          </div>`
        : `<div class="empty-hint">还没有任务 —— 点「新建任务」开启第一次对话吧 ✨</div>`
    }
  </div>`;
}

/* =========================================================================
   RENDER — thread
   ========================================================================= */
function toolResultMap() {
  const map = {};
  for (const m of S.messages) {
    if (m.role === "toolResult" && m.toolCallId) map[m.toolCallId] = m;
  }
  return map;
}

function renderThread() {
  const thread = $("#thread");
  if (!thread) return;
  const stage = $("#stage");
  const stick = !stage || S._forceBottom || atBottom(stage);
  S._forceBottom = false;

  const results = toolResultMap();
  const parts = [];

  for (const m of S.messages) {
    if (m.role === "toolResult") continue; // merged into tool cards
    parts.push(withMid(renderMessage(m, results), m));
  }
  if (S.stream) parts.push(renderStreaming());
  if (!S.messages.length && !S.stream) {
    parts.push(`<div class="empty-hint" style="margin-top:40px">
      这是一个全新的任务 —— 在下面输入你想要的，然后按 Enter 发送吧 ✨</div>`);
  }
  thread.innerHTML = parts.join("");

  // 重绘后恢复对话内查找的高亮
  if (S.find?.query) {
    const keep = S.find.idx;
    runFind(S.find.query);
    if (keep > 0 && keep < S.find.hits.length) {
      S.find.idx = keep;
      updateFindCount();
      S.find.hits.forEach((m, i) => m.classList.toggle("current", i === keep));
    }
  }

  if (stick && stage) stage.scrollTop = stage.scrollHeight;
}

function renderMessage(m, results) {
  switch (m.role) {
    case "user":
      return renderUser(m);
    case "assistant":
      return renderAssistant(m, results);
    case "compactionSummary":
      return `<div class="notice info">${pinIcon("info")}<div><div class="n-title">上下文已压缩</div>
        <div class="n-body">${esc(m.summary || "")}</div></div></div>`;
    case "branchSummary":
      return `<div class="notice">${pinIcon("info")}<div><div class="n-title">分支摘要</div>
        <div class="n-body">${esc(m.summary || "")}</div></div></div>`;
    case "bashExecution":
      return `<div class="msg"><div class="tool">
        <div class="tool-head" data-act="toggle-tool">
          <div class="tool-ico">${pinIcon("terminal")}</div>
          <span class="tool-name">bash</span>
          <span class="tool-summary">${esc(m.command || "")}</span>
          <span class="tool-status">exit ${m.exitCode ?? "?"}</span>
        </div>
        <div class="tool-body"><pre>${esc(m.output || "")}</pre></div>
      </div></div>`;
    default:
      if (m.role === "custom" && m.display) {
        return `<div class="notice">${pinIcon("info")}<div class="n-body">${esc(contentToText(m.content))}</div></div>`;
      }
      return "";
  }
}

function contentToText(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .filter((b) => b?.type === "text")
      .map((b) => b.text)
      .join("\n");
  return "";
}

function renderUser(m) {
  const blocks = Array.isArray(m.content) ? m.content : [{ type: "text", text: String(m.content ?? "") }];
  const texts = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const imgs = blocks.filter((b) => b.type === "image");
  return `<div class="msg user"><div class="bubble">${esc(texts)}${
    imgs.length
      ? imgs
          .map(
            (b) =>
              `<img src="data:${esc(b.mimeType || "image/png")};base64,${esc(b.data)}" alt="attachment" />`
          )
          .join("")
      : ""
  }</div></div>`;
}

function assistantMeta(m) {
  const bits = [];
  if (m.model) bits.push(String(m.model).split("/").pop());
  if (m.timestamp) bits.push(clockTime(m.timestamp));
  if (m.usage?.cost?.total) bits.push(`$${m.usage.cost.total.toFixed(4)}`);
  return bits.map((b) => `<span>${esc(b)}</span>`).join('<span class="dot-sep">·</span>');
}

function renderAssistant(m, results) {
  const blocks = Array.isArray(m.content) ? m.content : [];
  const err = m.stopReason === "error" || m.errorMessage;

  const inner = blocks
    .map((b) => {
      if (b.type === "text") return `<div class="md">${mdToHtml(b.text)}</div>`;
      if (b.type === "thinking") return renderThinking(b.thinking, false);
      if (b.type === "toolCall") return renderToolCard(b, results[b.id], false);
      return "";
    })
    .join("");

  const errCard = err
    ? `<div class="notice error" style="margin-top:8px">${pinIcon("alert")}<div>
        <div class="n-title">模型调用出错</div>
        <div class="n-body">${esc(m.errorMessage || "未知错误（响应为空）")}</div></div></div>`
    : "";

  return `<div class="msg assistant">
    <div class="avatar">${svg(P.sparkle)}</div>
    <div class="body">
      <div class="meta-row">${assistantMeta(m)}
        <button class="mini-btn" data-act="copy-msg" data-idx="${S.messages.indexOf(m)}" title="复制">${pinIcon("copy")}</button>
      </div>
      ${inner || (err ? "" : '<div class="md" style="color:var(--text-mute)">（空回复）</div>')}
      ${errCard}
    </div>
  </div>`;
}

function renderThinking(text, open) {
  return `<details class="thinking" ${open ? "open" : ""}>
    <summary>💭 思考过程<span class="chev">${pinIcon("chevron")}</span></summary>
    <div class="think-body">${esc(text)}</div>
  </details>`;
}

function renderToolCard(call, result, streaming) {
  const run = S.toolRuns[call.id];
  const done = !!result;
  const isErr = result?.isError || run?.isError;
  const running = !done && (streaming || run?.status === "running" || (!result && S.status.streaming));
  const args = call.arguments || run?.args || {};
  const summary = toolSummary(call.name, args);
  const outText =
    (result ? contentToText(result.content) : null) ?? run?.text ?? (running ? "" : "（无输出）");

  return `<div class="tool ${running ? "running" : ""} ${isErr ? "error" : ""} ${done ? "" : "open"}" data-tool-id="${esc(
    call.id
  )}">
    <div class="tool-head" data-act="toggle-tool">
      <div class="tool-ico">${toolIcon(call.name)}</div>
      <span class="tool-name">${esc(call.name)}</span>
      <span class="tool-summary">${esc(summary)}</span>
      ${running ? `<div class="tool-spinner"></div>` : `<span class="tool-status">${isErr ? "失败" : done ? "完成" : ""}</span>`}
    </div>
    <div class="tool-body">
      ${Object.keys(args).length ? `<div class="tool-args">${esc(prettyArgs(args))}</div>` : ""}
      <div class="tool-label">输出</div>
      <pre>${esc(outText)}</pre>
    </div>
  </div>`;
}

function prettyArgs(args) {
  try {
    return Object.entries(args)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");
  } catch {
    return "";
  }
}

function toolSummary(name, args) {
  const a = args || {};
  const cand = a.command || a.path || a.file_path || a.pattern || a.query || a.url || a.filePath;
  if (cand) return String(cand).replace(/\s+/g, " ").slice(0, 120);
  const keys = Object.keys(a);
  if (!keys.length) return "";
  const first = a[keys[0]];
  return typeof first === "string" ? first.slice(0, 120) : JSON.stringify(first).slice(0, 120);
}

function renderStreaming() {
  const s = S.stream;
  const blocks = s.content || [];
  const body = blocks
    .map((b, i) => {
      if (b.type === "text") return `<div class="md" data-stream-block="${i}">${mdToHtml(b.text)}</div>`;
      if (b.type === "thinking") return renderThinking(b.thinking, false);
      if (b.type === "toolCall") return renderToolCard(b, S.toolResults[b.id], true);
      return "";
    })
    .join("");
  return `<div class="msg assistant" id="streamMsg">
    <div class="avatar">${svg(P.sparkle)}</div>
    <div class="body">
      <div class="meta-row"><span>${esc((s.model || "").split("/").pop() || "正在生成")}</span></div>
      ${body}<span class="cursor-blink"></span>
    </div>
  </div>`;
}

function updateStreamingDom() {
  const node = $("#streamMsg");
  if (!node) {
    renderThread();
    return;
  }
  const blocks = S.stream?.content || [];
  const container = node.querySelector(".body");
  const html =
    blocks
      .map((b, i) => {
        if (b.type === "text") return `<div class="md" data-stream-block="${i}">${mdToHtml(b.text)}</div>`;
        if (b.type === "thinking") return renderThinking(b.thinking, false);
        if (b.type === "toolCall") return renderToolCard(b, S.toolResults[b.id], true);
        return "";
      })
      .join("") + `<span class="cursor-blink"></span>`;
  const meta = container.querySelector(".meta-row");
  container.innerHTML = html;
  if (meta) container.prepend(meta);
  const stage = $("#stage");
  if (stage && (S._forceBottom || atBottom(stage, 140))) stage.scrollTop = stage.scrollHeight;
}

/** 判断滚动容器是否已接近底部 */
function atBottom(el, slack = 90) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= slack;
}

/* =========================================================================
   RENDER — composer
   ========================================================================= */
function buildComposer() {
  const wrap = $("#composerWrap");
  wrap.innerHTML = `
    <div class="composer" id="composer">
      <div class="attach-row" id="attachRow" style="display:none"></div>
      <div class="queue-hint" id="queueHint" style="display:none"></div>
      <textarea id="input" rows="1" placeholder="给 Pi 下达指令…  (Enter 发送 · Shift+Enter 换行 · 可粘贴图片)"></textarea>
      <div class="composer-bar">
        <div class="composer-hints" id="hints">
          <span><kbd>Enter</kbd> 发送</span>
          <span><kbd>/</kbd> 命令</span>
          <span><kbd>Ctrl K</kbd> 面板</span>
          <span id="composerErr" class="err"></span>
        </div>
        <button class="send-btn" id="sendBtn" title="发送">${pinIcon("send")}</button>
      </div>
    </div>`;

  const input = $("#input");
  input.addEventListener("input", () => {
    autoGrow(input);
    saveDraft();
    updateSlashMenu();
  });
  input.addEventListener("keydown", onComposerKey);
  input.addEventListener("paste", onPaste);
  input.addEventListener("blur", () => setTimeout(hideSlashMenu, 120));

  const composer = $("#composer");
  composer.addEventListener("dragover", (e) => {
    e.preventDefault();
    composer.style.borderColor = "rgba(139,125,255,.7)";
  });
  composer.addEventListener("dragleave", () => (composer.style.borderColor = ""));
  composer.addEventListener("drop", async (e) => {
    e.preventDefault();
    composer.style.borderColor = "";
    for (const f of e.dataTransfer?.files || []) {
      if (f.type.startsWith("image/")) await addImageFile(f);
    }
  });

  $("#sendBtn").addEventListener("click", onSendClick);
}

function autoGrow(t) {
  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 260) + "px";
}

function saveDraft() {
  if (!S.activeTaskId) return;
  S.drafts[S.activeTaskId] = $("#input")?.value || "";
}

function renderComposerVisibility(show) {
  $("#composerWrap").style.display = show ? "" : "none";
}

function updateComposerState() {
  const btn = $("#sendBtn");
  if (!btn) return;
  const streaming = S.status.streaming;
  btn.classList.toggle("stop", streaming);
  btn.title = streaming ? "停止生成 (Esc)" : "发送";
  btn.innerHTML = streaming ? pinIcon("stop") : pinIcon("send");

  const q = S.queue;
  const hint = $("#queueHint");
  const total = (q.steering?.length || 0) + (q.followUp?.length || 0);
  if (hint) {
    hint.style.display = total ? "" : "none";
    hint.innerHTML = total ? `${pinIcon("info")} 已排队 ${total} 条消息，将在当前回合结束后发送` : "";
  }
}

/* ---------------------------- attachments ------------------------------- */
async function addImageFile(file) {
  if (file.size > 8 * 1024 * 1024) {
    toast("图片不能超过 8MB", "err");
    return;
  }
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  S.attachments = S.attachments || [];
  S.attachments.push({ type: "image", data: b64, mimeType: file.type || "image/png", name: file.name || "image" });
  renderAttachments();
}

function onPaste(e) {
  const items = e.clipboardData?.items || [];
  const imgs = [...items].filter((it) => it.type.startsWith("image/"));
  if (!imgs.length) return;
  e.preventDefault();
  for (const it of imgs) {
    const f = it.getAsFile();
    if (f) addImageFile(f);
  }
}

function renderAttachments() {
  const row = $("#attachRow");
  if (!row) return;
  const list = S.attachments || [];
  row.style.display = list.length ? "" : "none";
  row.innerHTML = list
    .map(
      (a, i) => `<span class="attach-chip"><img src="data:${esc(a.mimeType)};base64,${esc(a.data)}" alt="" />
      <span>${esc(a.name)}</span>
      <button class="mini-btn" data-act="rm-attach" data-idx="${i}">${pinIcon("x")}</button></span>`
    )
    .join("");
}

/* =========================================================================
   ACTIONS
   ========================================================================= */
async function loadProjects() {
  const b = await api("GET", "/api/bootstrap");
  S.boot = b;
  S.projects = b.projects || [];
  $("#workspaceLabel").textContent = shortPath(b.workspaceRoot);
  $("#workspaceLabel").title = b.workspaceRoot;
}

function shortPath(p) {
  if (!p) return "工作区";
  const parts = String(p).split(/[\\/]/).filter(Boolean);
  return parts.length > 2 ? "…\\" + parts.slice(-2).join("/") : p;
}

async function loadTasks(projectId, { silent = false } = {}) {
  try {
    const r = await api("GET", `/api/projects/${projectId}/tasks`);
    S.tasks[projectId] = r.tasks || [];
    renderSidebar();
    if (S.activeProjectId === projectId && !S.activeTaskId) renderStage();
  } catch (err) {
    if (!silent) toast(err.message, "err");
  }
}

async function openProject(projectId) {
  S.activeProjectId = projectId;
  S.activeTaskId = null;
  S.expanded[projectId] = true;
  S.messages = [];
  S.stream = null;
  closeStream();
  await loadTasks(projectId, { silent: true });
  renderAll();
  api("POST", "/api/config", { lastProjectId: projectId, lastTaskId: null }).catch(() => {});
}

async function openTask(projectId, taskId) {
  if (S.activeTaskId && S.activeTaskId !== taskId) saveDraft();
  S.activeProjectId = projectId;
  S.activeTaskId = taskId;
  S.expanded[projectId] = true;
  S.messages = [];
  S.stream = null;
  S.toolRuns = {};
  S.toolResults = {};
  S.stats = null;
  S.liveUsage = null;
  S.loadingTask = true;
  S._forceBottom = true;
  S.status = {
    streaming: false,
    status: "starting",
    model: null,
    thinkingLevel: "off",
    thinkingLevels: [],
  };
  renderAll();
  if (!NOSTREAM) openStream(taskId);

  try {
    const r = await api("POST", `/api/tasks/${taskId}/open`, { projectId });
    S.messages = r.messages || [];
    S.commands = r.commands || [];
    S.status.model = r.state?.model || null;
    S.status.thinkingLevel = r.state?.thinkingLevel || "off";
    S.status.thinkingLevels = r.thinkingLevels || [];
    S.stats = r.stats || null;
    restoreDraft();
    S.loadingTask = false;
    renderAll();
    refreshStats();
    api("POST", "/api/config", { lastProjectId: projectId, lastTaskId: taskId }).catch(() => {});
    setTimeout(() => {
      const st = $("#stage");
      if (st) st.scrollTop = st.scrollHeight;
    }, 30);
  } catch (err) {
    S.loadingTask = false;
    toast(`打开任务失败：${err.message}`, "err", 6000);
    renderStage();
  }
}

function restoreDraft() {
  const input = $("#input");
  if (!input || !S.activeTaskId) return;
  input.value = S.drafts[S.activeTaskId] || "";
  autoGrow(input);
}

async function newTask(projectId) {
  try {
    toast("正在启动 pi 进程…", "info", 2200);
    const r = await api("POST", `/api/projects/${projectId}/tasks`, {});
    await loadTasks(projectId, { silent: true });
    S._forceBottom = true;
    await openTask(projectId, r.task.id);
    setTimeout(() => $("#input")?.focus(), 60);
  } catch (err) {
    toast(err.message, "err", 6000);
  }
}

async function onSendClick() {
  if (S.status.streaming) {
    await abortRun();
    return;
  }
  await sendPrompt();
}

function onComposerKey(e) {
  const menu = $("#slashMenu");
  const menuOpen = menu && !menu.hidden;
  if (menuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab")) {
    e.preventDefault();
    handleSlashKey(e.key);
    return;
  }
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if (!S.status.streaming) sendPrompt();
    else sendPrompt({ streamingBehavior: e.ctrlKey ? "followUp" : "steer" });
  }
  if (e.key === "Escape") {
    hideSlashMenu();
    if (S.status.streaming) abortRun();
  }
}

async function sendPrompt(opts = {}) {
  const input = $("#input");
  if (!input || !S.activeTaskId) return;
  const text = input.value.trim();
  const images = S.attachments || [];
  if (!text && !images.length) return;

  input.value = "";
  autoGrow(input);
  saveDraft();
  S.attachments = [];
  renderAttachments();
  $("#composerErr").textContent = "";

  const body = { message: text || "(图片)", projectId: S.activeProjectId };
  if (images.length) body.images = images;
  if (opts.streamingBehavior) body.streamingBehavior = opts.streamingBehavior;
  else if (S.status.streaming) body.streamingBehavior = "steer";

  try {
    await api("POST", `/api/tasks/${S.activeTaskId}/prompt`, body);
  } catch (err) {
    $("#composerErr").textContent = err.message;
    toast(err.message, "err", 6000);
    input.value = text;
  }
}

async function abortRun() {
  if (!S.activeTaskId) return;
  try {
    await api("POST", `/api/tasks/${S.activeTaskId}/abort`);
  } catch {}
}

async function refreshStats() {
  if (!S.activeTaskId) return;
  try {
    const r = await api("GET", `/api/tasks/${S.activeTaskId}/stats`);
    S.stats = r.data || null;
    renderTopbar();
  } catch {}
}

let _tbPending = false;
function scheduleTopbar() {
  if (_tbPending) return;
  _tbPending = true;
  requestAnimationFrame(() => {
    _tbPending = false;
    renderTopbar();
  });
}

/* =========================================================================
   SSE
   ========================================================================= */
function closeStream() {
  if (S.es) {
    S.es.close();
    S.es = null;
  }
}

function openStream(taskId) {
  closeStream();
  const es = new EventSource(`/api/tasks/${taskId}/stream`);
  S.es = es;
  es.onmessage = (ev) => {
    if (S.activeTaskId !== taskId) return;
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    handleStreamMessage(msg);
  };
  es.onerror = () => {
    /* EventSource 会自动重连 */
  };
}

let _rafPending = false;
function scheduleStreamRender() {
  if (_rafPending) return;
  _rafPending = true;
  requestAnimationFrame(() => {
    _rafPending = false;
    if (S.stream) updateStreamingDom();
  });
}

function handleStreamMessage(msg) {
  if (msg.type === "proc") {
    S.status.status = msg.status;
    if (msg.status === "error") toast(`pi 进程错误：${msg.message}`, "err", 8000);
    if (msg.status === "exited" && S.status.streaming) {
      S.status.streaming = false;
      renderAll();
    }
    return;
  }
  if (msg.type === "ui_request") {
    showExtensionDialog(msg.request);
    return;
  }
  if (msg.type === "ui_fire") {
    const r = msg.request;
    if (r.method === "notify") toast(r.message, r.notifyType === "error" ? "err" : "info");
    if (r.method === "set_editor_text" && $("#input")) {
      $("#input").value = r.text || "";
      autoGrow($("#input"));
    }
    if (r.method === "setTitle") document.title = r.title || "Pi Studio";
    return;
  }
  if (msg.type !== "pi") return;
  handlePiEvent(msg.event);
}

function handlePiEvent(e) {
  switch (e.type) {
    case "agent_start":
      S.status.streaming = true;
      S.liveUsage = null;
      updateComposerState();
      renderTopbar();
      break;

    case "message_start":
      if (e.message?.role === "assistant") {
        S.stream = { ...e.message, content: Array.isArray(e.message.content) ? [...e.message.content] : [] };
        renderThread();
      }
      break;

    case "message_update": {
      const d = e.assistantMessageEvent;
      if (!d) break;
      if (e.usage) {
        S.liveUsage = e.usage;
        scheduleTopbar();
      }
      if (!S.stream) S.stream = { role: "assistant", content: [], model: null, timestamp: Date.now() };
      const idx = d.contentIndex ?? 0;
      const c = S.stream.content;
      if (d.type === "text_start") c[idx] = { type: "text", text: "" };
      else if (d.type === "text_delta") {
        if (!c[idx] || c[idx].type !== "text") c[idx] = { type: "text", text: "" };
        c[idx].text += d.delta || "";
      } else if (d.type === "text_end") {
        c[idx] = { type: "text", text: d.content ?? c[idx]?.text ?? "" };
      } else if (d.type === "thinking_start") c[idx] = { type: "thinking", thinking: "" };
      else if (d.type === "thinking_delta") {
        if (!c[idx] || c[idx].type !== "thinking") c[idx] = { type: "thinking", thinking: "" };
        c[idx].thinking += d.delta || "";
      } else if (d.type === "thinking_end") {
        c[idx] = { type: "thinking", thinking: d.content ?? c[idx]?.thinking ?? "" };
      } else if (d.type === "toolcall_start") {
        c[idx] = { type: "toolCall", id: d.id, name: d.toolName, arguments: {} };
        S.toolRuns[d.id] = { status: "running", args: {}, text: "" };
      } else if (d.type === "toolcall_delta") {
        const cur = c[idx];
        if (cur) {
          cur._raw = (cur._raw || "") + (d.delta || "");
          try {
            cur.arguments = JSON.parse(cur._raw);
          } catch {}
        }
      } else if (d.type === "toolcall_end") {
        if (d.toolCall) c[idx] = d.toolCall;
      }
      scheduleStreamRender();
      break;
    }

    case "message_end": {
      const m = e.message;
      if (!m) break;
      if (m.role === "assistant") {
        S.stream = null;
        pushMessage(m);
        renderThread();
      } else if (m.role === "user" || m.role === "compactionSummary" || m.role === "branchSummary" || m.role === "custom") {
        pushMessage(m);
        renderThread();
      } else if (m.role === "toolResult") {
        if (m.toolCallId) S.toolResults[m.toolCallId] = m;
        pushMessage(m);
        renderThread();
      }
      break;
    }

    case "tool_execution_start": {
      S.toolRuns[e.toolCallId] = { status: "running", args: e.args || {}, text: "", name: e.toolName };
      renderThread();
      break;
    }
    case "tool_execution_update": {
      const run = (S.toolRuns[e.toolCallId] ||= { status: "running", args: e.args || {}, text: "" });
      run.text = contentToText(e.partialResult?.content) || run.text;
      run.args = e.args || run.args;
      if (S.stream) scheduleStreamRender();
      else updateToolDom(e.toolCallId);
      break;
    }
    case "tool_execution_end": {
      const run = (S.toolRuns[e.toolCallId] ||= { args: e.args || {}, text: "" });
      run.status = "done";
      run.isError = e.isError;
      run.text = contentToText(e.result?.content) || run.text;
      run.args = e.args || run.args;
      renderThread();
      break;
    }

    case "queue_update":
      S.queue = { steering: e.steering || [], followUp: e.followUp || [] };
      updateComposerState();
      break;

    case "compaction_start":
      toast("正在压缩上下文…", "info", 2200);
      break;
    case "compaction_end":
      if (e.result) toast(`上下文已压缩：${e.result.tokensBefore ?? "?"} → ${e.result.estimatedTokensAfter ?? "?"} tokens`, "ok");
      break;

    case "auto_retry_start":
      toast(`请求失败，正在重试（${e.attempt}/${e.maxAttempts}）…`, "info", 3000);
      break;
    case "auto_retry_end":
      if (!e.success) toast(`重试失败：${e.finalError || ""}`, "err", 8000);
      break;

    case "extension_error":
      toast(`扩展出错：${e.error}`, "err", 6000);
      break;

    case "agent_settled":
    case "agent_end":
      if (e.type === "agent_settled") {
        S.status.streaming = false;
        S.stream = null;
        S.liveUsage = null;
        S.queue = { steering: [], followUp: [] };
        updateComposerState();
        renderThread();
        renderTopbar();
        refreshStats();
        loadTasks(S.activeProjectId, { silent: true });
      }
      break;

    default:
      break;
  }
}

function cssEsc(s) {
  return window.CSS?.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&");
}

function updateToolDom(id) {
  const card = document.querySelector(`[data-tool-id="${cssEsc(id)}"]`);
  if (!card) return;
  const run = S.toolRuns[id];
  const pre = card.querySelector(".tool-body pre");
  if (pre && run) pre.textContent = run.text || "";
  const st = card.querySelector(".tool-status");
  if (st && run?.status !== "running") st.textContent = run?.isError ? "失败" : "完成";
}

function pushMessage(m) {
  const last = S.messages[S.messages.length - 1];
  if (
    last &&
    last.role === m.role &&
    last.timestamp === m.timestamp &&
    JSON.stringify(last.content) === JSON.stringify(m.content)
  ) {
    return; // 去重
  }
  S.messages.push(m);
}

/* =========================================================================
   Extension UI dialogs
   ========================================================================= */
function showExtensionDialog(req) {
  const respond = (payload) => {
    api("POST", `/api/tasks/${S.activeTaskId}/ui-response`, { id: req.id, ...payload }).catch(() => {});
  };
  if (req.method === "confirm") {
    openModal({
      title: req.title || "确认",
      bodyHtml: `<p style="color:var(--text-dim);font-size:13.5px;white-space:pre-wrap">${esc(req.message || "")}</p>`,
      footHtml: `<button class="btn" data-act="close-modal" id="noBtn">取消</button>
                 <button class="btn btn-primary" id="yesBtn">确定</button>`,
      onMount({ overlay, close }) {
        overlay.querySelector("#yesBtn").onclick = () => {
          respond({ confirmed: true });
          close();
        };
        overlay.querySelector("#noBtn").onclick = () => {
          respond({ cancelled: true });
          close();
        };
      },
    });
    return;
  }
  if (req.method === "select") {
    openModal({
      title: req.title || "请选择",
      bodyHtml: `<div style="display:flex;flex-direction:column;gap:7px">${(req.options || [])
        .map(
          (o, i) =>
            `<button class="btn" style="justify-content:flex-start" data-opt="${esc(o)}" data-i="${i}">${esc(o)}</button>`
        )
        .join("")}</div>`,
      onMount({ overlay, close }) {
        overlay.addEventListener("click", (e) => {
          const b = e.target.closest("[data-opt]");
          if (!b) return;
          respond({ value: b.dataset.opt });
          close();
        });
      },
    });
    return;
  }
  if (req.method === "input" || req.method === "editor") {
    const multi = req.method === "editor";
    openModal({
      title: req.title || "输入",
      wide: multi,
      bodyHtml: multi
        ? `<textarea class="input" id="uiText" rows="10" style="resize:vertical">${esc(req.prefill || "")}</textarea>`
        : `<input class="input" id="uiText" placeholder="${esc(req.placeholder || "")}" value="${esc(req.prefill || "")}" />`,
      footHtml: `<button class="btn" data-act="close-modal">取消</button><button class="btn btn-primary" id="uiOk">确定</button>`,
      onMount({ overlay, close }) {
        const send = () => {
          respond({ value: overlay.querySelector("#uiText").value });
          close();
        };
        overlay.querySelector("#uiOk").onclick = send;
        overlay.querySelector("#uiText").addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !multi && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        });
      },
    });
  }
}

/* =========================================================================
   Slash commands
   ========================================================================= */
function updateSlashMenu() {
  const input = $("#input");
  const menu = $("#slashMenu");
  if (!input) return;
  const v = input.value;
  if (!v.startsWith("/") || v.includes("\n")) return hideSlashMenu();
  const q = v.slice(1).toLowerCase();
  const list = (S.commands || [])
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q))
    .slice(0, 40);
  if (!list.length) return hideSlashMenu();
  S._slash = list;
  S._slashIdx = 0;
  menu.hidden = false;
  menu.innerHTML = list
    .map(
      (c, i) => `<div class="slash-item ${i === 0 ? "active" : ""}" data-i="${i}">
        <span class="si-name">/${esc(c.name)}</span>
        <span class="si-desc">${esc(c.description || "")}</span>
        <span class="si-src">${esc(c.source || "")}</span>
      </div>`
    )
    .join("");
  const r = input.getBoundingClientRect();
  menu.style.left = `${Math.min(r.left, window.innerWidth - 440)}px`;
  menu.style.top = `${Math.max(60, r.top - Math.min(330, list.length * 40 + 14) - 8)}px`;
  menu.querySelectorAll(".slash-item").forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      applySlash(list[Number(el.dataset.i)]);
    });
  });
}
function hideSlashMenu() {
  const m = $("#slashMenu");
  if (m) m.hidden = true;
}
function handleSlashKey(key) {
  const list = S._slash || [];
  if (!list.length) return;
  const items = $$("#slashMenu .slash-item");
  if (key === "Enter" || key === "Tab") return applySlash(list[S._slashIdx]);
  S._slashIdx = clamp(S._slashIdx + (key === "ArrowDown" ? 1 : -1), 0, list.length - 1);
  items.forEach((el, i) => el.classList.toggle("active", i === S._slashIdx));
  items[S._slashIdx]?.scrollIntoView({ block: "nearest" });
}
function applySlash(cmd) {
  const input = $("#input");
  if (!input || !cmd) return;
  input.value = `/${cmd.name} `;
  hideSlashMenu();
  autoGrow(input);
  input.focus();
  saveDraft();
}

/* =========================================================================
   Command palette
   ========================================================================= */
function openPalette() {
  const items = [];
  for (const p of S.projects) {
    items.push({ kind: "项目", title: `${p.emoji || "📁"} ${p.name}`, sub: p.path, act: () => openProject(p.id) });
    for (const t of S.tasks[p.id] || []) {
      items.push({
        kind: "任务",
        title: t.title,
        sub: `${p.name} · ${timeAgo(t.lastActivity || t.createdAt)}`,
        act: () => openTask(p.id, t.id),
      });
    }
  }
  const actions = [
    { kind: "操作", title: "新建项目", sub: "创建一个新的项目文件夹", act: () => openProjectModal() },
    {
      kind: "操作",
      title: "新建任务",
      sub: S.activeProjectId ? "在当前项目中" : "先选一个项目",
      act: () => S.activeProjectId && newTask(S.activeProjectId),
    },
    { kind: "操作", title: "搜索历史对话", sub: "在所有过去的问题和回答里搜索", act: () => openSearch(), hint: "Ctrl+Shift+F" },
    { kind: "操作", title: "在本对话中查找", sub: S.activeTaskId ? "当前任务内定位关键词" : "先打开一个任务", act: () => openFind() },
    { kind: "操作", title: "外观设置（明暗 / 配色）", sub: `${currentTheme() === "light" ? "浅色" : "深色"} · ${ACCENTS.find((x) => x.id === currentAccent())?.name || ""}`, act: () => openAppearanceModal() },
    { kind: "操作", title: "切换模型", sub: "选择要使用的模型", act: () => S.activeTaskId && openModelPicker() },
    { kind: "操作", title: "打开工作区文件夹", sub: S.boot?.workspaceRoot, act: () => revealPath(S.boot?.workspaceRoot) },
    { kind: "操作", title: "刷新任务列表", sub: "", act: () => S.activeProjectId && loadTasks(S.activeProjectId) },
  ];
  const all = [...actions, ...items];

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.style.alignItems = "flex-start";
  overlay.innerHTML = `<div class="palette">
    <input id="palInput" placeholder="搜索项目、任务或操作…" />
    <div class="palette-list" id="palList"></div>
  </div>`;
  $("#modalRoot").appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  let idx = 0;
  let filtered = all;
  const listEl = overlay.querySelector("#palList");
  const inputEl = overlay.querySelector("#palInput");

  const draw = () => {
    let lastKind = null;
    listEl.innerHTML = filtered
      .map((it, i) => {
        const head = it.kind !== lastKind ? `<div class="pal-group">${esc(it.kind)}</div>` : "";
        lastKind = it.kind;
        return `${head}<div class="pal-item ${i === idx ? "active" : ""}" data-i="${i}">
          <div class="pal-ico">${it.kind === "操作" ? "⚡" : it.kind === "项目" ? "📁" : "💬"}</div>
          <div class="pal-main">
            <div class="pal-title">${esc(it.title)}</div>
            ${it.sub ? `<div class="pal-sub">${esc(it.sub)}</div>` : ""}
          </div>
        </div>`;
      })
      .join("") || `<div class="fb-empty">没有匹配项</div>`;
    listEl.querySelectorAll(".pal-item").forEach((el) =>
      el.addEventListener("click", () => {
        close();
        filtered[Number(el.dataset.i)].act();
      })
    );
  };
  inputEl.addEventListener("input", () => {
    const q = inputEl.value.toLowerCase();
    filtered = all.filter((it) => (it.title + " " + (it.sub || "")).toLowerCase().includes(q));
    idx = 0;
    draw();
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      idx = clamp(idx + 1, 0, filtered.length - 1);
      draw();
      listEl.querySelector(".pal-item.active")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      idx = clamp(idx - 1, 0, filtered.length - 1);
      draw();
      listEl.querySelector(".pal-item.active")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      close();
      filtered[idx]?.act();
    } else if (e.key === "Escape") close();
  });
  draw();
  setTimeout(() => inputEl.focus(), 30);
}

/* =========================================================================
   Project modal + folder browser
   ========================================================================= */
const EMOJIS = ["🌿","🚀","🎨","📚","🧩","🌙","🔥","🪐","🍀","💡","🧪","🎧","🐳","🌸","⚡","🗂️","🧠","🛠️","🎮","🏔️","☕","🍄","🦋","🌻"];
const COLORS = ["#8b7dff","#43e0ff","#ff7ac8","#5eead4","#fbbf24","#a78bfa","#34d399","#fb7185","#60a5fa","#f97316"];

function openProjectModal(existing = null) {
  const isNew = !existing;
  const state = {
    emoji: existing?.emoji || EMOJIS[S.projects.length % EMOJIS.length],
    color: existing?.color || COLORS[S.projects.length % COLORS.length],
    createFolder: isNew,
    path: existing?.path || "",
  };
  openModal({
    title: isNew ? "新建项目" : "项目设置",
    wide: true,
    bodyHtml: `
      <div class="field">
        <label>项目名称</label>
        <input class="input" id="pName" placeholder="例如：个人网站、数据分析…" value="${esc(existing?.name || "")}" />
      </div>
      <div class="field">
        <label>图标</label>
        <div class="emoji-grid" id="pEmoji">${EMOJIS.map(
          (e) => `<div class="emoji-opt ${e === state.emoji ? "sel" : ""}" data-emoji="${e}">${e}</div>`
        ).join("")}</div>
      </div>
      <div class="field">
        <label>主题色</label>
        <div class="color-grid" id="pColor">${COLORS.map(
          (c) =>
            `<div class="color-opt ${c === state.color ? "sel" : ""}" data-color="${c}" style="background:${c}"></div>`
        ).join("")}</div>
      </div>
      <div class="field">
        <label>文件夹</label>
        <div class="path-row">
          <input class="input mono" id="pPath" placeholder="留空则自动创建" value="${esc(existing?.path || "")}" />
          <button class="btn" id="pBrowse" type="button">${pinIcon("folder")} 浏览</button>
        </div>
        <div class="hint" id="pPathHint">${
          isNew ? "留空 → 在 <code>工作区</code> 下自动创建同名文件夹" : "项目的工作目录"
        }</div>
      </div>
    `,
    footHtml: `<button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn-primary" id="pSave">${isNew ? "创建项目" : "保存"}</button>`,
    onMount({ overlay, close }) {
      const emojiEl = overlay.querySelector("#pEmoji");
      const colorEl = overlay.querySelector("#pColor");
      const pathEl = overlay.querySelector("#pPath");
      emojiEl.addEventListener("click", (e) => {
        const o = e.target.closest("[data-emoji]");
        if (!o) return;
        state.emoji = o.dataset.emoji;
        $$(".emoji-opt", emojiEl).forEach((x) => x.classList.toggle("sel", x === o));
      });
      colorEl.addEventListener("click", (e) => {
        const o = e.target.closest("[data-color]");
        if (!o) return;
        state.color = o.dataset.color;
        $$(".color-opt", colorEl).forEach((x) => x.classList.toggle("sel", x === o));
      });
      overlay.querySelector("#pBrowse").addEventListener("click", () => {
        openFolderBrowser(pathEl.value || S.boot?.workspaceRoot, (picked) => {
          pathEl.value = picked;
        });
      });
      overlay.querySelector("#pSave").addEventListener("click", async () => {
        const name = overlay.querySelector("#pName").value.trim();
        if (!name) return toast("请填写项目名称", "err");
        const path = pathEl.value.trim();
        try {
          if (isNew) {
            const r = await api("POST", "/api/projects", {
              name,
              emoji: state.emoji,
              color: state.color,
              path: path || undefined,
              createFolder: true,
            });
            close();
            await loadProjects();
            await openProject(r.project.id);
            toast(`项目「${name}」已创建`, "ok");
          } else {
            const r = await api("PATCH", `/api/projects/${existing.id}`, {
              name,
              emoji: state.emoji,
              color: state.color,
              path: path || existing.path,
            });
            close();
            const i = S.projects.findIndex((x) => x.id === existing.id);
            S.projects[i] = r.project;
            renderAll();
            toast("已保存", "ok");
          }
        } catch (err) {
          toast(err.message, "err", 6000);
        }
      });
    },
  });
}

function openFolderBrowser(startPath, onPick) {
  const state = { path: startPath || null };
  openModal({
    title: "选择文件夹",
    wide: true,
    bodyHtml: `
      <div class="fb-path" id="fbPath">…</div>
      <div class="fb-list" id="fbList"><div class="fb-empty">加载中…</div></div>
    `,
    footHtml: `<div class="left muted" style="font-size:12px">双击/单击进入 · 选中即确认</div>
      <button class="btn" data-act="close-modal">取消</button>
      <button class="btn btn-primary" id="fbPick">选择当前文件夹</button>`,
    onMount({ overlay, close }) {
      const pathEl = overlay.querySelector("#fbPath");
      const listEl = overlay.querySelector("#fbList");
      const load = async (p) => {
        listEl.innerHTML = `<div class="fb-empty">加载中…</div>`;
        try {
          const r = await api("GET", `/api/fs/list?path=${encodeURIComponent(p ?? "roots")}`);
          state.path = r.path;
          pathEl.textContent = r.path || "选择一个位置";
          const rows = [];
          if (r.parent) {
            rows.push(
              `<div class="fb-row" data-nav="${esc(r.parent)}"><span class="fb-ico">${pinIcon("chevron")}</span><span class="fb-name">.. 上一级</span></div>`
            );
          }
          rows.push(
            ...r.entries.map(
              (e) =>
                `<div class="fb-row" data-nav="${esc(e.path)}"><span class="fb-ico">${pinIcon("folder")}</span><span class="fb-name">${esc(
                  e.name
                )}</span></div>`
            )
          );
          listEl.innerHTML = rows.join("") || `<div class="fb-empty">没有子文件夹</div>`;
          listEl.querySelectorAll("[data-nav]").forEach((el) =>
            el.addEventListener("click", () => load(el.dataset.nav))
          );
        } catch (err) {
          listEl.innerHTML = `<div class="fb-empty">${esc(err.message)}</div>`;
        }
      };
      overlay.querySelector("#fbPick").addEventListener("click", () => {
        if (!state.path) return toast("请先进入一个文件夹", "err");
        close();
        onPick(state.path);
      });
      load(state.path);
    },
  });
}

/* =========================================================================
   Model / thinking pickers
   ========================================================================= */
async function openModelPicker() {
  if (!S.activeTaskId) return;
  let data = S.models;
  if (!data) {
    toast("正在加载模型列表…", "info", 1800);
    try {
      data = await api("GET", "/api/models");
      S.models = data;
    } catch (err) {
      return toast(`加载模型失败：${err.message}`, "err", 7000);
    }
  }
  const cur = S.status.model;
  const models = data.models || [];
  const byProvider = {};
  for (const m of models) (byProvider[m.provider] ||= []).push(m);

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.style.alignItems = "flex-start";
  overlay.innerHTML = `<div class="palette" style="max-width:680px">
    <input id="mInput" placeholder="搜索模型（支持 provider / 名字）…" />
    <div class="palette-list" id="mList" style="max-height:440px"></div>
  </div>`;
  $("#modalRoot").appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  let idx = 0;
  let flat = [];
  const listEl = overlay.querySelector("#mList");
  const inputEl = overlay.querySelector("#mInput");

  const draw = (q = "") => {
    const ql = q.toLowerCase();
    flat = [];
    const groups = [];
    for (const [prov, list] of Object.entries(byProvider)) {
      const filtered = list.filter(
        (m) => !ql || m.id.toLowerCase().includes(ql) || (m.name || "").toLowerCase().includes(ql) || prov.includes(ql)
      );
      if (!filtered.length) continue;
      filtered.sort((a, b) => (a.id === cur?.id ? -1 : b.id === cur?.id ? 1 : a.name.localeCompare(b.name)));
      groups.push({ prov, filtered, start: flat.length });
      flat.push(...filtered);
    }
    if (!flat.length) {
      listEl.innerHTML = `<div class="fb-empty">没有匹配的模型</div>`;
      return;
    }
    listEl.innerHTML = groups
      .map(
        (g) => `<div class="pal-group">${esc(g.prov)}</div>` +
          g.filtered
            .map((m, j) => {
              const i = g.start + j;
              const isCur = m.id === cur?.id;
              return `<div class="pal-item ${i === idx ? "active" : ""}" data-i="${i}">
                <div class="pal-ico">${isCur ? "✓" : "◆"}</div>
                <div class="pal-main">
                  <div class="pal-title">${esc(m.name || m.id)}</div>
                  <div class="pal-sub">${esc(m.id)} · ${Math.round((m.contextWindow || 0) / 1000)}k ctx${
                m.reasoning ? " · 推理" : ""
              }${m.input?.includes("image") ? " · 图片" : ""}</div>
                </div>
                ${isCur ? '<span class="pal-kind">当前</span>' : ""}
              </div>`;
            })
            .join("")
      )
      .join("");
    listEl.querySelectorAll(".pal-item").forEach((el) =>
      el.addEventListener("click", () => pick(flat[Number(el.dataset.i)]))
    );
  };

  const pick = async (m) => {
    if (!m) return;
    close();
    try {
      await api("POST", `/api/tasks/${S.activeTaskId}/model`, { provider: m.provider, modelId: m.id });
      S.status.model = m;
      renderTopbar();
      toast(`已切换到 ${m.name || m.id}`, "ok");
      refreshStats();
    } catch (err) {
      toast(err.message, "err", 6000);
    }
  };

  inputEl.addEventListener("input", () => {
    idx = 0;
    draw(inputEl.value);
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      idx = clamp(idx + 1, 0, flat.length - 1);
      draw(inputEl.value);
      listEl.querySelector(".pal-item.active")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      idx = clamp(idx - 1, 0, flat.length - 1);
      draw(inputEl.value);
      listEl.querySelector(".pal-item.active")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(flat[idx]);
    } else if (e.key === "Escape") close();
  });
  draw();
  setTimeout(() => inputEl.focus(), 30);
}

function openThinkingPicker() {
  if (!S.activeTaskId) return;
  const cur = S.status.thinkingLevel || "off";
  const levels = (S.status.thinkingLevels && S.status.thinkingLevels.length
    ? S.status.thinkingLevels
    : ["off", "low", "medium", "high"]
  );

  const draw = (list) =>
    list
      .map((lv) => {
        const m = THINK_META[lv] || { label: lv, desc: "" };
        return `<button class="think-opt ${lv === cur ? "sel" : ""}" data-lvl="${esc(lv)}">
            <span class="to-radio"></span>
            <span class="to-main">
              <span class="to-label">${esc(m.label)}</span>
              <span class="to-desc">${esc(m.desc)}</span>
            </span>
            <span class="to-code mono">${esc(lv)}</span>
          </button>`;
      })
      .join("");

  const m = openModal({
    title: "难度（思考深度）",
    wide: true,
    bodyHtml: `
      <p style="margin:2px 0 14px;color:var(--text-dim);font-size:13px">
        难度越高，模型推理越充分；但速度更慢、耗的 token 也更多。
      </p>
      <div class="think-list">${draw(levels)}</div>`,
    onMount({ overlay, close }) {
      overlay.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-lvl]");
        if (!b) return;
        const lvl = b.dataset.lvl;
        close();
        try {
          await api("POST", `/api/tasks/${S.activeTaskId}/thinking`, { level: lvl });
          S.status.thinkingLevel = lvl;
          renderTopbar();
          toast(`难度已切换为「${thinkLabel(lvl)}」`, "ok");
        } catch (err) {
          toast(err.message, "err", 6000);
        }
      });
      // 如果还没拿到该模型支持的等级，异步补上
      api("GET", `/api/tasks/${S.activeTaskId}/thinking-levels`)
        .then((r) => {
          const list = r.levels || [];
          if (!list.length) return;
          S.status.thinkingLevels = list;
          const box = overlay.querySelector(".think-list");
          if (box) box.innerHTML = draw(list);
        })
        .catch(() => {});
    },
  });
  void m;
}

function showStats() {
  const u = S.stats;
  const live = S.liveUsage || {};
  const cu = u?.contextUsage;
  const tk = u?.tokens || {};
  const totalTokens = (tk.total ?? 0) + (live.totalTokens ?? 0);
  const cost = (u?.cost ?? 0) + (live.cost?.total ?? 0);
  const inTok = (tk.input ?? 0) + (live.input ?? 0);
  const outTok = (tk.output ?? 0) + (live.output ?? 0);
  const cacheTok = (tk.cacheRead ?? 0) + (live.cacheRead ?? 0);
  openModal({
    title: "Token 花销",
    wide: true,
    bodyHtml: `
      <div class="stat-grid">
        ${statCard("本次花销", fmtCost(cost), `${totalTokens.toLocaleString()} tokens`, true)}
        ${statCard("上下文窗口", cu ? `${fmtTokens(cu.tokens)} / ${fmtTokens(cu.contextWindow)}` : "—", cu ? `已用 ${Math.round(cu.percent)}%` : "暂无数据")}
        ${statCard("输入", fmtTokens(inTok), "prompt tokens")}
        ${statCard("输出", fmtTokens(outTok), "completion tokens")}
        ${statCard("缓存命中", fmtTokens(cacheTok), "cache read")}
        ${statCard("消息 / 工具", `${u?.totalMessages ?? 0} / ${u?.toolCalls ?? 0}`, `用户 ${u?.userMessages ?? 0} · 助手 ${u?.assistantMessages ?? 0}`)}
      </div>
      <p style="margin:14px 2px 0;font-size:12px;color:var(--text-mute)">
        花销由模型价格估算，包含本次会话的所有消息（含压缩、工具内调用）。
      </p>`,
  });
}
function statCard(title, value, sub, hero = false) {
  return `<div class="stat-card ${hero ? "hero" : ""}">
    <div class="sc-title">${esc(title)}</div>
    <div class="sc-value">${esc(value)}</div>
    <div class="sc-sub">${esc(sub)}</div>
  </div>`;
}

/* =========================================================================
   Misc actions
   ========================================================================= */
function revealPath(p) {
  if (!p) return;
  api("POST", "/api/fs/reveal", { path: p }).catch((e) => toast(e.message, "err"));
}

async function renameTask(taskId = S.activeTaskId, projectId = S.activeProjectId) {
  const t = (S.tasks[projectId] || []).find((x) => x.id === taskId);
  openModal({
    title: "重命名任务",
    bodyHtml: `<div class="field">
        <label>任务名称</label>
        <input class="input" id="rName" value="${esc(t?.title || "")}" placeholder="给这个任务起个名字" />
        <div class="hint">留空则恢复用第一条消息作为标题</div>
      </div>`,
    footHtml: `<button class="btn" data-act="close-modal">取消</button><button class="btn btn-primary" id="rOk">保存</button>`,
    onMount({ overlay, close }) {
      const save = async () => {
        const name = overlay.querySelector("#rName").value.trim();
        close();
        try {
          await api("POST", `/api/tasks/${taskId}/name`, { name });
          await loadTasks(projectId, { silent: true });
          renderAll();
        } catch (err) {
          toast(err.message, "err");
        }
      };
      overlay.querySelector("#rOk").onclick = save;
      overlay.querySelector("#rName").addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
      });
    },
  });
}

async function deleteTask(taskId, projectId) {
  const t = (S.tasks[projectId] || []).find((x) => x.id === taskId);
  const yes = await confirmDialog(
    "删除任务",
    `确定删除「${t?.title || "新任务"}」吗？\n会话文件会被移动到 data/trash 目录（可恢复）。`,
    { okText: "删除" }
  );
  if (!yes) return;
  try {
    await api("DELETE", `/api/tasks/${taskId}`);
    if (S.activeTaskId === taskId) {
      S.activeTaskId = null;
      closeStream();
    }
    await loadTasks(projectId, { silent: true });
    renderAll();
    toast("任务已删除", "ok");
  } catch (err) {
    toast(err.message, "err");
  }
}

async function togglePin(taskId, projectId, pinned) {
  try {
    await api("POST", `/api/tasks/${taskId}/pin`, { pinned });
    await loadTasks(projectId, { silent: true });
    renderAll();
  } catch (err) {
    toast(err.message, "err");
  }
}

async function deleteProject(projectId) {
  const p = S.projects.find((x) => x.id === projectId);
  const yes = await confirmDialog(
    "删除项目",
    `确定删除项目「${p?.name}」吗？\n只会从 Pi Studio 中移除记录，磁盘上的文件夹和会话文件都会保留。`,
    { okText: "删除" }
  );
  if (!yes) return;
  try {
    await api("DELETE", `/api/projects/${projectId}`);
    if (S.activeProjectId === projectId) {
      S.activeProjectId = null;
      S.activeTaskId = null;
      closeStream();
    }
    await loadProjects();
    renderAll();
    toast("项目已删除", "ok");
  } catch (err) {
    toast(err.message, "err");
  }
}

async function exportTask() {
  if (!S.activeTaskId) return;
  try {
    const r = await api("POST", `/api/tasks/${S.activeTaskId}/export`, {});
    toast("已导出 HTML", "ok");
    revealPath(r.path);
  } catch (err) {
    toast(err.message, "err", 6000);
  }
}

/* ------------------------------- menus ---------------------------------- */
function showCtxMenu(x, y, items) {
  const menu = $("#ctxMenu");
  menu.hidden = false;
  menu.innerHTML = items
    .map((it) =>
      it.sep
        ? `<div class="ctx-sep"></div>`
        : `<div class="ctx-item ${it.danger ? "danger" : ""}" data-k="${esc(it.k)}">
            ${it.icon ? pinIcon(it.icon) : ""}<span>${esc(it.label)}</span>${it.hint ? `<span class="k">${esc(it.hint)}</span>` : ""}
          </div>`
    )
    .join("");
  const w = 210;
  menu.style.left = `${Math.min(x, window.innerWidth - w - 10)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - menu.offsetHeight - 10)}px`;
  const close = () => (menu.hidden = true);
  menu.onclick = (e) => {
    const row = e.target.closest("[data-k]");
    if (!row) return;
    close();
    const it = items.find((i) => i.k === row.dataset.k);
    it?.run?.();
  };
  setTimeout(() => document.addEventListener("click", close, { once: true }), 0);
}

function projectMenu(projectId, x, y) {
  const p = S.projects.find((x) => x.id === projectId);
  showCtxMenu(x, y, [
    { k: "new", label: "新建任务", icon: "plus", run: () => newTask(projectId) },
    { k: "folder", label: "打开文件夹", icon: "folder", run: () => revealPath(p?.path) },
    { k: "settings", label: "项目设置", icon: "settings", run: () => openProjectModal(p) },
    { k: "refresh", label: "刷新任务列表", icon: "refresh", run: () => loadTasks(projectId) },
    { sep: true },
    { k: "del", label: "删除项目", icon: "trash", danger: true, run: () => deleteProject(projectId) },
  ]);
}

function taskMenu(taskId, projectId, x, y) {
  const t = (S.tasks[projectId] || []).find((x) => x.id === taskId);
  showCtxMenu(x, y, [
    { k: "open", label: "打开", icon: "chat", run: () => openTask(projectId, taskId) },
    { k: "rename", label: "重命名", icon: "pencil", run: () => renameTask(taskId, projectId) },
    { k: "pin", label: t?.pinned ? "取消置顶" : "置顶", icon: "pin", run: () => togglePin(taskId, projectId, !t?.pinned) },
    { k: "export", label: "导出 HTML", icon: "download", run: () => (S.activeTaskId === taskId ? exportTask() : openTask(projectId, taskId).then(exportTask)) },
    { sep: true },
    { k: "del", label: "删除任务", icon: "trash", danger: true, run: () => deleteTask(taskId, projectId) },
  ]);
}

/* =========================================================================
   Global events
   ========================================================================= */
function renderAll() {
  renderSidebar();
  renderTopbar();
  renderStage();
  updateComposerState();
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;
  const id = t.dataset.id;
  const rect = t.getBoundingClientRect();
  switch (act) {
    case "open-project": {
      if (e.target.closest(".mini-btn")) return;
      await openProject(id);
      break;
    }
    case "open-task": {
      if (e.target.closest(".mini-btn")) return;
      e.stopPropagation();
      await openTask(t.dataset.project, id);
      break;
    }
    case "new-task":
      e.stopPropagation();
      await newTask(id);
      break;
    case "new-project":
      openProjectModal();
      break;
    case "project-menu":
      e.stopPropagation();
      projectMenu(id, rect.right - 200, rect.bottom + 4);
      break;
    case "task-menu":
      e.stopPropagation();
      taskMenu(id, t.dataset.project, rect.right - 200, rect.bottom + 4);
      break;
    case "toggle-tool": {
      const card = t.closest(".tool");
      if (!card) break;
      const open = !card.classList.contains("open");
      card.classList.toggle("open", open);
      break;
    }
    case "copy-code": {
      const cb = t.closest(".codeblock");
      const code = cb?.querySelector("pre code")?.textContent || "";
      await copyText(code);
      t.classList.add("done");
      t.innerHTML = `${pinIcon("check")}已复制`;
      setTimeout(() => {
        t.classList.remove("done");
        t.innerHTML = `${pinIcon("copy")}复制`;
      }, 1600);
      break;
    }
    case "copy-msg": {
      const m = S.messages[Number(t.dataset.idx)];
      await copyText(contentToText(m?.content));
      toast("已复制", "ok", 1400);
      break;
    }
    case "rm-attach": {
      S.attachments.splice(Number(t.dataset.idx), 1);
      renderAttachments();
      break;
    }
    case "pick-model":
      openModelPicker();
      break;
    case "pick-thinking":
      openThinkingPicker();
      break;
    case "show-stats":
      showStats();
      break;
    case "reveal":
      revealPath(t.dataset.path);
      break;
    case "rename-task":
      renameTask();
      break;
    case "workspace":
      revealPath(S.boot?.workspaceRoot);
      break;
    default:
      break;
  }
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (mod && e.shiftKey && key === "f") {
    e.preventDefault();
    openSearch();
  } else if (mod && !e.shiftKey && key === "f") {
    if (S.activeTaskId) {
      e.preventDefault();
      openFind();
    }
  } else if (mod && key === "k") {
    e.preventDefault();
    openPalette();
  } else if (mod && key === "b") {
    e.preventDefault();
    $("#app").classList.toggle("collapsed");
  } else if (mod && key === "n") {
    e.preventDefault();
    if (S.activeProjectId) newTask(S.activeProjectId);
  } else if (mod && e.shiftKey && key === "l") {
    e.preventDefault();
    toggleTheme();
  }

  if (e.key === "Escape") {
    const findBar = $("#findBar");
    const overlays = $$(".overlay");
    if (overlays.length) overlays[overlays.length - 1].remove();
    else if (findBar && !findBar.hidden) closeFind();
    else if (!S.status.streaming && $("#input") === document.activeElement) $("#input").blur();
  }
});

$("#collapseBtn").addEventListener("click", () => $("#app").classList.add("collapsed"));
$("#expandBtn").addEventListener("click", () => $("#app").classList.toggle("mobile-open", !$("#app").classList.contains("mobile-open")));
$("#brandBtn").addEventListener("click", () => {
  S.activeProjectId = null;
  S.activeTaskId = null;
  closeStream();
  renderAll();
});
$("#newProjectBtn").addEventListener("click", () => openProjectModal());
$("#themeBtn").addEventListener("click", openAppearanceModal);
$("#searchBtn").addEventListener("click", () => openSearch());

// 对话内查找栏
$("#findInput").addEventListener("input", (e) => runFind(e.target.value));
$("#findInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    findStep(e.shiftKey ? -1 : 1);
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeFind();
  }
});
$("#findNext").addEventListener("click", () => findStep(1));
$("#findPrev").addEventListener("click", () => findStep(-1));
$("#findClose").addEventListener("click", closeFind);
$("#paletteBtn").addEventListener("click", openPalette);
$("#workspaceBtn").addEventListener("click", () => revealPath(S.boot?.workspaceRoot));

// 点击 SPA 内链接用系统浏览器打开
document.addEventListener("auxclick", (e) => {
  const a = e.target.closest("a[href^='http']");
  if (a) e.preventDefault();
});

/* =========================================================================
   Init
   ========================================================================= */
async function init() {
  // 演示模式下先装上假后端（接管 fetch / EventSource），界面代码完全不用改
  if (DEMO_WANTED && !window.PiStudioDemo) {
    try {
      await import("./demo.js");
    } catch (err) {
      console.warn("演示数据加载失败，回退到真实后端", err);
    }
  }
  applyTheme(currentTheme(), currentAccent());
  initSidebarResize();
  buildComposer();
  try {
    await loadProjects();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;color:#e9ecff">
      <h2>无法连接到 Pi Studio 服务</h2><pre>${esc(err.message)}</pre></div>`;
    return;
  }

  // 预取模型列表（后台）
  api("GET", "/api/models")
    .then((d) => (S.models = d))
    .catch(() => {});

  // 恢复上次的位置
  const lastProject = S.boot.lastProjectId;
  if (lastProject && S.projects.some((p) => p.id === lastProject)) {
    S.activeProjectId = lastProject;
    S.expanded[lastProject] = true;
    await loadTasks(lastProject, { silent: true });
    const lastTask = S.boot.lastTaskId;
    const tasks = S.tasks[lastProject] || [];
    if (lastTask && tasks.some((t) => t.id === lastTask)) {
      await openTask(lastProject, lastTask);
    } else {
      renderAll();
    }
  } else if (S.projects.length) {
    await openProject(S.projects[0].id);
  } else {
    renderAll();
  }

  renderAttachments();
}

init();
