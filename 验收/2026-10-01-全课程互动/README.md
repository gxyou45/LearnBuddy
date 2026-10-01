# 全课程描笔画与小兔过河

2026-10-01 用户要求：将前十课两项互动扩展到全部单元，每课至少两个描写字，自测后发布 GitHub Pages。

## 实现范围

- curriculum-1000-v1 全部 204 课配置两个描写目标，共 408 字。前十课原有目标保留，新增目标优先选笔画较少的本课字。完整配置为 apps/web/src/lessonInteractions.json。
- 描写可演示、跳过、抬手与刷新续写。两个目标按字 ID 独立保存；旧十字的几何与 v1 存档键不变，重玩新会话重新开始。不新增识字证据或正式课程步骤。
- 全课次启用兔子过河，三字课 6 步、五字课 10 步；错答后改对可前进，保留首次错答，跳过不增加成功，刷新不重复累计。课末到岸／休息提示保留。
- 408 字源自项目原用的固定 Hanzi Writer Data 版本，原始记录及许可随包分发。TraceCharacter 和数据单独懒加载。生成脚本 scripts/strokes/prepare.py 可复现。
- 650px 及更矮屏幕使用较小过河插图及单行课末提示，保证按钮和题目空间。
- Pages 仍为现有 50 课，50 课全部扩展。没有重建课程包、音频、内容版本或启用新的找字场景。

## 自动化验证

- 完整工作区构建、静态构建通过。
- 单元测试 131/131：包括 204 课各两个本课目标、408 份原始 JSON 一致性、所有笔画路径可描到终点、旧目标保留及学习规则回归。
- 静态构建逐课浏览器 52/52：全部 50 课，每课两字首笔、刷新恢复、记录隔离、320px 布局、错误后改对、跳过与过河恢复；另验五字课十步到岸、重玩及许可资源。
- 新目标触摸补测 1/1：模拟触摸抬手后刷新续写、点终点不能直接完成、可直接继续课程。
- 全课程隔离组件浏览器 2/2：204 课逐一渲染两个实际 TraceCharacter 组件和过河组件；最后 C200 两字以鼠标完整描写全部笔画。此页不是完整 204 课的数据库集成测试。
- 答题／旧首课互动／复习恢复补测 4/4。短屏与故事补测 3/3，覆盖 393×650、320×568、420px 极短屏操作及静态版原十课／阶段故事。
- 最终构建补充冒烟 3/3：十步到岸及重玩、触摸、原始笔画与许可证。

首轮新增逐课测试在页面初始化完成前修改模拟进度，个别用例回到首课；补充页面就绪等待后完整 52 项通过。现有短屏测试暴露过河插图及课末提示占用额外空间，已调整短屏样式。旧故事测试最初依赖本环境不存在的 API，改为明确的静态模式；随后修正切换课次时误带上一课 huntRound 的测试夹具。另发现旧故事配图样式覆盖短屏高度限制，已恢复短屏故事图高度；最终短屏／故事 3 项全部通过。上述均保留失败记录并定向复验。

[截图画廊](index.html)包含 50 课各两个描写截图和过河截图，以及组件、触摸、到岸检查。截图来自本机 Chromium 构建预览／隔离组件页，不是已发布页面，也不替代安卓实机或人工笔顺教学审校。

主要日志位于 /tmp/learnbuddy-interactions-*，首次构建与测试日志位于 /tmp/learnbuddy-all-interactions-*。

## 发布状态

**未发布：GitHub HTTPS 凭据失效，推送检查返回 Invalid username or token。已请求用户在本机重新登录有仓库写权限的账户。** 当前分支基于 a89794a。没有把本轮构建预览当成已发布验收。

此工作环境没有原 Docker／Colima 实例、运行数据库及 curriculum-release 完整课程包，因此不能备份或切换原本地云端试用服务，也未新建数据库替代原学习数据。全部浏览器测试使用独立临时上下文和模拟学习记录；原用户数据、内容和线上版本均未改动。

重新登录后可推送代码、等待 Pages 工作流成功，再使用真实 Pages 地址运行 tests/e2e/interactions-all.spec.ts 并保存发布后截图。本地完整版的备份核对与部署需在原服务所在环境继续。


复现（先 npm ci，并用 npx playwright install chromium 安装测试浏览器）：

```sh
npm test
npm run build
npm run build:static
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
# 另一个终端：
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npx playwright test tests/e2e/interactions-all.spec.ts --fully-parallel --workers=2
TEST_STATIC=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npx playwright test --config=playwright.chromium.config.ts tests/e2e/viewport.spec.ts tests/e2e/quiz-flow.spec.ts tests/e2e/interaction-published.spec.ts tests/e2e/review-resume.spec.ts
# 组件验证使用独立的 Vite 开发服务 5173：
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npx playwright test tests/e2e/interactions-components.spec.ts
```

playwright.chromium.config.ts 只将测试浏览器指定为 Playwright 自带 Chromium，便于未安装 Google Chrome 的电脑复现。静态构建校验及截图通过不等于 Pages 已部署。
