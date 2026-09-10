/* ==========================================================================
   Pi Studio — 在线演示版（GitHub Pages 用）
   --------------------------------------------------------------------------
   这个文件只在演示模式下加载（*.github.io 或 ?demo）。
   它做两件事：
     1. 接管 window.fetch 里所有 /api/* 请求，返回预置数据
     2. 接管 window.EventSource，用脚本回放"流式输出 + 工具调用"
   因此 docs/app.js（真正的界面代码）完全不需要改动。
   ========================================================================== */
(function () {
  if (window.__PI_STUDIO_DEMO__) return;
  window.__PI_STUDIO_DEMO__ = true;

  /* ------------------------------------------------------------------ 时间 */
  const NOW = Date.now();
  const ago = (min) => new Date(NOW - min * 60000).toISOString();
  const agoMs = (min) => NOW - min * 60000;

  /* ------------------------------------------------------------------ 数据 */
  const PROJECTS = [
    {
      id: "p-demo",
      name: "Pi Studio 演示",
      emoji: "🌿",
      color: "#5eead4",
      path: "~/PiWorkspace/pi-studio-demo",
      createdAt: ago(120),
    },
    {
      id: "p-site",
      name: "personal-site",
      emoji: "🚀",
      color: "#8b7dff",
      path: "~/code/personal-site",
      createdAt: ago(2880),
    },
    {
      id: "p-data",
      name: "data-analysis",
      emoji: "📊",
      color: "#fbbf24",
      path: "~/code/data-analysis",
      createdAt: ago(10080),
    },
  ];

  const TASKS = {
    "p-demo": [
      {
        id: "t1",
        title: "环境检查与第一个文件",
        preview: "三件事都已完成 ✅ 第 1 步：目录是空的；第 2 步：写入 hello.txt；第 3 步：给出代码块示例。",
        lastActivity: ago(6),
        createdAt: ago(9),
        userMessages: 1,
        toolCalls: 3,
        model: "deepseek/deepseek-v4-flash",
        status: "idle",
        pinned: true,
      },
      {
        id: "t2",
        title: "给设置页加暗色模式",
        preview: "已抽出 CSS 变量并加了 prefers-color-scheme 兜底，切换按钮记住用户选择。",
        lastActivity: ago(95),
        createdAt: ago(140),
        userMessages: 3,
        toolCalls: 6,
        model: "anthropic/claude-sonnet-4-5",
        status: "idle",
        pinned: false,
      },
      {
        id: "t3",
        title: "修复登录后跳转丢失参数",
        preview: "问题出在 redirect 时用了 location.href 而不是 search + hash，已修复并补了测试。",
        lastActivity: ago(1500),
        createdAt: ago(1700),
        userMessages: 2,
        toolCalls: 4,
        model: "deepseek/deepseek-v4-flash",
        status: "idle",
        pinned: false,
      },
    ],
    "p-site": [
      {
        id: "t4",
        title: "用 Tailwind 重做首页",
        preview: "首页已重写：响应式栅格 + 深色模式，Lighthouse 性能分从 78 提到 96。",
        lastActivity: ago(300),
        createdAt: ago(420),
        userMessages: 4,
        toolCalls: 9,
        model: "anthropic/claude-sonnet-4-5",
        status: "idle",
        pinned: false,
      },
      {
        id: "t5",
        title: "接入 RSS 输出",
        preview: "已加 /rss.xml 路由，用 feed 包生成，部署后需要提交给搜索引擎。",
        lastActivity: ago(2600),
        createdAt: ago(2700),
        userMessages: 2,
        toolCalls: 3,
        model: "deepseek/deepseek-v4-flash",
        status: "idle",
        pinned: false,
      },
    ],
    "p-data": [
      {
        id: "t6",
        title: "分析 2026 上半年销售 CSV",
        preview: "共 12,480 行，缺失值 1.2%；Q2 环比增长 18%，华东区贡献最大。",
        lastActivity: ago(700),
        createdAt: ago(900),
        userMessages: 3,
        toolCalls: 7,
        model: "deepseek/deepseek-v4-flash",
        status: "idle",
        pinned: false,
      },
      {
        id: "t7",
        title: "画月度趋势图",
        preview: "已用 matplotlib 出图并保存到 charts/trend.png，配色改成了公司主色。",
        lastActivity: ago(650),
        createdAt: ago(800),
        userMessages: 2,
        toolCalls: 5,
        model: "deepseek/deepseek-v4-flash",
        status: "idle",
        pinned: false,
      },
    ],
  };

  /* 已录制的真实对话（已清洗掉个人路径与无关噪音） */
  const MESSAGES = {
    t1: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "请按顺序做三件事：\n" +
              "1. 列出当前目录里有什么\n" +
              "2. 创建文件 `hello.txt`，内容为 `你好，Pi Studio！`\n" +
              "3. 用 **Markdown** 给我一份三行总结，包含一个列表和一段代码块示例",
          },
        ],
        timestamp: agoMs(9),
      },
      {
        role: "assistant",
        content: [
          { type: "text", text: "好的，我按顺序来。先看一下目录。" },
          { type: "toolCall", id: "call_a1", name: "bash", arguments: { command: "ls -la" } },
        ],
        provider: "deepseek",
        model: "deepseek-v4-flash",
        usage: { input: 1216, output: 47, cacheRead: 4736, totalTokens: 5999, cost: { total: 0.000196 } },
        stopReason: "toolUse",
        timestamp: agoMs(9) + 900,
      },
      {
        role: "toolResult",
        toolCallId: "call_a1",
        toolName: "bash",
        content: [
          {
            type: "text",
            text: "total 8\ndrwxr-xr-x  4 you  staff  128 Sep 10 20:10 .\ndrwxr-xr-x  3 you  staff   96 Sep 10 20:09 ..\n-rw-r--r--  1 you  staff  142 Sep 10 20:10 package.json\n",
          },
        ],
        isError: false,
        timestamp: agoMs(9) + 1900,
      },
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "目录里只有一个 package.json，是个干净的项目。先按用户要求创建 hello.txt，写完再确认一次。",
          },
          {
            type: "toolCall",
            id: "call_a2",
            name: "write",
            arguments: { path: "hello.txt", content: "你好，Pi Studio！" },
          },
        ],
        provider: "deepseek",
        model: "deepseek-v4-flash",
        usage: { input: 312, output: 84, cacheRead: 5888, totalTokens: 6284, cost: { total: 0.0000837 } },
        stopReason: "toolUse",
        timestamp: agoMs(9) + 2100,
      },
      {
        role: "toolResult",
        toolCallId: "call_a2",
        toolName: "write",
        content: [{ type: "text", text: "Successfully wrote to hello.txt" }],
        isError: false,
        timestamp: agoMs(9) + 2600,
      },
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "文件写好了，用 cat 验证一下内容是否正确。" },
          {
            type: "toolCall",
            id: "call_a3",
            name: "bash",
            arguments: { command: "ls -la && cat hello.txt" },
          },
        ],
        provider: "deepseek",
        model: "deepseek-v4-flash",
        usage: { input: 158, output: 75, cacheRead: 6144, totalTokens: 6377, cost: { total: 0.0000603 } },
        stopReason: "toolUse",
        timestamp: agoMs(9) + 2800,
      },
      {
        role: "toolResult",
        toolCallId: "call_a3",
        toolName: "bash",
        content: [
          {
            type: "text",
            text: "total 12\n-rw-r--r--  1 you  staff   21 Sep 10 20:10 hello.txt\n-rw-r--r--  1 you  staff  142 Sep 10 20:10 package.json\n\n你好，Pi Studio！",
          },
        ],
        isError: false,
        timestamp: agoMs(9) + 3600,
      },
      {
        role: "assistant",
        content: [
          {
            type: "text",
            text:
              "三件事都已完成 ✅\n\n" +
              "## 三行总结\n\n" +
              "- **第 1 步**：`ls -la` 显示目录里只有一个 `package.json`，是个干净的项目。\n" +
              "- **第 2 步**：已创建 `hello.txt`，写入 `你好，Pi Studio！`（UTF-8，21 字节），`cat` 复查无误。\n" +
              "- **第 3 步**：下面是等价的 shell 写法，可直接复现本次操作。\n\n" +
              "```bash\n" +
              "ls -la                      # 列出当前目录\n" +
              "echo \"你好，Pi Studio！\" > hello.txt   # 创建文件\n" +
              "cat hello.txt               # 验证内容\n" +
              "```\n\n" +
              "> 提示：`write` 工具会直接落盘，`bash` 用来做验证类操作。",
          },
        ],
        provider: "deepseek",
        model: "deepseek-v4-flash",
        usage: { input: 341, output: 198, cacheRead: 6272, totalTokens: 6811, cost: { total: 0.0001207 } },
        stopReason: "stop",
        timestamp: agoMs(6),
      },
    ],
    t2: [
      {
        role: "user",
        content: [{ type: "text", text: "设置页想加一个暗色模式，跟随系统默认，但允许用户手动覆盖。" }],
        timestamp: agoMs(140),
      },
      {
        role: "assistant",
        content: [
          {
            type: "text",
            text:
              "先看一下现在设置页的结构和样式是怎么写的。",
          },
          { type: "toolCall", id: "call_b1", name: "read", arguments: { path: "src/pages/Settings.tsx" } },
        ],
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        usage: { input: 4820, output: 96, cacheRead: 12000, totalTokens: 16916, cost: { total: 0.0182 } },
        stopReason: "toolUse",
        timestamp: agoMs(140) + 1200,
      },
      {
        role: "toolResult",
        toolCallId: "call_b1",
        toolName: "read",
        content: [{ type: "text", text: "import { useState } from 'react';\n\nexport function SettingsPage() {\n  const [tab, setTab] = useState('general');\n  // ... 约 180 行\n}" }],
        isError: false,
        timestamp: agoMs(140) + 2000,
      },
      {
        role: "assistant",
        content: [
          {
            type: "text",
            text:
              "现在的颜色都是硬编码的，直接加暗色模式会很痛苦。我建议先把颜色抽成 CSS 变量，这样切换主题只需要换一组变量值。\n\n" +
              "改动计划：\n\n" +
              "1. `styles/tokens.css` —— 定义 `:root` 与 `[data-theme=\"dark\"]` 两套变量\n" +
              "2. `useTheme()` hook —— 优先级：用户选择 > 系统偏好，并写入 `localStorage`\n" +
              "3. 设置页加一个三选一分段控件：跟随系统 / 浅色 / 深色\n\n" +
              "```ts\n" +
              "const theme = userChoice ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');\n" +
              "document.documentElement.dataset.theme = theme;\n" +
              "```",
          },
        ],
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        usage: { input: 980, output: 420, cacheRead: 16000, totalTokens: 17400, cost: { total: 0.0203 } },
        stopReason: "stop",
        timestamp: agoMs(95),
      },
    ],
    t3: [
      {
        role: "user",
        content: [{ type: "text", text: "用户登录成功后被跳回首页，但原来想去的页面参数丢了。" }],
        timestamp: agoMs(1700),
      },
      {
        role: "assistant",
        content: [
          { type: "text", text: "大概率是重定向时只带了 pathname，把 query 和 hash 丢了。我找一下跳转的地方。" },
          { type: "toolCall", id: "call_c1", name: "bash", arguments: { command: "rg -n \"location.href|navigate\\(\" src/auth" } },
        ],
        provider: "deepseek",
        model: "deepseek-v4-flash",
        usage: { input: 2100, output: 88, cacheRead: 3000, totalTokens: 5188, cost: { total: 0.00021 } },
        stopReason: "toolUse",
        timestamp: agoMs(1700) + 1100,
      },
      {
        role: "toolResult",
        toolCallId: "call_c1",
        toolName: "bash",
        content: [{ type: "text", text: "src/auth/redirect.ts:14:  window.location.href = '/login';\nsrc/auth/redirect.ts:31:  window.location.href = returnTo;" }],
        isError: false,
        timestamp: agoMs(1700) + 1900,
      },
      {
        role: "assistant",
        content: [
          {
            type: "text",
            text:
              "找到了。第 14 行跳登录页时没有把当前地址带上，所以回来就只剩首页了。修一下：\n\n" +
              "```ts\n" +
              "- window.location.href = '/login';\n" +
              "+ const returnTo = location.pathname + location.search + location.hash;\n" +
              "+ window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;\n" +
              "```\n\n" +
              "同时建议对 `returnTo` 做白名单校验，只允许站内相对路径，避免开放重定向漏洞。",
          },
        ],
        provider: "deepseek",
        model: "deepseek-v4-flash",
        usage: { input: 520, output: 260, cacheRead: 5200, totalTokens: 5980, cost: { total: 0.00015 } },
        stopReason: "stop",
        timestamp: agoMs(1500),
      },
    ],
  };

  const STATS = {
    t1: {
      sessionId: "t1",
      userMessages: 1,
      assistantMessages: 4,
      toolCalls: 3,
      toolResults: 3,
      totalMessages: 8,
      tokens: { input: 2027, output: 404, cacheRead: 23040, cacheWrite: 0, total: 25471 },
      cost: 0.0004614,
      contextUsage: { tokens: 6811, contextWindow: 1000000, percent: 0.68 },
    },
    t2: {
      sessionId: "t2",
      userMessages: 1,
      assistantMessages: 2,
      toolCalls: 1,
      toolResults: 1,
      totalMessages: 4,
      tokens: { input: 5800, output: 516, cacheRead: 28000, cacheWrite: 0, total: 34316 },
      cost: 0.0385,
      contextUsage: { tokens: 17400, contextWindow: 200000, percent: 8.7 },
    },
    t3: {
      sessionId: "t3",
      userMessages: 1,
      assistantMessages: 2,
      toolCalls: 1,
      toolResults: 1,
      totalMessages: 4,
      tokens: { input: 2620, output: 348, cacheRead: 8200, cacheWrite: 0, total: 11168 },
      cost: 0.00036,
      contextUsage: { tokens: 5980, contextWindow: 1000000, percent: 0.6 },
    },
  };

  const MODELS = [
    ["deepseek", "deepseek-v4-flash", "DeepSeek V4 Flash", 1000000, true],
    ["deepseek", "deepseek-v4-pro", "DeepSeek V4 Pro", 1000000, true],
    ["anthropic", "claude-sonnet-4-5", "Claude Sonnet 4.5", 200000, true],
    ["anthropic", "claude-opus-4-5", "Claude Opus 4.5", 200000, true],
    ["openai", "gpt-5.2", "GPT-5.2", 400000, true],
    ["openai", "gpt-5.2-mini", "GPT-5.2 mini", 400000, false],
    ["google", "gemini-3-pro", "Gemini 3 Pro", 1000000, true],
    ["openrouter", "moonshotai/kimi-k2.6", "MoonshotAI: Kimi K2.6", 262144, true],
  ].map(([provider, id, name, contextWindow, reasoning]) => ({
    provider,
    id,
    name,
    api: "demo",
    baseUrl: "",
    reasoning,
    input: ["text", "image"],
    contextWindow,
    maxTokens: 16384,
    cost: { input: 1, output: 2, cacheRead: 0.2, cacheWrite: 0 },
  }));

  const COMMANDS = [
    { name: "init", description: "扫描项目并生成 AGENTS.md 约定文件", source: "prompt" },
    { name: "review", description: "审查当前改动，指出风险与遗漏", source: "prompt" },
    { name: "commit", description: "根据改动生成规范的提交信息并提交", source: "prompt" },
    { name: "fix-tests", description: "跑测试并修复失败的用例", source: "prompt" },
    { name: "explain", description: "逐段解释选中的代码", source: "prompt" },
    { name: "session-name", description: "给当前会话命名", source: "extension" },
    { name: "skill:brave-search", description: "联网搜索最新资料", source: "skill" },
    { name: "skill:pdf", description: "读取并总结 PDF 文档", source: "skill" },
  ];

  /* --------------------------------------------------------------- 可变状态 */
  const state = {
    projects: PROJECTS.map((p) => ({ ...p })),
    tasks: JSON.parse(JSON.stringify(TASKS)),
    messages: JSON.parse(JSON.stringify(MESSAGES)),
    stats: JSON.parse(JSON.stringify(STATS)),
    names: {},
    models: MODELS.map((m) => ({ ...m })),
    currentModel: MODELS[0],
    thinkingLevel: "high",
    thinkingLevels: ["off", "low", "high", "max"],
    lastProjectId: "p-demo",
    lastTaskId: "t1",
    seq: 0,
  };

  /* ------------------------------------------------------------ 事件总线 */
  const streams = new Map(); // taskId -> Set<fn>
  let activeRun = null;

  function subscribe(taskId, fn) {
    if (!streams.has(taskId)) streams.set(taskId, new Set());
    streams.get(taskId).add(fn);
    return () => streams.get(taskId)?.delete(fn);
  }
  function emit(taskId, payload) {
    const set = streams.get(taskId);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch {}
    }
  }
  const pi = (taskId, event) => emit(taskId, { type: "pi", event });

  /* --------------------------------------------------- 脚本：流式文本分片 */
  function chunkText(text, size = 3) {
    const out = [];
    let i = 0;
    while (i < text.length) {
      const n = size + Math.floor(Math.random() * size);
      out.push(text.slice(i, i + n));
      i += n;
    }
    return out;
  }

  function runScript(promptText) {
    const taskId = state.lastTaskId;
    const timers = [];
    let cancelled = false;
    const t0 = Date.now();

    const push = (delay, fn) => {
      timers.push(
        setTimeout(() => {
          if (!cancelled) fn();
        }, delay)
      );
    };

    /* 根据输入挑选一个剧本 */
    const q = promptText.toLowerCase();
    const isTheme = /颜色|主题|配色|theme|color|侧栏|侧边栏|sidebar/.test(q);
    const isBug = /bug|报错|错误|修复|fix|登录|login/.test(q);

    const plan = isTheme ? scriptTheme() : isBug ? scriptFix() : scriptExplore();

    let at = 0;
    const userMsg = {
      role: "user",
      content: [{ type: "text", text: promptText }],
      timestamp: Date.now(),
    };

    // 1. 用户消息回显
    at += 120;
    push(at, () => pi(taskId, { type: "agent_start" }));
    at += 60;
    push(at, () => pi(taskId, { type: "turn_start" }));
    at += 40;
    push(at, () => pi(taskId, { type: "message_start", message: userMsg }));
    at += 30;
    push(at, () => {
      pi(taskId, { type: "message_end", message: userMsg });
      state.messages[taskId].push(userMsg);
    });

    // 2. 逐个回合播放
    plan.forEach((turn) => {
      at += 160;
      push(at, () => pi(taskId, { type: "message_start", message: { role: "assistant", content: [], timestamp: Date.now() } }));

      const content = [];
      let idx = 0;

      // 思考
      if (turn.thinking) {
        const ci = idx++;
        content[ci] = { type: "thinking", thinking: turn.thinking };
        at += 90;
        push(at, () => pi(taskId, { type: "message_update", assistantMessageEvent: { type: "thinking_start", contentIndex: ci } }));
        for (const piece of chunkText(turn.thinking, 6)) {
          at += 22;
          push(at, () =>
            pi(taskId, { type: "message_update", assistantMessageEvent: { type: "thinking_delta", contentIndex: ci, delta: piece } })
          );
        }
        at += 40;
        push(at, () =>
          pi(taskId, {
            type: "message_update",
            assistantMessageEvent: { type: "thinking_end", contentIndex: ci, content: turn.thinking },
          })
        );
      }

      // 正文
      if (turn.text) {
        const ci = idx++;
        content[ci] = { type: "text", text: turn.text };
        at += 70;
        push(at, () => pi(taskId, { type: "message_update", assistantMessageEvent: { type: "text_start", contentIndex: ci } }));
        let acc = "";
        const pieces = chunkText(turn.text, 3);
        pieces.forEach((piece, i) => {
          acc += piece;
          at += 16;
          const usage = {
            input: 1200 + i * 30,
            output: acc.length,
            cacheRead: 4096,
            cacheWrite: 0,
            totalTokens: 1200 + i * 30 + acc.length,
            cost: { total: 0.00002 * i },
          };
          push(at, () =>
            pi(taskId, {
              type: "message_update",
              usage,
              assistantMessageEvent: { type: "text_delta", contentIndex: ci, delta: piece },
            })
          );
        });
        at += 40;
        push(at, () =>
          pi(taskId, { type: "message_update", assistantMessageEvent: { type: "text_end", contentIndex: ci, content: turn.text } })
        );
      }

      // 工具调用
      let tool = null;
      if (turn.tool) {
        const ci = idx++;
        const id = "call_demo_" + (++state.seq);
        tool = { ...turn.tool, id };
        content[ci] = { type: "toolCall", id, name: turn.tool.name, arguments: turn.tool.arguments };
        at += 90;
        push(at, () => pi(taskId, { type: "message_update", assistantMessageEvent: { type: "toolcall_start", contentIndex: ci, id, toolName: turn.tool.name } }));
        at += 60;
        push(at, () =>
          pi(taskId, {
            type: "message_update",
            assistantMessageEvent: { type: "toolcall_end", contentIndex: ci, toolCall: content[ci] },
          })
        );
      }

      // 助手消息结束
      const asst = {
        role: "assistant",
        content: content.filter(Boolean),
        provider: state.currentModel.provider,
        model: state.currentModel.id,
        usage: { input: 1200, output: 160, cacheRead: 4096, totalTokens: 5456, cost: { total: 0.00008 } },
        stopReason: tool ? "toolUse" : "stop",
        timestamp: Date.now(),
      };
      at += 60;
      push(at, () => {
        pi(taskId, { type: "message_end", message: asst });
        state.messages[taskId].push(asst);
      });

      // 工具执行 + 结果
      if (tool) {
        at += 140;
        push(at, () => pi(taskId, { type: "tool_execution_start", toolCallId: tool.id, toolName: tool.name, args: tool.arguments }));
        const out = tool.result || "";
        const pieces = chunkText(out, 40);
        let acc = "";
        pieces.forEach((p) => {
          acc += p;
          at += 90;
          push(at, () =>
            pi(taskId, {
              type: "tool_execution_update",
              toolCallId: tool.id,
              toolName: tool.name,
              args: tool.arguments,
              partialResult: { content: [{ type: "text", text: acc }], details: {} },
            })
          );
        });
        at += 60;
        push(at, () =>
          pi(taskId, {
            type: "tool_execution_end",
            toolCallId: tool.id,
            toolName: tool.name,
            result: { content: [{ type: "text", text: out }], details: {} },
            isError: false,
          })
        );

        const tr = {
          role: "toolResult",
          toolCallId: tool.id,
          toolName: tool.name,
          content: [{ type: "text", text: out }],
          isError: false,
          timestamp: Date.now(),
        };
        at += 50;
        push(at, () => {
          pi(taskId, { type: "message_end", message: tr });
          state.messages[taskId].push(tr);
        });
      }
    });

    // 3. 收尾
    at += 120;
    push(at, () => pi(taskId, { type: "turn_end" }));
    at += 60;
    push(at, () => pi(taskId, { type: "agent_end", willRetry: false }));
    at += 40;
    push(at, () => {
      // 更新统计，让顶栏 token / 花销动起来
      const s = state.stats[taskId] || (state.stats[taskId] = { tokens: {}, contextUsage: {} });
      const addTok = 1800 + Math.floor(Math.random() * 900);
      s.tokens = {
        input: (s.tokens.input || 0) + 1200,
        output: (s.tokens.output || 0) + 420,
        cacheRead: (s.tokens.cacheRead || 0) + 4096,
        cacheWrite: 0,
        total: (s.tokens.total || 0) + addTok,
      };
      s.cost = (s.cost || 0) + 0.00012;
      s.userMessages = (s.userMessages || 0) + 1;
      s.assistantMessages = (s.assistantMessages || 0) + plan.length;
      s.toolCalls = (s.toolCalls || 0) + plan.filter((t) => t.tool).length;
      s.totalMessages = (s.totalMessages || 0) + 1 + plan.length * 2;
      const cu = s.contextUsage || (s.contextUsage = { tokens: 0, contextWindow: state.currentModel.contextWindow, percent: 0 });
      cu.tokens = (cu.tokens || 0) + addTok;
      cu.contextWindow = state.currentModel.contextWindow;
      cu.percent = Math.min(100, (cu.tokens / cu.contextWindow) * 100);

      const task = state.tasks[state.lastProjectId].find((t) => t.id === taskId);
      if (task) {
        task.lastActivity = new Date().toISOString();
        task.userMessages = (task.userMessages || 0) + 1;
      }
      pi(taskId, { type: "agent_settled" });
      activeRun = null;
    });

    return {
      cancel() {
        cancelled = true;
        timers.forEach(clearTimeout);
        activeRun = null;
      },
    };
  }

  /* ------------------------------------------------------------ 三个剧本 */
  function scriptExplore() {
    return [
      {
        thinking:
          "用户想看这个项目的结构。先用 bash 列一下顶层文件，确认技术栈，再决定读哪个文件。注意不要一次读太多，先看目录。",
        text: "我先看一下项目结构，确认技术栈之后再给你结论。",
        tool: {
          name: "bash",
          arguments: { command: "ls -la && cat package.json | head -20" },
          result:
            "total 48\ndrwxr-xr-x  12 you  staff   384 Sep 10 20:10 .\ndrwxr-xr-x   3 you  staff    96 Sep 10 20:09 ..\n-rw-r--r--   1 you  staff   155 Sep 10 20:10 .gitignore\n-rw-r--r--   1 you  staff  1064 Sep 10 20:10 LICENSE\n-rw-r--r--   1 you  staff  3812 Sep 10 20:10 README.md\n-rw-r--r--   1 you  staff   742 Sep 10 20:10 package.json\ndrwxr-xr-x   5 you  staff   160 Sep 10 20:10 src\ndrwxr-xr-x   3 you  staff    96 Sep 10 20:10 test\n\n{\n  \"name\": \"awesome-tool\",\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build\",\n    \"test\": \"vitest run\"\n  }\n}",
        },
      },
      {
        thinking: "是个 Vite + Vitest 的 ESM 项目。再看看 src 的组织方式，就能给出靠谱的建议了。",
        text: "技术栈确认了，再看一层 `src`。",
        tool: {
          name: "bash",
          arguments: { command: "find src test -type f | head -30 && echo '---' && wc -l src/**/*.ts 2>/dev/null | tail -1" },
          result:
            "src/main.ts\nsrc/config.ts\nsrc/core/agent.ts\nsrc/core/session.ts\nsrc/core/tools.ts\nsrc/ui/render.ts\nsrc/ui/theme.ts\nsrc/utils/log.ts\ntest/agent.test.ts\ntest/session.test.ts\n---\n  1284 total",
        },
      },
      {
        text:
          "看完了 👀 这是一个 **Vite + TypeScript(ESM) + Vitest** 的项目，结构挺清晰的。\n\n" +
          "## 结构速览\n\n" +
          "| 目录 | 作用 |\n" +
          "| --- | --- |\n" +
          "| `src/core/` | 核心逻辑：agent 循环、会话、工具注册 |\n" +
          "| `src/ui/` | 渲染与主题 |\n" +
          "| `src/utils/` | 日志等通用工具 |\n" +
          "| `test/` | Vitest 单测（覆盖 core） |\n\n" +
          "## 三点建议\n\n" +
          "1. **`src/core/agent.ts` 有点重** —— `wc -l` 显示 core 合计 1284 行，建议把工具调用调度拆到独立文件。\n" +
          "2. **测试只覆盖了 core** —— `src/ui/` 没有测试，主题切换这类纯函数很容易补。\n" +
          "3. **缺 `AGENTS.md`** —— 加一份能让 AI 下次更快上手，我可以直接生成：\n\n" +
          "```bash\n" +
          "# 生成项目约定文件\n" +
          "pi \"/init\"          # 扫描代码并写出 AGENTS.md\n" +
          "```\n\n" +
          "> 以上 `ls` / `find` 的输出都是**演示数据**，真实版本会真的在你的机器上执行。",
      },
    ];
  }

  function scriptTheme() {
    return [
      {
        thinking: "用户想要更多配色。先确认当前配色是怎么实现的——如果是 CSS 变量，加一套主题就是加一段覆盖。",
        text: "先看一下现在的配色是不是变量驱动的，这决定了加主题的成本。",
        tool: {
          name: "bash",
          arguments: { command: "rg -n -- '--bg|--accent|data-theme|data-accent' src/ui/theme.ts styles/ | head -20" },
          result:
            "styles/tokens.css:4:  --bg: #f5f6fc;\nstyles/tokens.css:5:  --text: #191f3d;\nstyles/tokens.css:22:html[data-theme=\"dark\"] {\nstyles/tokens.css:60:html[data-accent=\"mint\"] {\nstyles/tokens.css:61:  --v: #0f9d76;\nstyles/tokens.css:62:  --grad: linear-gradient(135deg, #22c55e, #14b8a6);\nsrc/ui/theme.ts:12:export function applyTheme(theme, accent) {\n",
        },
      },
      {
        thinking: "好消息：已经全部是 CSS 变量了。那我只需要加一套 data-accent 覆盖块，再加一个颜色选择器入口。",
        text:
          "已经是变量驱动的，加配色很干净 —— 只需要新增一段覆盖块。我给你加一套**浅黄**主题：\n\n" +
          "```css\n" +
          "/* 浅黄：米黄底 + 琥珀渐变 */\n" +
          "html[data-theme=\"light\"][data-accent=\"amber\"] {\n" +
          "  --bg: #fdf9ee;\n" +
          "  --bg-2: #faf1dc;\n" +
          "  --v: #b45309;\n" +
          "  --grad: linear-gradient(135deg, #f59e0b, #fbbf24);\n" +
          "  --bubble-bg: linear-gradient(135deg, rgba(245,158,11,.17), rgba(251,191,36,.12));\n" +
          "}\n" +
          "```\n\n" +
          "然后把 `ACCENTS` 列表里加一项就行：\n\n" +
          "```js\n" +
          "const ACCENTS = [\n" +
          "  { id: 'violet', name: '紫青',   grad: 'linear-gradient(135deg,#7c6cff,#29c3f6)' },\n" +
          "  { id: 'mint',   name: '浅绿',   grad: 'linear-gradient(135deg,#22c55e,#14b8a6)' },\n" +
          "  { id: 'amber',  name: '浅黄',   grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },  // ← 新增\n" +
          "];\n" +
          "```\n\n" +
          "> 这个演示站本身就有 6 套配色 —— 点侧栏顶部的 ☀️ 按钮就能挨个试。",
      },
    ];
  }

  function scriptFix() {
    return [
      {
        thinking: "登录跳转丢参数是老问题了，基本可以断定是重定向时没有携带 query/hash。先定位代码。",
        text: "先定位重定向的代码，确认是不是丢了 query。",
        tool: {
          name: "bash",
          arguments: { command: "rg -n -- 'location.href|redirect|returnTo' src/ | head -20" },
          result:
            "src/auth/guard.ts:8:  if (!user) redirect('/login');\nsrc/auth/guard.ts:19:function redirect(to: string) {\nsrc/auth/guard.ts:20:  window.location.href = to;\nsrc/pages/Login.tsx:26:  navigate('/');  // ← 登录成功后写死回首页\n",
        },
      },
      {
        thinking: "两个问题：guard 跳登录页时没带当前地址；登录成功后写死跳首页。需要引入 returnTo 参数，并做白名单校验防止开放重定向。",
        text:
          "找到了，是**两处**问题叠加：\n\n" +
          "1. `guard.ts:20` —— 跳登录页时没带上「我本来想去哪」\n" +
          "2. `Login.tsx:26` —— 登录成功后写死回首页\n\n" +
          "修法：\n\n" +
          "```ts\n" +
          "// guard.ts —— 带上完整的当前地址（含 query 和 hash）\n" +
          "function redirect(to: string) {\n" +
          "  if (to === '/login') {\n" +
          "    const returnTo = location.pathname + location.search + location.hash;\n" +
          "    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;\n" +
          "    return;\n" +
          "  }\n" +
          "  window.location.href = to;\n" +
          "}\n" +
          "```\n\n" +
          "```ts\n" +
          "// Login.tsx —— 只允许站内相对路径，避免开放重定向漏洞\n" +
          "const raw = new URLSearchParams(location.search).get('returnTo') ?? '/';\n" +
          "const returnTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';\n" +
          "navigate(returnTo, { replace: true });\n" +
          "```\n\n" +
          "⚠️ 注意 `!raw.startsWith('//')` 这个判断 —— 少了它，`//evil.com` 会被当成站内路径，直接变成开放重定向。",
      },
    ];
  }

  /* --------------------------------------------------------- Mock 接口层 */
  function tasksOf(projectId) {
    return (state.tasks[projectId] || []).map((t) => ({ ...t, title: state.names[t.id] || t.title }));
  }

  function findTask(tid) {
    for (const pid of Object.keys(state.tasks)) {
      const t = state.tasks[pid].find((x) => x.id === tid);
      if (t) return { task: t, projectId: pid };
    }
    return null;
  }

  function searchDemo(q, role) {
    const query = (q || "").trim();
    const out = { results: [], truncated: false, scanned: state.projects.length, elapsedMs: 6, totalHits: 0 };
    if (!query) return out;
    const ql = query.toLowerCase();
    const started = Date.now();
    for (const pid of Object.keys(state.tasks)) {
      const project = state.projects.find((p) => p.id === pid);
      for (const t of state.tasks[pid]) {
        const msgs = state.messages[t.id] || [];
        const hits = [];
        for (const m of msgs) {
          if (m.role !== "user" && m.role !== "assistant") continue;
          if (role && role !== "all" && m.role !== role) continue;
          const text = (Array.isArray(m.content) ? m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n") : String(m.content || ""));
          const i = text.toLowerCase().indexOf(ql);
          if (i < 0) continue;
          const s = Math.max(0, i - 42);
          const e = Math.min(text.length, i + ql.length + 84);
          hits.push({
            role: m.role,
            timestamp: m.timestamp,
            pre: (s > 0 ? "…" : "") + text.slice(s, i),
            hit: text.slice(i, i + ql.length),
            post: text.slice(i + ql.length, e) + (e < text.length ? "…" : ""),
          });
          if (hits.length >= 5) break;
        }
        if (!hits.length) continue;
        out.totalHits += hits.length;
        out.results.push({
          sessionId: t.id,
          sessionFile: "demo",
          cwd: project.path,
          projectId: pid,
          projectName: project.name,
          projectEmoji: project.emoji,
          projectColor: project.color,
          title: state.names[t.id] || t.title,
          mtime: new Date(t.lastActivity).getTime(),
          hits,
        });
      }
    }
    out.elapsedMs = Math.max(3, Date.now() - started);
    return out;
  }

  function jsonResponse(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  async function mockApi(pathname, search, method, body) {
    const p = pathname.replace(/^\/api/, "");
    const seg = p.split("/").filter(Boolean);

    /* bootstrap */
    if (seg[0] === "bootstrap") {
      return jsonResponse({
        ok: true,
        app: "pi-studio",
        version: "1.0.0",
        demo: true,
        platform: "web",
        node: "—",
        home: "~",
        workspaceRoot: "~/PiWorkspace",
        lastProjectId: state.lastProjectId,
        lastTaskId: state.lastTaskId,
        projects: state.projects,
        liveTasks: [],
      });
    }

    if (seg[0] === "config") return jsonResponse({ ok: true, config: {} });

    /* projects */
    if (seg[0] === "projects") {
      if (method === "GET" && seg.length === 1) return jsonResponse({ ok: true, projects: state.projects });

      if (method === "POST" && seg.length === 1) {
        const name = (body?.name || "新项目").trim();
        const project = {
          id: "p-" + Date.now().toString(36),
          name,
          emoji: body?.emoji || "🗂️",
          color: body?.color || "#8b7dff",
          path: body?.path || "~/PiWorkspace/" + name,
          createdAt: new Date().toISOString(),
        };
        state.projects.unshift(project);
        state.tasks[project.id] = [];
        state.lastProjectId = project.id;
        state.lastTaskId = null;
        return jsonResponse({ ok: true, project });
      }

      const project = state.projects.find((x) => x.id === seg[1]);
      if (!project) return jsonResponse({ ok: false, error: "项目不存在" }, 404);

      if (method === "PATCH" && seg.length === 2) {
        Object.assign(project, {
          name: body?.name ?? project.name,
          emoji: body?.emoji ?? project.emoji,
          color: body?.color ?? project.color,
          path: body?.path ?? project.path,
        });
        return jsonResponse({ ok: true, project });
      }
      if (method === "DELETE" && seg.length === 2) {
        state.projects = state.projects.filter((x) => x.id !== project.id);
        delete state.tasks[project.id];
        if (state.lastProjectId === project.id) {
          state.lastProjectId = state.projects[0]?.id || null;
          state.lastTaskId = null;
        }
        return jsonResponse({ ok: true });
      }
      if (method === "GET" && seg[2] === "tasks") {
        return jsonResponse({ ok: true, tasks: tasksOf(project.id), live: [] });
      }
      if (method === "POST" && seg[2] === "tasks") {
        const task = {
          id: "t-" + Date.now().toString(36),
          title: body?.name || "新任务",
          preview: null,
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          userMessages: 0,
          toolCalls: 0,
          model: state.currentModel.provider + "/" + state.currentModel.id,
          status: "idle",
          pinned: false,
        };
        (state.tasks[project.id] ||= []).unshift(task);
        state.messages[task.id] = [];
        state.lastProjectId = project.id;
        state.lastTaskId = task.id;
        return jsonResponse({ ok: true, task });
      }
    }

    /* tasks */
    if (seg[0] === "tasks") {
      const tid = seg[1];
      const found = findTask(tid);

      if (method === "POST" && seg[2] === "open") {
        state.lastTaskId = tid;
        if (found) state.lastProjectId = found.projectId;
        return jsonResponse({
          ok: true,
          task: { id: tid, projectId: found?.projectId, cwd: "~/PiWorkspace/demo", sessionFile: null, status: "ready" },
          state: {
            model: state.currentModel,
            thinkingLevel: state.thinkingLevel,
            sessionId: tid,
            sessionName: state.names[tid] || null,
          },
          messages: state.messages[tid] || [],
          commands: COMMANDS,
          thinkingLevels: state.thinkingLevels,
          stats: state.stats[tid] || null,
        });
      }

      if (method === "POST" && seg[2] === "prompt") {
        if (activeRun) activeRun.cancel();
        activeRun = runScript(String(body?.message || ""));
        return jsonResponse({ ok: true });
      }
      if (method === "POST" && seg[2] === "abort") {
        if (activeRun) activeRun.cancel();
        emit(tid, { type: "pi", event: { type: "agent_settled" } });
        return jsonResponse({ ok: true });
      }
      if (method === "POST" && seg[2] === "thinking") {
        state.thinkingLevel = body?.level || "off";
        return jsonResponse({ ok: true });
      }
      if (method === "GET" && seg[2] === "thinking-levels") {
        return jsonResponse({ ok: true, levels: state.thinkingLevels });
      }
      if (method === "POST" && seg[2] === "model") {
        const m = state.models.find((x) => x.id === body?.modelId);
        if (m) state.currentModel = m;
        return jsonResponse({ ok: true, data: state.currentModel });
      }
      if (method === "POST" && seg[2] === "name") {
        state.names[tid] = (body?.name || "").trim() || null;
        return jsonResponse({ ok: true, name: state.names[tid] });
      }
      if (method === "POST" && seg[2] === "pin") {
        if (found) found.task.pinned = !!body?.pinned;
        return jsonResponse({ ok: true, pinned: !!body?.pinned });
      }
      if (method === "GET" && seg[2] === "stats") {
        return jsonResponse({ ok: true, data: state.stats[tid] || null });
      }
      if (method === "GET" && seg[2] === "commands") return jsonResponse({ ok: true, commands: COMMANDS });
      if (method === "POST" && seg[2] === "export") return jsonResponse({ ok: false, error: "演示模式下不能导出（请在本地运行）" }, 400);
      if (method === "POST" && seg[2] === "close") return jsonResponse({ ok: true });
      if (["steer", "follow_up", "compact", "cycle_model", "cycle_thinking_level", "clear_queue"].includes(seg[2])) {
        return jsonResponse({ ok: true, data: null });
      }
      if (method === "DELETE" && seg.length === 2) {
        if (found) {
          state.tasks[found.projectId] = state.tasks[found.projectId].filter((x) => x.id !== tid);
          delete state.messages[tid];
          delete state.stats[tid];
        }
        if (state.lastTaskId === tid) state.lastTaskId = null;
        return jsonResponse({ ok: true });
      }
    }

    /* search */
    if (seg[0] === "search") {
      const q = search.get("q") || "";
      const role = search.get("role") || "all";
      return jsonResponse({ ok: true, query: q, ...searchDemo(q, role) });
    }

    /* models */
    if (seg[0] === "models") {
      return jsonResponse({
        ok: true,
        models: state.models,
        current: state.currentModel,
        thinkingLevel: state.thinkingLevel,
        defaults: { provider: "deepseek", model: "deepseek-v4-flash" },
      });
    }

    /* filesystem（演示下都是假的） */
    if (seg[0] === "fs" && seg[1] === "list") {
      return jsonResponse({
        ok: true,
        path: "~/PiWorkspace",
        parent: "~",
        entries: state.projects.map((p) => ({ name: p.name, path: p.path, isDir: true })),
      });
    }
    if (seg[0] === "fs") return jsonResponse({ ok: true, path: body?.path || "", exists: true });

    return jsonResponse({ ok: false, error: "演示模式未实现的接口：" + p }, 404);
  }

  /* ------------------------------------------------- fetch / EventSource */
  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const u = new URL(url, location.origin);
    if (u.pathname.startsWith("/api/")) {
      const method = (init?.method || (typeof input === "object" && input.method) || "GET").toUpperCase();
      let body = {};
      try {
        if (typeof init?.body === "string") body = JSON.parse(init.body);
      } catch {}
      return mockApi(u.pathname, u.searchParams, method, body);
    }
    return realFetch ? realFetch(input, init) : Promise.reject(new Error("no fetch"));
  };

  class DemoEventSource {
    constructor(url) {
      this.url = url;
      this.onmessage = null;
      this.onerror = null;
      this._closed = false;
      const m = /\/api\/tasks\/([^/]+)\/stream/.exec(url);
      this.taskId = m ? decodeURIComponent(m[1]) : null;
      this._off = this.taskId ? subscribe(this.taskId, (payload) => this._emit(payload)) : () => {};
      setTimeout(() => this._emit({ type: "hello", sessionId: this.taskId, status: "ready" }), 20);
    }
    _emit(payload) {
      if (this._closed || typeof this.onmessage !== "function") return;
      this.onmessage({ data: JSON.stringify(payload) });
    }
    close() {
      this._closed = true;
      this._off();
    }
    addEventListener() {}
    removeEventListener() {}
  }
  window.EventSource = DemoEventSource;

  /* ----------------------------------------------------------- 演示横幅 */
  const REPO = "https://github.com/niuyizh/pi-studio";
  function installBanner() {
    document.documentElement.classList.add("demo-mode");
    const style = document.createElement("style");
    style.textContent = `
      html.demo-mode body { padding-top: 40px; }
      html.demo-mode .app { height: calc(100dvh - 40px); }
      html.demo-mode .aurora { top: 40px; }
      .demo-banner {
        position: fixed; top: 0; left: 0; right: 0; height: 40px; z-index: 900;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        padding: 0 14px; font-size: 12.5px; color: #fff;
        background: linear-gradient(90deg, #7c6cff, #29c3f6);
        box-shadow: 0 2px 14px -6px rgba(0,0,0,.5);
        font-family: var(--font);
      }
      .demo-banner b { font-weight: 700; }
      .demo-banner a {
        color: #fff; font-weight: 650; text-decoration: none;
        border-bottom: 1px solid rgba(255,255,255,.5); margin-left: 2px;
      }
      .demo-banner a:hover { border-bottom-color: #fff; }
      .demo-banner .db-tag {
        background: rgba(255,255,255,.22); border-radius: 999px;
        padding: 2px 9px; font-weight: 700; letter-spacing: .02em;
      }
      .demo-banner .db-close {
        position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
        background: transparent; border: 0; color: #fff; opacity: .8;
        cursor: pointer; font-size: 16px; line-height: 1; padding: 4px 8px; border-radius: 8px;
      }
      .demo-banner .db-close:hover { opacity: 1; background: rgba(255,255,255,.16); }
      @media (max-width: 720px) { .demo-banner .db-hide-sm { display: none; } }
    `;
    document.head.appendChild(style);

    const bar = document.createElement("div");
    bar.className = "demo-banner";
    bar.innerHTML =
      '<span class="db-tag">演示</span>' +
      '<span>这是<b>预置数据回放</b>，不会真的调用模型</span>' +
      '<span class="db-hide-sm" style="opacity:.75">· 界面、搜索、配色切换都是真的</span>' +
      '<span class="db-hide-sm">·</span>' +
      '<a href="' + REPO + '#快速开始" target="_blank" rel="noopener">想用真功能 → 本地运行</a>' +
      '<button class="db-close" title="隐藏提示">✕</button>';
    document.body.appendChild(bar);
    bar.querySelector(".db-close").onclick = () => {
      bar.remove();
      document.documentElement.classList.remove("demo-mode");
      document.body.style.paddingTop = "0px";
      const app = document.querySelector(".app");
      if (app) app.style.height = "100dvh";
    };
  }

  /* ------------------------------------------------- 自动播放 / 首屏提示 */
  const QS = new URLSearchParams(location.search);
  const ON_PAGES = /\.github\.io$/i.test(location.hostname);
  const AUTOPLAY = QS.has("autoplay") || (ON_PAGES && !QS.has("noautoplay"));
  const SAMPLE = "帮我看看这个项目的结构，然后给我三点改进建议";

  /** 访客打开就自动跑一遍演示对话，只要他还没动过输入框 */
  function autoplay() {
    setTimeout(function () {
      let tries = 0;
      const t = setInterval(() => {
        tries++;
        const input = document.querySelector("#input");
        if (input && !input.value && document.visibilityState !== "hidden") {
          clearInterval(t);
          input.value = SAMPLE;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          setTimeout(() => {
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
          }, 400);
        }
        if (tries > 40) clearInterval(t);
      }, 150);
    }, 2000);
  }

  /* ------------------------------------------------- 首次进入的小提示 */
  function hintOnce() {
    // 等界面初始化完成（openTask / restoreDraft）再填，避免刚填就被清空
    setTimeout(function () {
      let tries = 0;
      const t = setInterval(() => {
        tries++;
        const input = document.querySelector("#input");
        if (input && !input.value) {
          input.value = "帮我看看这个项目的结构，然后给我三点改进建议";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          clearInterval(t);
          setTimeout(() => {
            const toast = document.querySelector("#toasts");
            if (toast) {
              const el = document.createElement("div");
              el.className = "toast";
              el.innerHTML =
                '<div class="t-ico" style="background:rgba(124,108,255,.2);color:#7c6cff">✦</div>' +
                '<div class="t-msg">已经帮你填好一句话了，直接按 <b>Enter</b> 试试 ↘</div>';
              toast.appendChild(el);
              setTimeout(() => {
                el.classList.add("out");
                setTimeout(() => el.remove(), 300);
              }, 6500);
            }
          }, 500);
        }
        if (tries > 40) clearInterval(t);
      }, 150);
    }, 1600);
  }

  window.PiStudioDemo = { mockApi, searchDemo, state, autoplay: AUTOPLAY };

  const boot = () => {
    installBanner();
    if (AUTOPLAY) autoplay();
    else hintOnce();
  };

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
