# DEV-22 固定复习题单与恢复

游客版将固定题单、题型、选项顺序、提示与游标保存到已有本机进度；原首次答案及改选仍沿用已有 Attempt。损坏题单拒绝覆盖原存档。云端在孩子档案保存题单，预先固定最多 5 个原题课次（课前最多 2 个），根据课次完成状态推导游标；原选项、提示、首次答案及改选由既有服务端记录恢复。

回小屋或刷新不丢轮次；首页、花园及课末可“继续上次复习”。明确结束本轮才关闭，未作答题不补造跳过记录。另一个入口存在未结束题单时优先续用并提示，不悄悄换题。课前热身原目标课保留；复习不推进正式课次。

新增 `202609300001_review_round` 迁移，仅增加 `Learner.reviewRound` 可空 JSONB。题单随孩子一并导出和删除。学习事件的版本检查与原答案不覆盖规则保留；服务端拒绝提前作答后面的题、已结束轮次或旧轮次的迟到操作。创建请求响应丢失后通过持久请求 ID 重取同一题单。

## 预发布验证

124/124 单测，58/58 隔离数据库测试，完整构建通过；游客 Playwright 6/6，隔离 API 的云端 Playwright 2/2。覆盖刷新后错选／提示／选项顺序保留、正确后 500ms 前进、回小屋续接、游标保持、结束不重复出题、创建响应丢失后不重复建课次、第二个独立浏览器仅携同账号认证 Cookie 恢复原轮次、并发位置保护、正式进度不变、导出与删除。

隔离浏览器测试首次夹具硬编码当前课程版本，但隔离库种子实际是 prototype-v4，且旧过河测试不适用该版本；改为读取实际目录版本，专门验证本轮恢复与已有题单优先后通过。隔离库与临时容器均自动清理，不修改正式课程或用户日期。tmux 工作台不可连接，使用有限时、结束清理的 Docker 测试流程，没有另起常驻开发服务。

截图：[游客刷新后错选](截图/guest-wrong-320.png)、[游客恢复第二题](截图/guest-second-320.png)、[云端刷新后错选](截图/cloud-refresh-320.png)、[另一浏览器恢复第二题](截图/cloud-second-device-320.png)。

## 边界

云端换设备需同一账号／孩子且联网；游客不会跨设备同步。已缓存当前题的离线作答仍保留于旧补传队列，进入下一题需联网读取固定课次；不宣称整轮离线可玩。另一设备有未同步操作时，不合并冲突答案，沿用原冲突副本与读取云端入口。自动化双浏览器不代替安卓实机。跨入口完成后冷却及 1／3／7 天调度尚未实现。

## 发布结果

源码 `e448de2686f64669d76f6a1e003f6ced064c3a69` 已推送；Pages 任务 `36683844858` 成功。真实 Pages 7/7、本地游客 7/7＋云端 3/3 通过，未使用构建文件替换实际部署页面；后者再次验证响应丢失、两独立浏览器续接和已有题单优先。

发布后截图：[Pages 错选恢复](截图/pages-wrong-320.png)、[Pages 第二题](截图/pages-second-320.png)、[本地游客错选恢复](截图/local-guest-wrong-320.png)、[本地游客第二题](截图/local-guest-second-320.png)、[本地云端错选恢复](截图/local-cloud-refresh-320.png)、[本地另一浏览器](截图/local-cloud-second-device-320.png)。

本地 API `learnbuddy-api:round-e448de2`（`85651f7f9b1f`）、Web `learnbuddy-web:round-e448de2`（`1da5f146d9cf`）已切换且健康。基于精确已发布镜像叠加 Git 提交差异重建，依赖和素材未变。只应用 `202609300001_review_round`，没有生产 seed 或内容启用；课程仍 `curriculum-1000-v1`，正式 Attempt 发布前后均 307 条。

有效备份 `.backups/20260930-review-round-release-verified`：数据库归档可解析，两份压缩包校验通过；旧镜像保留 `before-round-20260930` 标签。首次备份进程退出 137，仅生成 `.partial` 文件，保留在 `.backups/20260930-review-round-release`，不可用于恢复；之后单独重做成功。核验正式 API 无 OOM、无重启，服务与数据未受影响。回退可保留新增列并切回旧镜像，不删除题单或作答。

日志 `/private/tmp/learnbuddy-round-{unit,database-verified,guest-final,isolated-browser-final,release-build,local-deploy,published-pages,published-local-guest,published-local-cloud}.log`。
