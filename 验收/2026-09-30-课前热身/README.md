# DEV-22 可选课前热身

新课开始前，如已有到期队列，邀请回顾最多 2 个不同旧字；沿用花园的优先顺序和字音／字义任务，不引入未学字。继续未完成课程、重玩已完成课程、没有到期项时直接进课。可拒绝邀请或在热身中直接开始原选新课，未作答不制造跳过记录；正式课程在热身结束前不推进。

121/121 单测、完整构建、6/6 浏览器构建预览通过：已有答题流程 2 项、上一轮复习 1 项、本轮游客 2 项及云端 1 项。云端用真实 API 在一次性账号中生成已学题，仅替换到期查询响应来模拟次日；复习启动、作答、改选、课程转换均使用真实 API，账号测试后删除。不修改正式数据库的日期或用户记录。

覆盖邀请页刷新、最多 2 字、原题型、错答停留、改对半秒前进、单题跳过、整轮提前退出、拒绝邀请、继续／重玩不打扰。320px 截图：[邀请页](截图/invitation-320.png)、[游客改选](截图/guest-correction-320.png)、[云端改选](截图/cloud-correction-320.png)。不代替安卓实机验收。

边界：仅邀请页刷新能保留原选课程；开始答题后的整轮恢复及跨设备同步仍待实现，已有作答按原机制保存。没有加入跨入口冷却或 1／3／7 天排程，没有改掌握判定或启用新教学素材。云端队列尚未加载或查询失败时，不为可选热身阻挡正常开课。

源码 `4c7a9ed4eec80bfa246f7198d854b45677dc108c` 已推送；Pages 任务 `36680927410` 成功。本地从上一轮精确镜像叠加已提交文件构建 Web，镜像 `learnbuddy-web:warmup-4c7a9ed`（`e3e5d6627d84`）已切换且健康。API 未变，保留 `review-2c4f067`；课程仍 `curriculum-1000-v1`，未执行迁移、seed 或内容启用。

真实部署回归：Pages 6/6；本地游客 6/6＋云端 2/2，均不替换页面资源。截图：[Pages 邀请](截图/pages-invitation-320.png)、[Pages 改选](截图/pages-correction-320.png)、[本地邀请](截图/local-invitation-320.png)、[本地改选](截图/local-correction-320.png)、[本地云端改选](截图/local-cloud-correction-320.png)。

备份 `.backups/20260930-warmup-release`，旧网页镜像保留 `before-warmup-20260930` 标签。正式 Attempt 发布前后均 307 条，测试账号已清理。日志 `/private/tmp/learnbuddy-warmup-{unit,build,preview,release-build,published-pages,published-local-guest,published-local-cloud}.log`。
