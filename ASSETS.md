# 素材清单与审核状态

日期：2026-09-18。当前素材用于本地开发样板，不构成正式课程素材审校通过。

| 素材 | 来源 | 状态 |
| --- | --- | --- |
| 小屋与花园 SVG | 项目内原创代码绘制，apps/web/src/main.tsx 的 House 组件 | 已检查显示；可继续调整 |
| 界面文字、课程字卡、共读片段 | 根据产品方案编写 | 内容草案，待教学审校 |
| 人物、花草等图案 | 操作系统 Emoji 字形 | 实际样式因安卓字体而异；未复制第三方图片文件 |
| 中文显示字体 | 用户设备系统字体 | 不随项目分发字体文件 |
| apps/web/public/assets/audio/*.wav | 本机 macOS say，Tingting 普通话声音，PCM WAV | 机器试听素材；文件格式和引用检查通过，尚未人工审听；公开发布前确认使用许可或替换为获授权录音 |

音频文本：

- wo：我
- ba：爸
- ma：妈
- intro：你好，我的家。和喜欢的人一起，认识三个新朋友。
- meaning：看看这个汉字，找到它的意思。
- parents：爸爸，妈妈。
- story：爸爸，妈妈，我。

音频通过点击播放，不采集儿童声音，不调用外部语音服务。替换时保持文件 ID，或同步修改 apps/web/src/content.ts 并执行内容测试。

新增素材：`apps/web/src/HiddenCharacters.tsx` 内花园场景为项目原创 SVG；`hunt.wav` 为同样方式生成的待审听机器语音，文本为“汉字藏在哪里？在图里找一找，点出今天认识的三个字。”

一句话故事更新：`apps/web/src/StoryPicture.tsx` 是项目原创的亲子看书 SVG 插画；`family-reading.wav` 的文本为“爸爸妈妈和我一起看书。”，使用 Tingting 生成，仍为待审听试听素材。课程与书架共享同一图文与音频。原有 story.wav 和 parents.wav 已不用于该故事。

## 十课素材扩展

- `apps/web/src/LessonPicture.tsx`：九幅原创 SVG 场景，包括家门口、朋友到访、动物玩球、动物吃喝、池塘观察、篮子小猫、日月山、花草树木、树上树下。
- `apps/web/src/HiddenCharacters.tsx`：复用花园 SVG，按当课三字设置点选目标，课次轮换位置。
- 新增 27 个单字、9 个开场与9 个整句故事 WAV，均由 Tingting 生成；完整文本见 `scripts/audio-texts.json`，来源及审核限制与第一课相同。
- 目前仅通过资源存在、文本对应及浏览器播放路径检查；未宣称人工审听通过。

“客人来啦”修正：`apps/web/src/CharacterIllustration.tsx` 中“来”的插画为原创 SVG，表现孩子沿小路朝面前走来，带方向箭头，不再使用挥手 Emoji。认字页和看字选图共用该插画。“你”的图下注释统一为“对面的你”。

答题音效：`answer-correct.wav` 为约 0.42 秒的上行双音，`answer-incorrect.wav` 为约 0.40 秒的柔和下行双音。由项目脚本 `scripts/generate-feedback.py` 合成，无第三方录音。声音开关同时控制朗读和音效；跳过不播放，音效失败不阻断作答。

逐字跟读（2026-09-21）：新增 `word-*.wav` 共 30 段词语录音，文本取自课程的 `word`，同样使用 macOS Tingting 生成。执行 `python3 scripts/generate-reading-timings.py` 可补齐词语录音并更新 `apps/web/src/readingTimings.ts`。当前时间点根据 WAV 中的有声片段估算，排除静音，不是人工校准或语音强制对齐结果；替换录音后需要重新生成，精确同步需进一步校准逐字时间点。

ARC-02：学习运行时通过 API 素材 URL 渲染插画和播放音频；本文原型 SVG/音频路径仅作为导入与审校来源。找字 SVG 导出源保存在 `scripts/import-content/PrototypeHunt.tsx`，运行组件只叠加目标字。
