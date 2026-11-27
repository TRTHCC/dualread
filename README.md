# DualRead

**在 VS Code 里读英文 Markdown。**

DualRead 把译文放在侧边面板，原文留在编辑器。读技术文档时，你不用在浏览器、翻译网站和编辑器之间来回切换。

- **默认仅译文**：右边看中文，左边继续对照原稿
- **只读**：不修改源文件，也不生成第二份 Markdown
- **按块对齐**：标题、段落、列表、表格逐块翻译，代码块原样保留
- **术语一致**：用术语表固定关键概念的译法
- **减少重复请求**：译文落盘缓存，同一段只翻一次
- **点击回原文**：点任意译文，跳到对应源码行

接口走 OpenAI 兼容格式，OpenRouter、DeepSeek、本地 Ollama 都能接；API Key 存在 VS Code SecretStorage 里。

```
┌──────────────────────────────────────────────┐
│ # 视频片段检索                               │
│                                              │
│ 用户提出一个问题。智能体判断某个教程视频…    │
├──────────────────────────────────────────────┤
│ ```json                                      │
│ { "clip_id": "c_123" }   ← 代码块不翻译      │
│ ```                                          │
└──────────────────────────────────────────────┘
```

默认仅译文；需要逐句核对术语时再切换到并排。

## 它适合什么场景

- 读开源项目的英文 README、设计文档、API 文档
- 翻译技术文章或课程笔记，但不想破坏原稿
- 团队里中英文文档并存，需要统一术语
- 用本地模型或免费额度，控制翻译成本

## 安装

```bash
npm install
npx @vscode/vsce package
code --install-extension md-bilingual-reader-1.0.3.vsix
```

装完要 `Developer: Reload Window`。

## 使用

1. `Cmd+Shift+P` → **Markdown 双语阅读：设置 API Key**（只需一次，存在 VS Code SecretStorage，不进 settings.json）
2. 打开任意 `.md`，`Cmd+Shift+P` → **Markdown 双语阅读：打开**
   也可以点编辑器标题栏的书本图标，或在资源管理器里右键文件

面板右上角有「切换布局」（并排 → 仅译文 → 上下堆叠）和「重新翻译」（忽略缓存、强制重译当前文档）。**仅译文**模式下左栏收起，只显示译文；代码块和 HTML 保留原样，frontmatter 和链接定义隐藏。

- **点击右侧译文** → 编辑器跳到该段的原文行。选中文字或点击链接时不会触发跳转。
- 译文默认缓存在 VS Code 的 globalStorage 里，重开窗口、重开文档都不再请求。要全局清空用命令 **Markdown 双语阅读：清空译文缓存**。

### 关于自定义编辑器

如果你把 `*.md` 关联到了自定义编辑器（比如 `markdownForHumans.editor`），`activeTextEditor` 可能为空。本插件会按三条路依次找目标文件：命令参数 → `activeTextEditor` → `window.tabGroups` 的活动标签页，所以不需要先切回文本编辑器。

## 配置

所有配置项都在 `mdBilingual.*` 下。

为了兼容已有的 `mdTranslator.*` 配置，`apiBaseUrl`、`model`、`targetLanguage` 留空时会回落到那套设置；其余配置项不回落，需要写成 `mdBilingual.*`。

| 配置项 | 默认 | 说明 |
|---|---|---|
| `mdBilingual.apiBaseUrl` | 空 → 回落 | OpenAI 兼容接口。DeepSeek 填 `https://api.deepseek.com`（无 `/v1`），中转站一般是 `https://域名/v1` |
| `mdBilingual.model` | 空 → 回落 | 模型名。`deepseek-*`、`gpt-*`、`claude-*` 都行，见下节 |
| `mdBilingual.targetLanguage` | 空 → 回落 | 目标语言，如 `Simplified Chinese` |
| `mdBilingual.glossary` | `{}` | 术语表，`原文 → 指定译文`。例如 `{"context window": "上下文窗口", "token": "词元"}`。改术语表会让旧缓存失效 |
| `mdBilingual.layout` | `translation-only` | `translation-only` 仅译文（默认）、`side-by-side` 并排、`stacked` 上下堆叠 |
| `mdBilingual.maxSegmentsPerBatch` | 20 | 每批段落数，调小可降低模型弄错 id 的概率 |
| `mdBilingual.maxCharsPerBatch` | 6000 | 每批字符数 |
| `mdBilingual.concurrency` | 1 | 并发请求数。默认串行，对配额紧张的网关最友好 |
| `mdBilingual.maxRetries` | 4 | 429/5xx 的最大重试次数 |
| `mdBilingual.retryBaseMs` | 2000 | 退避基数，第 n 次重试等约 `base × 2ⁿ` |
| `mdBilingual.retryMaxDelayMs` | 30000 | 单次重试的最长等待 |
| `mdBilingual.reasoningEffort` | `auto` | 翻译不需要思考；`auto` 对 gpt 推理模型发 `none`、对 `claude-*` 发 `low`、对 `deepseek-*` 关闭思考 |
| `mdBilingual.requestTimeoutMs` | 120000 | 单次请求超时 |
| `mdBilingual.autoRefresh` | `true` | 源文件改动时自动重译改动的段落 |

## 接 DeepSeek

DeepSeek 官方接口就是 OpenAI 格式，直连即可，不需要中转站：

```jsonc
"mdBilingual.apiBaseUrl": "https://api.deepseek.com",   // 注意：没有 /v1
"mdBilingual.model": "deepseek-flash",                  // 或 deepseek-v4-pro
"mdBilingual.targetLanguage": "Simplified Chinese"
```

API Key 用命令 **Markdown 双语阅读：设置 API Key** 单独设，不写进 settings.json。

两个容易踩的点，插件已经替你处理了：

**1. base URL 没有 `/v1`。** 插件会在你填的 base URL 后面接 `/chat/completions`，所以填 `https://api.deepseek.com` 正好拼成官方文档里的 `https://api.deepseek.com/chat/completions`。习惯性补个 `/v1` 反而可能 404。

**2. DeepSeek 的思考默认是开的，而且默认 `high`。** 这点和别家正好相反——gpt/claude 那边「不发思考参数 = 不思考」，DeepSeek 这边「不发 = 全力思考」。翻译任务要思维链没有意义，只是让每一段都慢几倍、贵几倍。而且它的开关**不是** `reasoning_effort`（那个只管强度，关不掉），是 body 级的 `{"thinking":{"type":"disabled"}}`。默认的 `reasoningEffort: auto` 会替你显式关掉。

> ⚠️ 正因为如此，`mdBilingual.reasoningEffort` 设成 `off` 在 DeepSeek 上是**反效果**：`off` 的字面意思是「什么参数都不发」，而在 DeepSeek 上这等于思考全开。想关思考就用 `auto` 或 `none`。

模型和额度：`deepseek-flash` 上下文 1M、最大输出 384K，`maxResponseTokens` 怎么设都够用，不必像别家那样抠。

## 三家模型的参数差异

`mdBilingual.model` 是唯一要改的值——base URL 指向哪个网关、API Key 是哪把，都和模型选哪家无关（前提是那个网关同时挂着它们）。插件按模型名自动适配：

| 参数 | `gpt-*` | `claude-*` | `deepseek-*` |
|---|---|---|---|
| `temperature` | 照常发 | **不发**（Anthropic 新模型收到直接 400） | 照常发（关掉思考后才生效） |
| 思考开关 | `reasoning_effort: none` | `reasoning_effort: low`（最低一档，没有 `none`） | `thinking: {type:"disabled"}` ← 不是 `reasoning_effort` |
| 默认是否思考 | 否 | 否 | **是，且 high** ← 必须显式关 |
| `max_tokens` 参数名 | 新模型要 `max_completion_tokens` | `max_tokens` | `max_tokens` |
| `response_format` | 开了就发 | 一般不支持，保持关闭 | 支持，但偶尔返回空 content |

剩下的分歧不靠猜：**任何 400 都会按 `reasoning_effort` → `thinking` → `temperature` → `response_format` 的顺序逐个摘掉参数重试**，摘一个试一次，都不计入退避重试次数；服务端要是点名了 `max_completion_tokens`，则改名而不是摘掉。所以换一个没见过的模型，最坏情况是多几次请求，不会整批失败。

（摘掉 `thinking` 的代价要知道：DeepSeek 上等于恢复成全力思考，译文照样出得来，只是更慢更贵。）

此外 `max_tokens` 这个参数名本身也在分家：OpenAI 侧的新模型（gpt-5 系列、o 系列）只认 `max_completion_tokens`，收到旧名字直接 400。这一项不能像可选参数那样摘掉（摘了等于放弃长度控制），所以**服务端在 400 里点了名，插件就改名重发**，不点名不动——中转站两种名字都可能认，主动改反而可能踩另一边。

## 输出额度要配得上批大小

`mdBilingual.maxResponseTokens` 是这套配置里最容易配坏的一项，坏了还不容易看出来。

**经验比例：`maxResponseTokens ≳ maxCharsPerBatch × 0.8`。** 默认值 `6000 字符 / 16000 token` 是配平的；如果为了减少请求数把 `maxCharsPerBatch` 调到 20000，`maxResponseTokens` 也得跟到 16000。

配不平的后果是**每一批都必然被截断**：响应是一段语法不合法的半截 JSON。插件对此有两层处理：

- **打开预览时就拦。** 比例失衡会在面板顶部出一条黄色警告，直接写明两头各该调到多少——不用等它跑完一轮再来解释。
- **真截断了也不整批丢。** 断点之前写完的条目会被逐条抢救出来正常显示，只有没写完的那几段标记为失败、保留原文。报错话术会明确指向 `maxResponseTokens`，而不是含糊地说「JSON 解析失败」。

截断信号同时认 OpenAI 的 `finish_reason=length` 和转发 Anthropic 时的 `stop_reason=max_tokens`，流式和非流式都读。

用 `claude-*` 时额度还要再宽一些：**思考 token 和译文共用这个额度**。

## 探一探能用哪些模型

```bash
read -rs MDB_KEY && export MDB_KEY && node tools/probe.js
```

`read -rs` 是静默读取，不回显也不给提示符，看着像卡住其实是在等你粘贴 key，粘完回车即可（key 不进 shell 历史）。默认探 `https://api.deepseek.com`，换网关用 `MDB_BASE=...`，指定模型用 `MDB_MODEL=...` 或直接跟在命令后面。

它会列出你的 key 可见的模型并逐个发一次最小请求，告诉你哪些当前真的能用。

## 工作方式

**分段** (`src/segment.js`)。按空行切块，逐块判定是否需要翻译。以下**原样保留、不送模型**：

- YAML frontmatter（只认文件开头）
- 围栏代码块（``` 和 ~~~，正确处理内嵌围栏与块内空行）
- HTML 块与注释
- 分隔线、链接引用定义
- 任何不含自然语言的块（表格分隔行、纯 URL、纯行内代码）

**翻译** (`src/translate.js`)。按段数和字符数分批，并发请求 OpenAI 兼容接口，要求返回 `{"translations":[{"id","text"}]}`。请求体由 `buildRequestBody()` 按模型名挑参数构造，OpenAI / Anthropic / DeepSeek 的差异都收在这一个函数里。

**渲染** (`src/webview.js`)。CSS Grid 每块一行，左原文右译文——逐段天然对齐，不需要滚动同步。不翻译的块通栏显示。原文立刻可读，译文按批次陆续填入。

**缓存**。按 `模型|目标语言|块内容 SHA1` 缓存，只在内存里，不落盘。所以改一段只会重译那一段。

## 不会做的事

源码里**没有任何写文件的代码路径**。可以自己验：

```bash
grep -rE 'writeFile|WorkspaceEdit|applyEdit|\.edit\(|fs\.' src/
```

`src/` 连 `fs` 模块都没 require。译文只存在于 webview 和内存缓存里，关掉面板就没了。

## 报错怎么读

状态码就能把责任分清楚，不用猜：

| 状态码 | 含义 | 该做什么 |
|---|---|---|
| **401** | key 无效或没带 | 重设 API Key。这才是「key 的问题」 |
| **429** | 服务端限流 | **不是 key 的问题**——key 无效会返回 401。是网关侧暂时没配额 |
| **400** | 请求参数不合法 | 插件会按 `reasoning_effort` → `thinking` → `temperature` → `response_format` 逐个摘掉重试（点名 `max_completion_tokens` 的则改名）。摘光了还 400，报错会指向模型名——多半是 `mdBilingual.model` 写错或网关没有这个模型 |
| **5xx** | 服务端故障 | 自动重试 |
| **200 但说「被 max_tokens 截断」** | 输出额度不够 | 调大 `mdBilingual.maxResponseTokens`，见上一节。断点前的译文已经抢救出来了，只补没写完的那几段 |

429 和 5xx 会按指数退避自动重试，服务端给了 `Retry-After` 就以它为准——但**一律受 `mdBilingual.retryMaxDelayMs` 夹制**。限流的网关经常回一个几百上千秒的 `Retry-After`，照单全收会让插件静默睡死。截断之后大概率还是 429，但那是一条你看得见的失败，不是一个看不见的挂起。被截断时状态栏会写明服务端原本要求等多久。

重试期间状态栏会显示「⏳ 被限流，8s 后重试（第 2/4 次）」，不会看起来像卡死。

重试用尽仍失败时，只有那一批的段落显示「这一批翻译失败」，其余已完成的译文照常保留。

遇到持续 429，按这个顺序试：

1. 确认 `mdBilingual.concurrency` 是 1
2. 调大 `mdBilingual.maxRetries` / `retryMaxDelayMs`，让它等得更久
3. 调整批大小——**但先搞清楚网关按什么限流**：
   - 按**请求数**限（RPM）：调大 `maxSegmentsPerBatch`、`maxCharsPerBatch`，批次更少请求就更少
   - 按**token 数**限（TPM）：反过来，调大批次只会更快烧完额度，该调小
   - 分不清就看报错里的原话，或两个方向各试一次
   - 不论往哪调，`maxResponseTokens` 都要跟着 `maxCharsPerBatch` 走，见上一节
4. 换 `mdBilingual.model`。如果网关的账号池是按模型分的，换一个就绕开了

## 已知限制

- **缩进式代码块**（4 空格，非围栏）不受保护，会被当作正文送去翻译。围栏代码块不受影响。
- 行内元素靠 system prompt 约束，不做占位符替换。极少数情况下模型可能动到行内代码或链接地址。因为是只读预览，出错不会污染任何文件。
- 松散列表（条目之间有空行）会被切成多块，各自渲染成独立的 `<ul>`，视觉上条目间距略大。
- 缓存按「模型 + 目标语言 + 术语表 + 段落哈希」存，最多保留 2 万段，超出后淘汰最旧的；API Key 不进缓存、不进 settings.json。

## 与上游的关系

这是 [TRTHCC/dualread](https://github.com/TRTHCC/dualread)，底座是 [foxnz/md-bilingual-preview](https://github.com/foxnz/md-bilingual-preview)（MIT，v0.5.0）。保留的部分：块级切分、OpenAI 兼容客户端、限流/截断处理、并排只读预览。本仓库新增：

- 译文持久化缓存（globalStorage + 原子落盘 + 容量上限）与「清空译文缓存」命令
- 术语表 `mdBilingual.glossary`，注入 system prompt，并参与缓存 key
- 段落行号映射与「点击译文跳原文」
- 「仅译文」布局与面板内布局切换
- 点击译文跳原文
- 相关单元测试（`node test/check.js`）

原仓库的 MIT 许可证与版权声明保留在 `LICENSE` 中。

## 自检

```bash
node test/check.js                      # 67 项单元检查
node test/check.js path/to/some.md      # 再附加一份真实文档的分段统计
```

不需要 VS Code，不发任何网络请求。
