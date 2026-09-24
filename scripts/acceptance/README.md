# 截图验收

启动本地 Docker 应用后，在项目工作台运行完整回归和截图流程。截图只操作隔离浏览器记录、专用测试账号；不使用真实孩子档案。测试账号的邮件发往本机 Mailpit。

```sh
PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test --workers=1 --reporter=json > /tmp/learnbuddy-acceptance.json
PLAYWRIGHT_BASE_URL=http://localhost:8080 ACCEPTANCE_REPORT_DIR=验收/2026-09-23 npx playwright test -c playwright.acceptance.config.ts > /tmp/learnbuddy-visual.json
python3 scripts/acceptance/report.py --out 验收/2026-09-23 /tmp/learnbuddy-acceptance.json /tmp/learnbuddy-visual.json
```

换日期时使用新的报告目录。JSON 报告完成后再生成文档；命令失败时也应保留结果，修复后传入重测 JSON，脚本按相同测试名称合并并标注此前失败。不能以旧截图冒充新一轮验收。

- `tests/e2e`：课程、账户、云端、离线、隐私和窄屏回归。
- `tests/acceptance`：真实浏览器截图，写入指定文档目录。
- `playwright.acceptance.config.ts`：独立临时结果目录，避免与原有测试互相清理。
- `report.py`：根据真实 Playwright 结果生成 Markdown、可离线浏览的 HTML 画廊及机器摘要。

网络异常通过 Playwright 请求拦截模拟，不关闭真实网络或服务。该测试不等于真机、人工语音审校和儿童教学效果验证。

词语配图专项：`node --import tsx scripts/acceptance/visual-catalog.ts` 从当前组件生成素材样张及匹配清单；`tests/e2e/word-visuals.spec.ts` 在真实学习流程保存 16 张截图。素材样张和应用实拍分开标明。该轮汇总命令：`python3 scripts/acceptance/visual-report.py /tmp/learnbuddy-icons-e2e.json /tmp/learnbuddy-icons-final.json`；结果见 `验收/2026-09-23-图标优化/`。

故事插图专项：`PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test -c playwright.acceptance.config.ts story-art.spec.ts` 实际完成首批十课流程并保存手机页和放大页截图；`python3 scripts/acceptance/story-report.py /tmp/learnbuddy-story-e2e.json` 生成原文／插图／页面对照画廊。源码与素材记录见 `apps/web/src/story-art/README.md`。

## 词义情境配图复验

`semantic-words.spec.ts` 从实际已发布目录找到“我和你、他来、吃东西、力气、跳一跳、虽然”（原课“吃东西”对应设计稿“吃饭”）所在课程，以隔离游客完成认字、读词点击，保存 12 张实际截图，并检查 320×568 布局。

素材页仍使用 `visual-catalog.ts`；将 `ACCEPTANCE_REPORT_DIR` 指向 `验收/2026-09-23-词义情境配图`，避免覆盖上一轮材料。`semantic-sheets.mjs` 渲染 235 个不同情境的 10 页样张，检查空 SVG、无效引用及绘图边界。边界警告写入 JSON，需人工处理；脚本成功本身不代表警告为空。

```sh
ACCEPTANCE_REPORT_DIR=验收/2026-09-23-词义情境配图 node --import tsx scripts/acceptance/visual-catalog.ts
node scripts/acceptance/semantic-sheets.mjs
npx playwright test --config playwright.acceptance.config.ts semantic-words.spec.ts > /tmp/learnbuddy-semantic-browser.json 2>&1
PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test tests/e2e/word-visuals.spec.ts tests/e2e/reading.spec.ts tests/e2e/viewport.spec.ts --workers=1 --reporter=json > /tmp/learnbuddy-semantic-regression.json 2>&1
python3 scripts/acceptance/semantic-report.py
```

在 workbench 的已有验收窗格执行浏览器任务。报告脚本需两份 Playwright JSON 结果及截图齐全；截图页和素材页分别标明，统计按 934 个去重设计词语计算。报告中的构建、单测和发布信息需要执行者核对对应日志。
