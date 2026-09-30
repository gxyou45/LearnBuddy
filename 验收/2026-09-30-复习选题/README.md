# DEV-22 统一复习选题

本轮统一游客／云端的花园与课末选择规则：花园最多 5 个到期字；课末最多 2 个本课字和 3 个历史字。同字去重，优先需要练习的状态，再比较错误数和日期，保留所选字音／字义任务。无候选不凑数，不出未作答字。

单元测试 119/119、隔离数据库测试 57/57、构建预览浏览器 3/3 通过。浏览器验证实际字义题、每轮 5 个不同字、课末 2＋3、跳过及退出不移动正式课次位置。测试脚本初次因按钮名称遗漏箭头未找到按钮，修正后完整通过；数据库测试初次错误使用不存在的 id 排序字段，改为复合键后通过。

截图：[花园字义题](截图/garden-320.png)、[课末混合练习](截图/mixed-320.png)。320px Chrome 自动化不代替安卓实机验收。

整轮刷新／换设备恢复、课前入口、同日跨入口冷却、1／3／7 天调度仍未实现；本轮不改变学习掌握判定、课程内容或启用待审场景。无数据库迁移。

源码 `2c4f0679654ae703661cfdb4a6e45e51d1b0677d` 已发布；Pages 任务 `36675458175` 成功，真实页面 5/5 通过；本地真实服务 6/6 通过（含云端改选）。Pages 首次测试文件名匹配误纳入云端登录测试，静态站不提供账户接口而返回 405；明确筛选适用的五项用例后全部通过。

发布后截图：[Pages 花园](截图/pages-garden-320.png)、[Pages 综合练习](截图/pages-mixed-320.png)、[本地花园](截图/local-garden-320.png)、[本地综合练习](截图/local-mixed-320.png)。Pages 截图保留测试环境 navigator.onLine 报告离线时的提醒；页面与素材由真实 HTTPS 站点加载。测试不等同于安卓实机听音审校。

本地镜像 API `learnbuddy-api:review-2c4f067`（`8993d1323ef3`）、Web `learnbuddy-web:review-2c4f067`（`a59ec119d2ee`）。从上轮 `scenes-3683359` 精确镜像叠加本次 Git 提交差异并重新构建，依赖／课程素材未变；未执行生产迁移、seed 或内容启用。服务健康，内容仍为 `curriculum-1000-v1`；发布前后正式 Attempt 均 307 条，临时浏览器账号自动清理。

备份 `.backups/20260930-review-selection-release`，旧镜像保留 `before-review-20260930` 标签。日志 `/private/tmp/learnbuddy-review-selection-{unit,database-verified,browser-final}.log`、`/private/tmp/learnbuddy-review-{release-build,published-pages-final,published-local}.log`。
