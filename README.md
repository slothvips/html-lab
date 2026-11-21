# HTML Lab

一堆自己写的小页面，纯前端、无构建步骤，点开就能用。

| 页面 | 说明 | 体积 |
|---|---|---|
| [video-cover](./video-cover/) | 视频封面制作器：输入主题自动排版，9 套模板，16:9 / 9:16 切换，导出 PNG；支持 WebMCP | 30 KB |
| [chinese-zodiac](./chinese-zodiac/) | 十二生肖与中国传统文化 | 28 KB |
| [qingming](./qingming/) | 清明上河图 · 汴京：Three.js 可漫游三维长卷 | 5 MB |
| [threebody-droplet](./threebody-droplet/) | 水滴 · 末日之战：《三体 Ⅱ》末日之战 three.js 实时演出 | 22 MB |

每个目录都是独立的静态站点，`index.html` 即入口。全部零构建，直接双击或放到任意静态托管上都能跑。

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 部署

GitHub Pages 直接从仓库根目录发布，访问 `https://slothvips.github.io/html-lab/`。

video-cover 另有 Cloudflare Pages 部署：<https://video-cover-site.pages.dev>

## WebMCP

`video-cover` 通过 WebMCP（`document.modelContext`）把页面能力暴露给浏览器里的 AI agent，注册了三个工具：

| 工具 | 类型 | 作用 |
|---|---|---|
| `list_cover_templates` | 只读 | 列出 9 套模板和两种画布比例 |
| `get_cover_state` | 只读 | 返回当前标题、副标题、模板、尺寸 |
| `create_cover` | 写入 | 按参数生成封面，可选直接下载 PNG |

本地验证需要 Chrome 149+ 并开启 WebMCP：

1. 打开 `chrome://flags/#enable-webmcp-testing`，设成 Enabled，重启
2. 打开页面，左下角出现绿点「WebMCP 已注册 3 个工具」
3. DevTools → Application → WebMCP 面板里可以直接填参数跑工具

命令行启动 Chromium 时对应的开关是 `--enable-features=WebMCP`（注意不是 `WebMCPTesting`，Chrome 158 实测前者才生效）。

不依赖 agent 也能在 Console 里自测：

```js
const tools = await document.modelContext.getTools();
const t = tools.find((x) => x.name === 'create_cover');
await document.modelContext.executeTool(t, {
  title: '**AI 编程**效率翻倍',
  subtitle: '实测 5 个工具',
  template: 'neon',
  ratio: 'port',
});
```

注意 API 入口是 `document.modelContext`，不是旧的 `navigator.modelContext`（2026 年 5 月迁移），`provideContext()` / `unregisterTool()` 也已被移除，注销靠 `AbortSignal`。

