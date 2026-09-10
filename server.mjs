#!/usr/bin/env node
/**
 * Pi Studio — a friendly local web UI for the pi coding agent.
 *
 * 零依赖：只用 Node 内置模块。
 * 通过 `pi --mode rpc` 子进程与 agent 通信，用 SSE 把事件推给浏览器。
 *
 *   node server.mjs [--port 4317] [--no-open] [--host 127.0.0.1]
 */

import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = __dirname;
const DATA_DIR = path.join(APP_DIR, "data");
const TRASH_DIR = path.join(DATA_DIR, "trash");
const PUBLIC_DIR = path.join(APP_DIR, "docs");

const HOME = os.homedir();
const AGENT_DIR = path.join(HOME, ".pi", "agent");
const SESSIONS_DIR = path.join(AGENT_DIR, "sessions");
const SETTINGS_FILE = path.join(AGENT_DIR, "settings.json");
const STUDIO_FILE = path.join(DATA_DIR, "studio.json");
const LOG_FILE = path.join(DATA_DIR, "server.log");
const INSTANCE_FILE = path.join(DATA_DIR, "server.json");

const DEFAULT_WORKSPACE = path.join(HOME, "PiWorkspace");
const MAX_LIVE_TASKS = 3;

const argv = process.argv.slice(2);
function argValue(name, fallback) {
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  return fallback;
}
const OPEN_BROWSER = !argv.includes("--no-open");
const HOST = argValue("--host", "127.0.0.1");
const PORT_START = Number(argValue("--port", process.env.PI_STUDIO_PORT || 4317));

// Locate the pi CLI entry point.
function findPiCli() {
  const candidates = [];
  const appData = process.env.APPDATA || path.join(HOME, "AppData", "Roaming");
  const pkg = path.join(appData, "npm", "node_modules", "@earendil-works", "pi-coding-agent");
  candidates.push(path.join(pkg, "dist", "bundle", "cli.js"));
  candidates.push(path.join(pkg, "dist", "cli.js"));
  // Local install next to the app (for people who npm i in the folder)
  candidates.push(path.join(APP_DIR, "node_modules", "@earendil-works", "pi-coding-agent", "dist", "bundle", "cli.js"));
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return null;
}
const PI_CLI = findPiCli();

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

const log = (...a) => {
  console.log(...a);
  writeLog("INFO", a);
};
const warn = (...a) => {
  console.warn(...a);
  writeLog("WARN", a);
};

// --- server.log（服务在后台运行，出问题时靠它排查） ----------------------
let logStream = null;
function initLogFile() {
  try {
    ensureDirSync(DATA_DIR);
    // 简单轮转：超过 1MB 就备份一份
    try {
      const st = fs.statSync(LOG_FILE);
      if (st.size > 1024 * 1024) fs.renameSync(LOG_FILE, LOG_FILE + ".1");
    } catch {}
    logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
  } catch {
    logStream = null;
  }
}
function writeLog(level, args) {
  if (!logStream) return;
  const list = Array.isArray(args) ? args : [args];
  const text = list
    .map((a) => {
      if (typeof a === "string") return a;
      if (a instanceof Error) return a.stack || a.message;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
  try {
    logStream.write(`[${new Date().toISOString()}] ${level} ${text}\n`);
  } catch {}
}

const nowIso = () => new Date().toISOString();

function ensureDirSync(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
}

function normPath(p) {
  if (!p) return p;
  let out = p.trim();
  if (out.startsWith("~")) out = path.join(HOME, out.slice(1));
  // Normalize separators to the platform's, then resolve.
  try {
    return path.resolve(out);
  } catch {
    return out;
  }
}

function samePath(a, b) {
  if (!a || !b) return false;
  const na = path.resolve(a).replace(/[\\/]+$/, "");
  const nb = path.resolve(b).replace(/[\\/]+$/, "");
  return process.platform === "win32" ? na.toLowerCase() === nb.toLowerCase() : na === nb;
}

/** pi's session folder slug:  C:\Users\me -> --C--Users-me-- */
function cwdSlug(cwd) {
  const flat = path.resolve(cwd).replace(/[\\/:]/g, "-");
  return `--${flat}--`;
}

/** Extract plain text from a message content field. */
function contentText(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");
  }
  return "";
}

function truncate(s, n) {
  if (!s) return "";
  s = String(s).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ---------------------------------------------------------------------------
// Persisted studio state (projects + task metadata)
// ---------------------------------------------------------------------------

const EMPTY_STORE = {
  config: { workspaceRoot: DEFAULT_WORKSPACE, lastProjectId: null, lastTaskId: null },
  projects: [],
  tasks: {},
};
let store = structuredClone(EMPTY_STORE);
let saveTimer = null;

function loadStore() {
  ensureDirSync(DATA_DIR);
  try {
    if (fs.existsSync(STUDIO_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STUDIO_FILE, "utf8"));
      store = { ...structuredClone(EMPTY_STORE), ...raw };
      store.config = { ...EMPTY_STORE.config, ...(raw.config || {}) };
      store.projects = Array.isArray(raw.projects) ? raw.projects : [];
      store.tasks = raw.tasks && typeof raw.tasks === "object" ? raw.tasks : {};
    }
  } catch (err) {
    warn("读取 studio.json 失败，使用默认配置：", err.message);
  }
  if (!store.config.workspaceRoot) store.config.workspaceRoot = DEFAULT_WORKSPACE;
}

function saveStore() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      ensureDirSync(DATA_DIR);
      const tmp = STUDIO_FILE + ".tmp";
      await fsp.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
      await fsp.rename(tmp, STUDIO_FILE);
    } catch (err) {
      warn("保存 studio.json 失败：", err.message);
    }
  }, 120);
}

async function flushStore() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    ensureDirSync(DATA_DIR);
    await fsp.writeFile(STUDIO_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch {}
}

// ---------------------------------------------------------------------------
// Session scanning (read pi's session files off disk)
// ---------------------------------------------------------------------------

async function readFirstLine(file) {
  let fh;
  try {
    fh = await fsp.open(file, "r");
    const buf = Buffer.alloc(8192);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    const text = buf.subarray(0, bytesRead).toString("utf8");
    const nl = text.indexOf("\n");
    return nl >= 0 ? text.slice(0, nl) : text;
  } catch {
    return "";
  } finally {
    try {
      await fh?.close();
    } catch {}
  }
}

async function listSessionFilesUnder(dir) {
  const out = [];
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    // 直接位于该目录下的会话文件（dir 是项目会话目录）
    if (e.isFile() && e.name.endsWith(".jsonl")) {
      out.push(path.join(dir, e.name));
      continue;
    }
    // 或者位于其子目录中（dir 是 sessions 根目录）
    if (e.isDirectory()) {
      const sub = path.join(dir, e.name);
      let inner;
      try {
        inner = await fsp.readdir(sub, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const f of inner) {
        if (f.isFile() && f.name.endsWith(".jsonl")) out.push(path.join(sub, f.name));
      }
    }
  }
  return out;
}

/** Cheap header read: returns { id, cwd, timestamp } or null. */
async function peekSessionHeader(file) {
  const line = await readFirstLine(file);
  if (!line) return null;
  try {
    const obj = JSON.parse(line);
    if (obj && obj.type === "session") return obj;
  } catch {}
  return null;
}

/** Full parse for list display: title, counts, last activity. */
async function summarizeSession(file, header) {
  const info = {
    id: header?.id || path.basename(file),
    sessionFile: file,
    cwd: header?.cwd || "",
    createdAt: header?.timestamp || null,
    lastActivity: header?.timestamp || null,
    name: null,
    title: null,
    preview: null,
    userMessages: 0,
    assistantMessages: 0,
    toolCalls: 0,
    model: null,
    cost: 0,
  };
  let text;
  try {
    text = await fsp.readFile(file, "utf8");
  } catch {
    return info;
  }
  let firstUser = null;
  let lastAssistant = null;
  for (const line of text.split("\n")) {
    if (!line) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e.timestamp) info.lastActivity = e.timestamp;
    switch (e.type) {
      case "session_info":
        if (e.name) info.name = e.name;
        break;
      case "model_change":
        info.model = e.provider && e.modelId ? `${e.provider}/${e.modelId}` : info.model;
        break;
      case "message": {
        const m = e.message || {};
        if (m.role === "user") {
          info.userMessages++;
          if (!firstUser) firstUser = contentText(m.content);
        } else if (m.role === "assistant") {
          info.assistantMessages++;
          if (m.model) info.model = info.model || `${m.provider}/${m.model}`;
          if (m.usage?.cost?.total) info.cost += m.usage.cost.total;
          for (const b of Array.isArray(m.content) ? m.content : []) {
            if (b && b.type === "toolCall") info.toolCalls++;
          }
          const t = contentText(m.content);
          if (t) lastAssistant = t;
        }
        break;
      }
      default:
        break;
    }
  }
  info.title = info.name || (firstUser ? truncate(firstUser, 60) : null);
  info.preview = lastAssistant ? truncate(lastAssistant, 120) : null;
  return info;
}

async function listSessionsForProject(project) {
  const slugDir = path.join(SESSIONS_DIR, cwdSlug(project.path));
  const files = await listSessionFilesUnder(slugDir);
  const results = [];
  for (const file of files) {
    const header = await peekSessionHeader(file);
    if (!header) continue;
    // Guard against slug collisions / stale paths.
    if (header.cwd && !samePath(header.cwd, project.path)) continue;
    const s = await summarizeSession(file, header);
    const meta = store.tasks[s.id] || null;
    s.name = meta?.name || s.name;
    s.title = s.name || s.title || "未命名任务";
    s.pinned = !!meta?.pinned;
    results.push(s);
  }
  // 任务刚创建、还没有任何消息时不会落盘，用元数据补上。
  const seen = new Set(results.map((r) => r.id));
  for (const [id, meta] of Object.entries(store.tasks)) {
    if (meta.projectId !== project.id || seen.has(id)) continue;
    results.push({
      id,
      sessionFile: meta.sessionFile || null,
      cwd: project.path,
      createdAt: meta.createdAt || nowIso(),
      lastActivity: meta.lastOpenedAt || meta.createdAt || nowIso(),
      name: meta.name || null,
      title: meta.name || "新任务",
      preview: null,
      userMessages: 0,
      assistantMessages: 0,
      toolCalls: 0,
      model: null,
      cost: 0,
      pinned: !!meta.pinned,
      pending: !liveTasks.has(id),
      status: liveTasks.get(id)?.status || "idle",
    });
  }
  // 标记运行中的任务
  for (const r of results) {
    const live = liveTasks.get(r.id);
    r.status = live && live.proc && live.proc.exitCode === null ? live.status : "idle";
  }
  results.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return String(b.lastActivity || "").localeCompare(String(a.lastActivity || ""));
  });
  return results;
}

async function findBySessionIdAnywhere(sessionId) {
  const files = await listSessionFilesUnder(SESSIONS_DIR);
  for (const file of files) {
    if (file.includes(sessionId)) return file;
  }
  // Filename contains "<timestamp>_<uuid>.jsonl"; match by header for safety.
  for (const file of files) {
    const header = await peekSessionHeader(file);
    if (header?.id === sessionId) return file;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 全文搜索（跨所有历史会话）
// ---------------------------------------------------------------------------

function findProjectByPath(p) {
  if (!p) return null;
  return store.projects.find((pr) => samePath(pr.path, p)) || null;
}

function makeSnippet(text, ql, pad = 42) {
  const idx = text.toLowerCase().indexOf(ql);
  if (idx < 0) return null;
  const start = Math.max(0, idx - pad);
  const end = Math.min(text.length, idx + ql.length + pad * 2);
  return {
    pre: (start > 0 ? "…" : "") + text.slice(start, idx),
    hit: text.slice(idx, idx + ql.length),
    post: text.slice(idx + ql.length, end) + (end < text.length ? "…" : ""),
  };
}

async function searchSessions(rawQuery, opts = {}) {
  const q = String(rawQuery || "").trim();
  const roleFilter = opts.role || "all"; // all | user | assistant
  const maxSessions = Number(opts.maxSessions) || 40;
  const maxHitsPerSession = Number(opts.maxHitsPerSession) || 5;
  const budgetMs = Number(opts.budgetMs) || 5000;
  const started = Date.now();
  const out = { results: [], truncated: false, scanned: 0, elapsedMs: 0, totalHits: 0 };
  if (q.length < 1) return out;
  const ql = q.toLowerCase();

  const files = await listSessionFilesUnder(SESSIONS_DIR);
  const entries = [];
  for (const f of files) {
    try {
      const st = await fsp.stat(f);
      entries.push({ file: f, mtime: st.mtimeMs });
    } catch {}
  }
  entries.sort((a, b) => b.mtime - a.mtime);

  for (const item of entries) {
    if (out.results.length >= maxSessions) {
      out.truncated = true;
      break;
    }
    if (Date.now() - started > budgetMs) {
      out.truncated = true;
      break;
    }
    out.scanned++;

    let text;
    try {
      text = await fsp.readFile(item.file, "utf8");
    } catch {
      continue;
    }

    let header = null;
    let sessionName = null;
    let title = null;
    const hits = [];
    for (const line of text.split("\n")) {
      if (!line) continue;
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        continue;
      }
      if (e.type === "session") {
        header = e;
        continue;
      }
      if (e.type === "session_info" && e.name) {
        sessionName = e.name;
        continue;
      }
      if (e.type !== "message") continue;
      const m = e.message || {};
      if (m.role !== "user" && m.role !== "assistant") continue;
      if (roleFilter !== "all" && m.role !== roleFilter) continue;
      const body = contentText(m.content);
      if (!body || !body.toLowerCase().includes(ql)) continue;
      if (!title && m.role === "user") title = truncate(body, 60);
      const snip = makeSnippet(body, ql);
      if (!snip) continue;
      hits.push({ role: m.role, timestamp: m.timestamp || null, ...snip });
      if (hits.length >= maxHitsPerSession) break;
    }

    if (!hits.length) continue;
    out.totalHits += hits.length;

    const project = findProjectByPath(header?.cwd);
    out.results.push({
      sessionId: header?.id || path.basename(item.file, ".jsonl"),
      sessionFile: item.file,
      cwd: header?.cwd || "",
      projectId: project?.id || null,
      projectName: project?.name || (header?.cwd ? path.basename(header.cwd) : "未知项目"),
      projectEmoji: project?.emoji || "📁",
      projectColor: project?.color || "#8b7dff",
      title: store.tasks[header?.id]?.name || sessionName || title || "未命名任务",
      mtime: item.mtime,
      hits,
    });
  }

  out.elapsedMs = Date.now() - started;
  return out;
}

// ---------------------------------------------------------------------------
// RPC process wrapper
// ---------------------------------------------------------------------------

let taskSeq = 0;

class RpcTask {
  constructor({ sessionId, projectId, cwd, sessionFile, name }) {
    this.key = `t${++taskSeq}`;
    this.id = sessionId || null;
    this.projectId = projectId;
    this.cwd = cwd;
    this.sessionFile = sessionFile || null;
    this.name = name || null;
    this.proc = null;
    this.buffer = "";
    this.pending = new Map(); // reqId -> {resolve, reject, timer}
    this.subscribers = new Set();
    this.listeners = new Set(); // internal listeners (manager)
    this.status = "idle"; // idle | starting | ready | exited | error
    this.lastError = null;
    this.lastUsed = Date.now();
    this.streaming = false;
    this.state = null;
    this.startPromise = null;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(payload) {
    for (const fn of this.listeners) {
      try {
        fn(payload);
      } catch {}
    }
    this.broadcast(payload);
  }

  broadcast(payload) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of this.subscribers) {
      try {
        res.write(data);
      } catch {}
    }
  }

  subscribe(res) {
    this.subscribers.add(res);
    return () => this.subscribers.delete(res);
  }

  send(cmd, timeoutMs = 45_000) {
    return new Promise((resolve, reject) => {
      if (!this.proc || this.proc.killed || this.proc.exitCode !== null) {
        return reject(new Error("pi 进程未运行"));
      }
      const id = cmd.id || `r${randomUUID().slice(0, 8)}`;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`命令超时：${cmd.type}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.proc.stdin.write(JSON.stringify({ ...cmd, id }) + "\n");
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  start() {
    if (this.startPromise) return this.startPromise;
    if (!PI_CLI) throw new Error("找不到 pi CLI，请确认已全局安装 @earendil-works/pi-coding-agent");
    this.status = "starting";
    this.emit({ type: "proc", status: "starting" });

    const args = [PI_CLI, "--mode", "rpc"];
    if (this.id && this.sessionFile) {
      args.push("--session", this.sessionFile);
    } else if (this.id) {
      args.push("--session-id", this.id);
    }
    if (this.name) args.push("--name", this.name);

    const child = spawn(process.execPath, args, {
      cwd: this.cwd,
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc = child;

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => this.onStdout(chunk));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      const t = String(chunk).trim();
      if (t && !/^Warning: No project session found/.test(t)) warn(`pi[${this.id || this.key}]`, t.slice(0, 500));
    });

    child.on("error", (err) => {
      this.status = "error";
      this.lastError = err.message;
      this.emit({ type: "proc", status: "error", message: err.message });
      this.rejectAllPending(err);
    });
    child.on("close", (code) => {
      this.status = "exited";
      this.streaming = false;
      this.emit({ type: "proc", status: "exited", code });
      this.rejectAllPending(new Error(`pi 进程退出（code ${code}）`));
    });

    this.startPromise = (async () => {
      const res = await this.send({ type: "get_state" }, 90_000);
      const data = res?.data || {};
      if (!this.id && data.sessionId) this.id = data.sessionId;
      if (data.sessionFile) this.sessionFile = data.sessionFile;
      this.state = data;
      this.status = "ready";
      this.emit({ type: "proc", status: "ready", sessionId: this.id, sessionFile: this.sessionFile });
      return data;
    })();
    this.startPromise.catch((err) => {
      this.status = "error";
      this.lastError = err.message;
      this.emit({ type: "proc", status: "error", message: err.message });
    });
    return this.startPromise;
  }

  onStdout(chunk) {
    this.buffer += chunk;
    while (true) {
      const nl = this.buffer.indexOf("\n");
      if (nl === -1) break;
      let line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.trim()) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      this.handleMessage(msg);
    }
  }

  handleMessage(msg) {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "response") {
      const p = this.pending.get(msg.id);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(msg.id);
        p.resolve(msg);
        return;
      }
      // Unsolicited response (shouldn't happen) — still forward.
      this.emit({ type: "pi", event: msg });
      return;
    }
    if (msg.type === "extension_ui_request") {
      if (["notify", "setStatus", "setWidget", "setTitle", "set_editor_text"].includes(msg.method)) {
        this.emit({ type: "ui_fire", request: msg });
      } else {
        this.pendingUi = this.pendingUi || new Map();
        this.pendingUi.set(msg.id, true);
        this.emit({ type: "ui_request", request: msg });
      }
      return;
    }
    // Regular agent event.
    if (msg.type === "agent_start") this.streaming = true;
    if (msg.type === "agent_settled" || msg.type === "agent_end") {
      // agent_end can be followed by retry, so only clear on settled.
      if (msg.type === "agent_settled") this.streaming = false;
    }
    this.streaming = msg.type === "agent_start" ? true : this.streaming;
    this.emit({ type: "pi", event: msg });
  }

  rejectAllPending(err) {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
  }

  async uiResponse(payload) {
    if (!this.proc || this.proc.exitCode !== null) return;
    try {
      this.proc.stdin.write(JSON.stringify({ type: "extension_ui_response", ...payload }) + "\n");
    } catch {}
  }

  stop() {
    if (!this.proc) return;
    try {
      this.proc.stdin.end();
    } catch {}
    const child = this.proc;
    setTimeout(() => {
      try {
        if (child.exitCode === null) child.kill();
      } catch {}
    }, 1200);
  }
}

// ---------------------------------------------------------------------------
// Task manager
// ---------------------------------------------------------------------------

const liveTasks = new Map(); // sessionId -> RpcTask

function findProject(id) {
  return store.projects.find((p) => p.id === id) || null;
}

function projectForTaskId(sessionId) {
  const meta = store.tasks[sessionId];
  if (meta?.projectId) return findProject(meta.projectId);
  for (const t of liveTasks.values()) {
    if (t.id === sessionId) return findProject(t.projectId);
  }
  return null;
}

async function startTask({ sessionId, projectId, cwd, sessionFile, name }) {
  const key = sessionId || randomUUID();
  let task = liveTasks.get(key);
  if (task && task.proc && task.proc.exitCode === null) {
    task.lastUsed = Date.now();
    return task;
  }
  await evictIfNeeded();
  task = new RpcTask({ sessionId, projectId, cwd, sessionFile, name });
  liveTasks.set(key, task);
  await task.start();
  if (task.id && task.id !== key) {
    liveTasks.delete(key);
    liveTasks.set(task.id, task);
  }
  // Persist discovered session file for later resumes.
  if (task.id) {
    const meta = store.tasks[task.id] || { id: task.id, projectId, createdAt: nowIso() };
    meta.projectId = projectId;
    if (!meta.createdAt) meta.createdAt = nowIso();
    if (name) meta.name = name;
    if (task.sessionFile) meta.sessionFile = task.sessionFile;
    store.tasks[task.id] = meta;
    saveStore();
  }
  return task;
}

async function getOrStartTask(sessionId, project) {
  let task = liveTasks.get(sessionId);
  if (task && task.proc && task.proc.exitCode === null) {
    task.lastUsed = Date.now();
    return task;
  }
  const meta = store.tasks[sessionId] || {};
  let sessionFile = meta.sessionFile || null;
  if (!sessionFile) sessionFile = await findBySessionIdAnywhere(sessionId);
  return startTask({
    sessionId,
    projectId: project.id,
    cwd: project.path,
    sessionFile,
    name: meta.name || null,
  });
}

async function evictIfNeeded() {
  const running = [...liveTasks.values()].filter((t) => t.proc && t.proc.exitCode === null);
  if (running.length < MAX_LIVE_TASKS) return;
  const candidates = running.filter((t) => !t.streaming).sort((a, b) => a.lastUsed - b.lastUsed);
  while (running.length >= MAX_LIVE_TASKS && candidates.length) {
    const victim = candidates.shift();
    log("释放不活跃任务进程：", victim.id);
    victim.stop();
    liveTasks.delete(victim.id);
    running.splice(running.indexOf(victim), 1);
  }
}

// ---------------------------------------------------------------------------
// Global (session-less) queries: models
// ---------------------------------------------------------------------------

let modelsCache = { at: 0, data: null };

async function withTempProcess(cwd, fn) {
  const task = new RpcTask({ sessionId: null, projectId: null, cwd, sessionFile: null, name: null });
  try {
    await task.start();
    return await fn(task);
  } finally {
    task.stop();
  }
}

async function getModels(force = false) {
  const fresh = modelsCache.data && Date.now() - modelsCache.at < 10 * 60 * 1000;
  if (fresh && !force) return modelsCache.data;

  // Prefer reusing a live process to avoid a cold start.
  let live = [...liveTasks.values()].find((t) => t.proc && t.proc.exitCode === null && t.status === "ready");
  const fetchFrom = async (task) => {
    const [modelsRes, stateRes] = await Promise.all([
      task.send({ type: "get_available_models" }),
      task.send({ type: "get_state" }),
    ]);
    const models = modelsRes?.data?.models || [];
    const state = stateRes?.data || {};
    return { models, current: state.model || null, thinkingLevel: state.thinkingLevel || null };
  };
  let data;
  if (live) {
    data = await fetchFrom(live);
  } else {
    data = await withTempProcess(HOME, fetchFrom);
  }
  let defaults = { provider: null, model: null };
  try {
    const s = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    defaults = { provider: s.defaultProvider || null, model: s.defaultModel || null };
  } catch {}
  const payload = { ...data, defaults };
  modelsCache = { at: Date.now(), data: payload };
  return payload;
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 32 * 1024 * 1024) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }
      data += c;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error("JSON 解析失败"));
      }
    });
    req.on("error", reject);
  });
}

async function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === "/") rel = "/index.html";
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^([/\\])+/, ""));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const data = await fsp.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
  }
}

function sseHandler(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.write(`: connected\n\n`);
  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {}
  }, 20_000);
  return () => clearInterval(heartbeat);
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]
  const method = req.method || "GET";
  const body = method === "GET" || method === "HEAD" ? {} : await readBody(req);
  const seg = parts.slice(1);

  // --- bootstrap -----------------------------------------------------------
  if (method === "GET" && seg[0] === "bootstrap" && seg.length === 1) {
    return sendJson(res, 200, {
      ok: true,
      app: "pi-studio",
      version: "1.0.0",
      platform: process.platform,
      piCli: PI_CLI,
      node: process.version,
      home: HOME,
      workspaceRoot: store.config.workspaceRoot,
      lastProjectId: store.config.lastProjectId,
      lastTaskId: store.config.lastTaskId,
      projects: store.projects.map((p) => ({ ...p, taskCount: undefined })),
      liveTasks: [...liveTasks.keys()],
    });
  }

  // --- config --------------------------------------------------------------
  if (seg[0] === "config" && method === "POST") {
    if (typeof body.workspaceRoot === "string") store.config.workspaceRoot = normPath(body.workspaceRoot);
    if ("lastProjectId" in body) store.config.lastProjectId = body.lastProjectId;
    if ("lastTaskId" in body) store.config.lastTaskId = body.lastTaskId;
    saveStore();
    return sendJson(res, 200, { ok: true, config: store.config });
  }

  // --- projects ------------------------------------------------------------
  if (seg[0] === "projects") {
    // GET /api/projects
    if (method === "GET" && seg.length === 1) {
      return sendJson(res, 200, { ok: true, projects: store.projects });
    }
    // POST /api/projects
    if (method === "POST" && seg.length === 1) {
      const name = String(body.name || "").trim() || "新项目";
      let targetPath = body.path ? normPath(body.path) : path.join(store.config.workspaceRoot || DEFAULT_WORKSPACE, name);
      if (body.createFolder !== false) {
        try {
          await fsp.mkdir(targetPath, { recursive: true });
        } catch (err) {
          return sendJson(res, 400, { ok: false, error: `无法创建文件夹：${err.message}` });
        }
      } else if (!fs.existsSync(targetPath)) {
        return sendJson(res, 400, { ok: false, error: "文件夹不存在" });
      }
      const project = {
        id: randomUUID(),
        name,
        emoji: body.emoji || pickEmoji(store.projects.length),
        color: body.color || pickColor(store.projects.length),
        path: targetPath,
        createdAt: nowIso(),
      };
      store.projects.push(project);
      store.config.lastProjectId = project.id;
      saveStore();
      return sendJson(res, 200, { ok: true, project });
    }
    // /api/projects/:id ...
    const project = findProject(seg[1]);
    if (!project) return sendJson(res, 404, { ok: false, error: "项目不存在" });

    if (method === "PATCH" && seg.length === 2) {
      if (body.name != null) project.name = String(body.name);
      if (body.emoji != null) project.emoji = String(body.emoji);
      if (body.color != null) project.color = String(body.color);
      if (body.path != null) project.path = normPath(String(body.path));
      saveStore();
      return sendJson(res, 200, { ok: true, project });
    }
    if (method === "DELETE" && seg.length === 2) {
      store.projects = store.projects.filter((p) => p.id !== project.id);
      for (const [id, meta] of Object.entries(store.tasks)) {
        if (meta.projectId === project.id) delete store.tasks[id];
      }
      if (store.config.lastProjectId === project.id) store.config.lastProjectId = null;
      saveStore();
      return sendJson(res, 200, { ok: true });
    }
    // GET /api/projects/:id/tasks
    if (method === "GET" && seg[2] === "tasks" && seg.length === 3) {
      const tasks = await listSessionsForProject(project);
      return sendJson(res, 200, { ok: true, tasks, live: [...liveTasks.keys()] });
    }
    // POST /api/projects/:id/tasks  -> create a new task
    if (method === "POST" && seg[2] === "tasks" && seg.length === 3) {
      if (!fs.existsSync(project.path)) {
        return sendJson(res, 400, { ok: false, error: `项目文件夹不存在：${project.path}` });
      }
      const sessionId = randomUUID();
      const name = body.name ? String(body.name) : null;
      store.tasks[sessionId] = {
        id: sessionId,
        projectId: project.id,
        name,
        pinned: false,
        createdAt: nowIso(),
        lastOpenedAt: nowIso(),
      };
      saveStore();
      const task = await startTask({ sessionId, projectId: project.id, cwd: project.path, sessionFile: null, name });
      store.config.lastProjectId = project.id;
      store.config.lastTaskId = sessionId;
      saveStore();
      return sendJson(res, 200, { ok: true, task: publicTask(task) });
    }
  }

  // --- tasks ---------------------------------------------------------------
  if (seg[0] === "tasks") {
    const sessionId = seg[1];
    const project = projectForTaskId(sessionId);

    // POST /api/tasks/:id/open
    if (method === "POST" && seg[2] === "open") {
      const proj = project || findProject(body.projectId);
      if (!proj) return sendJson(res, 404, { ok: false, error: "找不到任务所属项目" });
      const task = await getOrStartTask(sessionId, proj);
      store.tasks[sessionId] = {
        ...(store.tasks[sessionId] || { id: sessionId, projectId: proj.id, createdAt: nowIso() }),
        lastOpenedAt: nowIso(),
      };
      if (task.sessionFile) store.tasks[sessionId].sessionFile = task.sessionFile;
      store.config.lastProjectId = proj.id;
      store.config.lastTaskId = sessionId;
      saveStore();
      const messagesRes = await task.send({ type: "get_messages" }, 60_000);
      let commands = [];
      try {
        const c = await task.send({ type: "get_commands" }, 30_000);
        commands = c?.data?.commands || [];
      } catch {}
      let thinkingLevels = [];
      try {
        const t = await task.send({ type: "get_available_thinking_levels" }, 20_000);
        thinkingLevels = t?.data?.levels || [];
      } catch {}
      let stats = null;
      try {
        const s = await task.send({ type: "get_session_stats" }, 20_000);
        stats = s?.data || null;
      } catch {}
      return sendJson(res, 200, {
        ok: true,
        task: publicTask(task),
        state: task.state || null,
        messages: messagesRes?.data?.messages || [],
        commands,
        thinkingLevels,
        stats,
      });
    }

    if (!project && !store.tasks[sessionId] && !liveTasks.get(sessionId)) {
      return sendJson(res, 404, { ok: false, error: "任务不存在" });
    }

    // GET /api/tasks/:id/stream  (SSE)
    if (method === "GET" && seg[2] === "stream") {
      if (!project) return sendJson(res, 404, { ok: false, error: "找不到任务所属项目" });
      const cleanup = sseHandler(res);
      let task = liveTasks.get(sessionId);
      const attach = (t) => {
        const off = t.subscribe(res);
        res.write(`data: ${JSON.stringify({ type: "hello", sessionId, status: t.status })}\n\n`);
        return off;
      };
      let off = task ? attach(task) : () => {};
      // If the task isn't live yet, spin it up in the background.
      if (!task) {
        getOrStartTask(sessionId, project)
          .then((t) => {
            if (off) off();
            off = attach(t);
            res.write(`data: ${JSON.stringify({ type: "processor", task: publicTask(t) })}\n\n`);
          })
          .catch((err) => {
            res.write(`data: ${JSON.stringify({ type: "proc", status: "error", message: err.message })}\n\n`);
          });
      }
      req.on("close", () => {
        off();
        cleanup();
      });
      return;
    }

    // POST /api/tasks/:id/prompt
    if (method === "POST" && seg[2] === "prompt") {
      const proj = project || findProject(body.projectId);
      if (!proj) return sendJson(res, 404, { ok: false, error: "找不到任务所属项目" });
      const task = await getOrStartTask(sessionId, proj);
      const cmd = { type: "prompt", message: String(body.message ?? "") };
      if (body.streamingBehavior) cmd.streamingBehavior = body.streamingBehavior;
      if (Array.isArray(body.images) && body.images.length) cmd.images = body.images;
      try {
        const r = await task.send(cmd, 120_000);
        if (r.success === false) return sendJson(res, 400, { ok: false, error: r.error });
        return sendJson(res, 200, { ok: true });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    const task = liveTasks.get(sessionId);

    const simpleCommands = {
      steer: "steer",
      follow_up: "follow_up",
      abort: "abort",
      compact: "compact",
      clear_queue: "clear_queue",
      cycle_model: "cycle_model",
      cycle_thinking_level: "cycle_thinking_level",
    };
    if (method === "POST" && seg.length === 3 && simpleCommands[seg[2]]) {
      if (!task) return sendJson(res, 400, { ok: false, error: "任务未运行" });
      const cmd = { type: simpleCommands[seg[2]] };
      if (seg[2] === "steer" || seg[2] === "follow_up") cmd.message = String(body.message ?? "");
      if (seg[2] === "compact" && body.customInstructions) cmd.customInstructions = String(body.customInstructions);
      const r = await task.send(cmd, seg[2] === "abort" ? 30_000 : 10 * 60_000);
      return sendJson(res, r.success === false ? 400 : 200, { ok: r.success !== false, data: r.data, error: r.error });
    }

    // POST /api/tasks/:id/model  { provider, modelId }
    if (method === "POST" && seg[2] === "model") {
      if (!task) return sendJson(res, 400, { ok: false, error: "任务未运行" });
      const r = await task.send({ type: "set_model", provider: body.provider, modelId: body.modelId }, 30_000);
      return sendJson(res, r.success === false ? 400 : 200, { ok: r.success !== false, data: r.data, error: r.error });
    }
    // POST /api/tasks/:id/thinking { level }
    if (method === "POST" && seg[2] === "thinking") {
      if (!task) return sendJson(res, 400, { ok: false, error: "任务未运行" });
      const r = await task.send({ type: "set_thinking_level", level: body.level }, 20_000);
      return sendJson(res, r.success === false ? 400 : 200, { ok: r.success !== false, data: r.data, error: r.error });
    }
    // POST /api/tasks/:id/name { name }
    if (method === "POST" && seg[2] === "name") {
      const name = String(body.name ?? "").trim();
      const meta = store.tasks[sessionId] || { id: sessionId, projectId: project?.id, createdAt: nowIso() };
      meta.name = name || null;
      store.tasks[sessionId] = meta;
      saveStore();
      if (task) {
        try {
          await task.send({ type: "set_session_name", name }, 20_000);
        } catch {}
      }
      return sendJson(res, 200, { ok: true, name });
    }
    // POST /api/tasks/:id/ui-response
    if (method === "POST" && seg[2] === "ui-response") {
      if (!task) return sendJson(res, 400, { ok: false, error: "任务未运行" });
      await task.uiResponse(body);
      return sendJson(res, 200, { ok: true });
    }
    // GET /api/tasks/:id/thinking-levels
    if (method === "GET" && seg[2] === "thinking-levels") {
      if (!task) return sendJson(res, 200, { ok: true, levels: [] });
      const r = await task.send({ type: "get_available_thinking_levels" }, 20_000);
      return sendJson(res, 200, { ok: true, levels: r?.data?.levels || [] });
    }
    // GET /api/tasks/:id/stats
    if (method === "GET" && seg[2] === "stats") {
      if (!task) return sendJson(res, 400, { ok: false, error: "任务未运行" });
      const r = await task.send({ type: "get_session_stats" }, 30_000);
      return sendJson(res, r.success === false ? 400 : 200, { ok: r.success !== false, data: r.data, error: r.error });
    }
    // GET /api/tasks/:id/commands
    if (method === "GET" && seg[2] === "commands") {
      if (!task) return sendJson(res, 200, { ok: true, commands: [] });
      const r = await task.send({ type: "get_commands" }, 30_000);
      return sendJson(res, 200, { ok: true, commands: r?.data?.commands || [] });
    }
    // POST /api/tasks/:id/export
    if (method === "POST" && seg[2] === "export") {
      if (!task) return sendJson(res, 400, { ok: false, error: "任务未运行" });
      const outPath = body.outputPath || path.join(DATA_DIR, "exports", `${sessionId}.html`);
      ensureDirSync(path.dirname(outPath));
      const r = await task.send({ type: "export_html", outputPath: outPath }, 60_000);
      return sendJson(res, r.success === false ? 400 : 200, { ok: r.success !== false, path: outPath, error: r.error });
    }
    // POST /api/tasks/:id/close
    if (method === "POST" && seg[2] === "close") {
      if (task) {
        task.stop();
        liveTasks.delete(sessionId);
      }
      return sendJson(res, 200, { ok: true });
    }
    // POST /api/tasks/:id/pin
    if (method === "POST" && seg[2] === "pin") {
      const meta = store.tasks[sessionId] || { id: sessionId, projectId: project?.id, createdAt: nowIso() };
      meta.pinned = !!body.pinned;
      store.tasks[sessionId] = meta;
      saveStore();
      return sendJson(res, 200, { ok: true, pinned: meta.pinned });
    }
    // DELETE /api/tasks/:id
    if (method === "DELETE" && seg.length === 2) {
      const meta = store.tasks[sessionId];
      let file = meta?.sessionFile || null;
      if (!file) file = await findBySessionIdAnywhere(sessionId);
      if (task) {
        task.stop();
        liveTasks.delete(sessionId);
      }
      if (file && fs.existsSync(file)) {
        ensureDirSync(TRASH_DIR);
        try {
          await fsp.rename(file, path.join(TRASH_DIR, `${Date.now()}_${path.basename(file)}`));
        } catch {}
      }
      delete store.tasks[sessionId];
      if (store.config.lastTaskId === sessionId) store.config.lastTaskId = null;
      saveStore();
      return sendJson(res, 200, { ok: true });
    }
  }

  // --- search --------------------------------------------------------------
  if (seg[0] === "search" && method === "GET") {
    const q = url.searchParams.get("q") || "";
    const found = await searchSessions(q, {
      role: url.searchParams.get("role") || "all",
      maxSessions: Number(url.searchParams.get("maxSessions")) || 40,
    });
    return sendJson(res, 200, { ok: true, query: q, ...found });
  }

  // --- models --------------------------------------------------------------
  if (seg[0] === "models" && method === "GET") {
    try {
      const data = await getModels(url.searchParams.get("force") === "1");
      return sendJson(res, 200, { ok: true, ...data });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // --- filesystem browsing -------------------------------------------------
  if (seg[0] === "fs" && seg[1] === "list" && method === "GET") {
    const raw = url.searchParams.get("path");
    if (!raw || raw === "roots") {
      const roots = [];
      if (process.platform === "win32") {
        for (let i = 67; i <= 90; i++) {
          const d = String.fromCharCode(i) + ":\\";
          try {
            if (fs.existsSync(d)) roots.push({ name: d, path: d, isDir: true });
          } catch {}
        }
      } else {
        roots.push({ name: "/", path: "/", isDir: true });
      }
      roots.push({ name: "🏠 主目录", path: HOME, isDir: true });
      roots.push({ name: "📁 PiWorkspace", path: store.config.workspaceRoot, isDir: true });
      return sendJson(res, 200, { ok: true, path: null, parent: null, entries: roots });
    }
    const dir = normPath(raw);
    let entries = [];
    try {
      const dirents = await fsp.readdir(dir, { withFileTypes: true });
      for (const d of dirents) {
        if (d.name.startsWith("$") || d.name === "System Volume Information") continue;
        if (d.isDirectory()) entries.push({ name: d.name, path: path.join(dir, d.name), isDir: true });
      }
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: `无法读取目录：${err.message}` });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, "zh"));
    const parent = path.dirname(dir);
    return sendJson(res, 200, { ok: true, path: dir, parent: parent === dir ? null : parent, entries });
  }
  if (seg[0] === "fs" && seg[1] === "mkdir" && method === "POST") {
    const parent = normPath(body.parent);
    const name = String(body.name || "").trim();
    if (!name) return sendJson(res, 400, { ok: false, error: "名称不能为空" });
    const target = path.join(parent, name);
    try {
      await fsp.mkdir(target, { recursive: true });
      return sendJson(res, 200, { ok: true, path: target });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }
  if (seg[0] === "fs" && seg[1] === "exists" && method === "POST") {
    return sendJson(res, 200, { ok: true, exists: fs.existsSync(normPath(body.path)) });
  }
  if (seg[0] === "fs" && seg[1] === "reveal" && method === "POST") {
    const target = normPath(body.path);
    try {
      if (process.platform === "win32") {
        if (fs.existsSync(target) && fs.statSync(target).isFile()) {
          spawn("explorer.exe", ["/select,", target], { detached: true, stdio: "ignore", windowsHide: true }).unref();
        } else {
          spawn("explorer.exe", [target], { detached: true, stdio: "ignore", windowsHide: true }).unref();
        }
      } else if (process.platform === "darwin") {
        spawn("open", [target], { detached: true, stdio: "ignore" }).unref();
      } else {
        spawn("xdg-open", [target], { detached: true, stdio: "ignore" }).unref();
      }
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  return sendJson(res, 404, { ok: false, error: `未知接口 ${method} ${url.pathname}` });
}

function publicTask(task) {
  return {
    id: task.id,
    projectId: task.projectId,
    cwd: task.cwd,
    sessionFile: task.sessionFile,
    status: task.status,
    name: task.name,
    lastError: task.lastError,
  };
}

function pickEmoji(i) {
  const list = ["🌿", "🚀", "🎨", "📚", "🧩", "🌙", "🔥", "🪐", "🍀", "💡", "🧪", "🎧", "🐳", "🌸", "⚡", "🗂️"];
  return list[i % list.length];
}
function pickColor(i) {
  const list = ["#8b7dff", "#43e0ff", "#ff7ac8", "#5eead4", "#fbbf24", "#a78bfa", "#34d399", "#fb7185"];
  return list[i % list.length];
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    warn("请求处理失败：", err?.stack || err);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: err?.message || String(err) });
    else res.end();
  }
});

// ---------------------------------------------------------------------------
// Single-instance check + start
// ---------------------------------------------------------------------------

function openBrowser(url) {
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch (err) {
    warn("无法自动打开浏览器：", err.message);
  }
}

async function isOurServer(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: HOST, port, path: "/api/bootstrap", timeout: 800 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data).app === "pi-studio");
        } catch {
          resolve(false);
        }
      });
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function listen(port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, HOST);
  });
}

async function main() {
  initLogFile();
  writeLog("INFO", `---- Pi Studio starting (node ${process.version}, ${process.platform}) ----`);
  ensureDirSync(DATA_DIR);
  ensureDirSync(PUBLIC_DIR);
  loadStore();

  if (!PI_CLI) {
    warn("⚠️  未找到 pi CLI。请先运行：npm i -g @earendil-works/pi-coding-agent");
  }

  for (let port = PORT_START; port < PORT_START + 20; port++) {
    if (await isOurServer(port)) {
      const url = `http://${HOST}:${port}/`;
      log(`Pi Studio 已在运行：${url}`);
      if (OPEN_BROWSER) openBrowser(url);
      process.exit(0);
    }
    try {
      await listen(port);
      const url = `http://${HOST}:${port}/`;
      writeInstanceFile(port, url);
      log(`✨ Pi Studio 已启动：${url}`);
      log(`   工作区根目录：${store.config.workspaceRoot}`);
      if (OPEN_BROWSER) openBrowser(url);
      return;
    } catch (err) {
      if (err.code !== "EADDRINUSE") {
        writeLog("ERROR", ["listen failed on port " + port, err]);
        throw err;
      }
      writeLog("INFO", `port ${port} busy, trying next`);
    }
  }
  throw new Error(`端口 ${PORT_START}-${PORT_START + 19} 都被占用`);
}

async function shutdown() {
  log("正在关闭…");
  removeInstanceFile();
  for (const t of liveTasks.values()) t.stop();
  await flushStore();
  setTimeout(() => process.exit(0), 300);
}

/** 写下当前实例信息，方便 stop 脚本精确找到这个进程 */
function writeInstanceFile(port, url) {
  try {
    ensureDirSync(DATA_DIR);
    fs.writeFileSync(
      INSTANCE_FILE,
      JSON.stringify({ pid: process.pid, port, host: HOST, url, startedAt: new Date().toISOString() }, null, 2)
    );
  } catch {}
}
function removeInstanceFile() {
  try {
    fs.unlinkSync(INSTANCE_FILE);
  } catch {}
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (err) => {
  warn("未捕获异常：", err?.stack || err);
  writeLog("FATAL", ["uncaughtException", err]);
});
process.on("unhandledRejection", (err) => {
  writeLog("FATAL", ["unhandledRejection", err]);
});

main().catch((err) => {
  console.error("启动失败：", err?.message || err);
  writeLog("FATAL", ["startup failed", err]);
  process.exit(1);
});
