# HTML Lab

一堆自己写的小页面，纯前端、无构建步骤，点开就能用。

| 页面 | 说明 | 体积 |
|---|---|---|
| [video-cover](./video-cover/) | 视频封面制作器：输入主题自动排版，9 套模板，16:9 / 9:16 切换，导出 PNG | 21 KB |
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
