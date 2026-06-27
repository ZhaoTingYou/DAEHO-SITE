# DAEHO 官网 · Codex 构建总指令

> **怎么用这份文件:** 把本文件 +《DAEHO_设计书.md》+《DAEHO_动画实现要点.md》三份一起给 Codex。
> 本文件是"总指挥",规定**两份文档怎么配合、按什么顺序构建、每一步验收什么**。
> 《DAEHO_生图Prompt.md》是给 GPT 生图的,**不要**给 Codex。

---

## A. 你(Codex)拿到的输入与分工

- **《DAEHO_设计书.md》= 唯一真相源(要做成什么样)。** 设计系统(§1)、对标手法(§1.5)、逐页视觉+动画(§2)、通用与交付(§3)、移动端(§4)。
- **《DAEHO_动画实现要点.md》= 难动画怎么落地。** 全局基建(§1)、通用积木(§2)、CHRONICLE 时间轴(§3)、SPECIALTY 七步钉屏(§4)、其他招牌(§5)、移动端降级(§6)。
- **冲突时优先级:** 视觉/内容/布局 以《设计书》为准;复杂动画的"技术做法" 以《动画实现要点》为准。两者不应冲突;若发现矛盾,**停下来问**,不要自行臆断。

## B. 技术栈(锁定)
Next.js(App Router)+ TypeScript + Tailwind CSS + Framer Motion + Lenis + next-intl(locale:`ko` 默认 / `en`)。静态优先(SSG),v1 无后端,文案与新闻走本地 JSON/MDX。

## C. 全局红线(任何阶段都不得违反)
1. **配色:只用《设计书》§1.1 的 5 个色 + 定义好的 token。整站亮调为主,绝不出现黑色/近黑背景。** 海军蓝只当墨色(字/线/页脚/极小色块),酒红只点睛。
2. **字体:只用那 4 个(Cormorant Garamond / Inter / MaruBuri / Pretendard),按 locale 切换。** 不引入其他字体。
3. **动画:只动 `transform`/`opacity`;滚动连续值用 motionValue,不每帧 `setState`;一律尊重 `prefers-reduced-motion`。**
4. **缺图:渲染带文件名的占位块(象牙或纯白底 + 居中文件名),绝不让布局塌掉。**
5. **移动端优先 + AA 无障碍;无任何"只能 hover 才触发"的关键交互。**
6. **每页版式骨架不同(§1.6)+ 每页有专属视觉母题(§1.7):** 严格按各页"布局原型 + 标识结构元素"实现;并落实各页"视觉母题"(HOME 银幕 / CHRONICLE 时间轴 / LEGACY 碑文 / SPECIALTY 解剖图 / NEWS 报头 / GOLF 配置台),每页至少 2 个专属母题元件。**标识元素与母题元件均不得跨页复用。** 验收以"**遮住文字也能一眼认出是哪一页**"为准。通用组件按页做 variant,**不要六页套同一种布局**。统一的只有设计系统(色/字/间距/动效)。
7. 不臆造未给定的真实内容(数字、年份、文案);保持文档里的占位(`00`、`19XX` 等),需要真实内容处用占位并在 README 标注。

## D. 协作方式(重要)
- **一次只做一个阶段。** 每阶段做完 → 给我可预览的结果 + 对照"验收清单"自检 → **全部通过才进下一阶段**。
- 每阶段一个 commit;阶段名作 commit message。
- 任何要偏离文档/红线的地方,**先问再做**。

---

# 构建阶段(按顺序,每步"验收清单"须全绿才推进)

## Phase 0 · 脚手架
**目标:** 跑起来的空壳 + 设计 token + 字体 + 双语路由。
**产出/做法:**
- 初始化 Next.js(App Router)+ TS + Tailwind;装 framer-motion、lenis、next-intl。
- 目录:`app/[locale]/...`、`components/`、`messages/ko.json`、`messages/en.json`、`public/images/`、`lib/`、`styles/`。
- 把《设计书》§1.1 的 token 写进全局 CSS `:root`,并映射进 Tailwind theme(颜色/字号/间距/缓动)。
- 按《设计书》§1.2 接入 4 种字体(Google + jsDelivr + Naver webfont),实现 `body.locale-ko/.locale-en` 字体变量切换。
- next-intl 配置 `/ko`(默认)`/en` 路由 + 中间件。

**验收清单:**
- [ ] `/ko` 与 `/en` 均可访问,`npm run dev` 与 `build` 无报错/无类型错。
- [ ] 4 种字体确实加载;切到 `/en` 标题变 Cormorant、正文变 Inter;`/ko` 变 MaruBuri/Pretendard。
- [ ] `:root` 里 5 个色 + token 生效;Tailwind 能用 `bg-bg`、`text-primary` 之类映射类。
- [ ] 页面默认底色是 `#F8F6F2`,**全局搜索无任何黑色/近黑背景值**。

## Phase 1 · 设计系统 + 基础组件 + 动画基建
**目标:** 一个内部 `/__styleguide` 沙盒页,展示全部 token、字号、组件、四个全局动作。
**产出/做法:**
- 字号阶梯(§1.2 表)、间距/栅格(§1.3)。
- 四个全局动作(§1.4):Hover Zoom(纯 CSS,`scale(1.04)`)、滚动揭示(`<Reveal>` 组件,`whileInView` + stagger)、亮调层次切换(象牙↔纯白 + 投影渐显,**无深色**)、页面入场编排。
- 通用组件:`<Hero> <SectionIntro> <StatRow>(count-up) <MediaText> <ProductGrid> <ColorSwatchRow> <TimelineEntry> <PlaceholderImg>`。**`<SectionIntro>` 等需支持按页 `variant`(§1.6),不能只有一种样式。**
- 动画基建(《动画要点》§1):Lenis 接入 + 与 Framer `useScroll` 同步(解决抖动);`usePrefersReducedMotion` + Context 全局开关。

**验收清单:**
- [ ] `/__styleguide` 能看到全部颜色/字号/组件,样式与《设计书》§1 一致。
- [ ] `<SectionIntro>`/卡片类组件**至少演示 2 种以上 variant**(为 §1.6 各页不同骨架做准备)。
- [ ] Hover 任意卡片:图 `scale(1.04)`,外层 `overflow:hidden` 不溢出;文字链酒红下划线左→右扫入。
- [ ] `<StatRow>` 滚动进入触发 count-up,带千分位,**不走 React state**。
- [ ] 开 `prefers-reduced-motion`:漂浮/视差/zoom 关闭,只剩瞬时淡入。
- [ ] 缺图时 `<PlaceholderImg>` 显示文件名占位块,布局不塌。
- [ ] Lenis 平滑滚动下,绑 `useScroll` 的元素不抖、不回弹(同步成功)。

## Phase 2 · 全局框架(导航 / 页脚 / 路由骨架)
**目标:** 全站外壳 + 完整站点地图。
**站点地图(锁定):**
```
/[locale]/                         HOME
/[locale]/chronicle                CHRONICLE
/[locale]/chronicle/[year]         里程碑详情(或时间轴就地展开,见§2.7.3)
/[locale]/legacy                   LEGACY 索引
/[locale]/legacy/loyalty|credibility|achievement
/[locale]/specialty                SPECIALTY 索引
/[locale]/specialty/technique|collection
/[locale]/specialty/collection/[slug]   作品详情
/[locale]/news                     NEWS
/[locale]/news/[slug]              文章详情
/[locale]/golf                     GOLF
/[locale]/golf/inquiry             GOLF 配置咨询
/[locale]/contact                  联系/咨询(全站统一)
+ 系统页:404 / 加载态 / 空态
```
**做法(《设计书》§1.8 + §3.3 + §4.2;动画见《动画要点》§2.5):** 实现**两层顶栏**——
- 第一行 utility bar:**左 logo `DAEHO`(靠左,不居中)**;右 = `KO/EN` 语言切换 + 三个外链 `대호 · OH · VULCAN`(`href` 空、`aria-disabled`、透明度 .7、无 hover 下划线、`config.externalLinks` 配置)+ **最右常驻 `CONTACT · 문의` 入口(酒红描边药丸/酒红字,最显眼,链 `/contact`,透明态反白描边、象牙态酒红)**。
- 第二行 主导航:`HOME · CHRONICLE · LEGACY · SPECIALTY · NEWS · GOLF`(当前页酒红下划线);**LEGACY/SPECIALTY hover 出通栏 mega menu**(满宽面板,子项 = 标题 + 一行小字描述,见 §1.8;延迟 150ms 关闭防误关)。
- **透明态↔象牙态**:初始透明叠在 hero 上、文字反白;滚动离开顶部后变象牙底 + 毛玻璃 + hairline、文字海军蓝。
- **方向感知滚动**:下滚隐藏(`translateY(-100%)`)、上滚出现;最顶部强制显示;隐藏时关闭 mega menu。
- 移动端汉堡 → 全屏象牙白抽屉(LEGACY/SPECIALTY 二级就地展开,底部"其他站点"含 OH/VULCAN);页脚。

**验收清单:**
- [ ] 上述所有路由可访问(可先空页 + 占位);切 KO/EN 真正切 locale 且路径保持。
- [ ] **顶栏两层**:logo 与主导航**不在同一行**;logo 靠左;KO/EN 与 대호/OH/VULCAN 与 logo **同在第一行**。
- [ ] **utility bar 最右有常驻 `CONTACT · 문의` 入口**,全站每页可见、酒红点睛、链到 `/contact`;透明态反白描边、象牙态酒红;移动端在抽屉菜单末尾有醒目 CONTACT。
- [ ] **hover LEGACY/SPECIALTY 弹出通栏 mega menu**(子项带小字描述);移出后 ~150ms 才关、斜向移到面板不消失;点击主项进索引页;`Esc` 可关、可键盘 Tab。
- [ ] **透明→象牙**:hero 上初始透明+反白,滚动后象牙底+海军蓝字,过渡 300ms;反白在 hero 上可读(暖白渐变到位)。
- [ ] **方向感知**:下滚顶栏滑出隐藏、上滚立刻滑回;最顶部恒显示;隐藏时 mega menu 同时关闭;无抖动(方向阈值生效)。
- [ ] 当前页菜单项酒红下划线;载入时主导航项错峰淡入、下划线"画出"。
- [ ] OH/VULCAN 降透明度、不可点;填入网址后自动变可点(`target=_blank`)。
- [ ] 移动端:汉堡打开全屏抽屉、错峰落入、LEGACY/SPECIALTY 二级可展开、锁背景滚动。
- [ ] 键盘可操作菜单与语言切换;`prefers-reduced-motion` 时改瞬时显隐;无深色背景。

## Phase 3 · HOME(《设计书》§2.1 + 《动画要点》§6 Hero 视频)
**目标:** 五段齐全 + 入场招牌动作 + **背景视频 Hero(视频优先、图片占位)**。
**做法补充:** 实现可复用组件 `<HeroMedia poster videoSrc?>`,按《设计书》§2.1"Hero 视频规范":有 `videoSrc` 放视频、无则回退 `home_hero.png`;视频必须 `muted/autoPlay/loop/playsInline/preload=metadata/poster`,多 `<source>`(webm+mp4),`object-fit:cover`;IntersectionObserver 滚出暂停、回到播放;`prefers-reduced-motion` 只显 poster;暖白渐变蒙版(非黑)保证文字 AA。**当前阶段不传 `videoSrc`**,即用 `home_hero.png` 占位。
**验收清单:**
- [ ] S1–S5 齐全;Hero 大字**逐词上浮**(错峰 ~120ms);媒体 poster→播放/或静态图均做极缓推近,无跳变。
- [ ] `<HeroMedia>` **不传 videoSrc 时回退 `home_hero.png`**;**传入 `/public/videos/home_hero.mp4`(+webm)后,无需改版式即自动播放**。
- [ ] 真机验证:iOS Safari 与安卓 Chrome 上视频**自动播放成功**(确认 `muted`+`playsInline`+DOM `video.muted=true` 都在)。
- [ ] Hero 滚出视口 `pause()`、回到 `play()`;`prefers-reduced-motion` 只显 poster(可选手动播放按钮)。
- [ ] 视频上是**暖白渐变蒙版(非黑)**,文字对比过 AA;**全站仍无黑/暗场**。
- [ ] S3 三组数字海军蓝 + count-up 千分位。
- [ ] S4 四篇章卡错峰揭示、hover zoom + 投影加深;文案/链接正确。
- [ ] 背景在象牙↔纯白间走;移动端 hero 用小码率视频或退回 poster、代表作 snap carousel、数字竖排。

## Phase 4 · CHRONICLE(《设计书》§2.2 + 《动画要点》§3)
**目标:** 时间轴"自我绘制"。
**验收清单:**
- [ ] **遮住文字也能一眼认出是"档案/编年"(§1.7 母题《时间轴》)**:贯通竖轴 + 超大年份锚点 + FIRST 红章已落实;骨架=垂直时间轴/左右交错(§1.6),与其他页明显不同。
- [ ] 海军蓝竖线 SVG `pathLength` 随滚动绘出(用 `useScroll`+`useTransform`,Framer 自动算 dasharray)。
- [ ] 节点随经过点亮(scale + 酒红描边一闪);年份进入浮现(opacity+位移);左右条目交替滑入;FIRST 徽章轻弹。
- [ ] 描线与 Lenis 滚动同步、不抖。
- [ ] 移动端:轴线移左侧单列、改"节点逐个点亮 + 分段填充"(放弃连续描线),滚动 60fps。

## Phase 5 · LEGACY(索引 + 3 子页)(《设计书》§2.3 + 《动画要点》§7 光扫文字)
**验收清单:**
- [ ] **遮住文字也能一眼认出是"碑文/纪念厅"(§1.7 母题《碑文》)**:居中超大衬线句 + 独占整屏的巨数字 + 超大留白已落实;骨架=居中单列(§1.6),与 CHRONICLE/SPECIALTY 明显不同。
- [ ] 哲学句**逐行光扫揭示**(clip-path 左→右,句间 600ms);亮场下成立。
- [ ] 三支柱卡 → 正确路由到 loyalty/credibility/achievement。
- [ ] 子页数字 count-up;credibility 合作墙用浅色占位砖、棋盘错峰淡入。
- [ ] `prefers-reduced-motion` 时光扫退化为淡入;全页无暗场;移动端单列。

## Phase 6 · SPECIALTY(索引 + technique + collection)— 最难(《设计书》§2.4 + 《动画要点》§4)
**目标:** 七步钉屏 + 画廊。
**验收清单:**
- [ ] **遮住文字也能一眼认出是"工艺白皮书/解剖图"(§1.7 母题《解剖图》)**:半透明巨步骤号 01–07 + 极致微距 + 左粘工序轴已落实;骨架=左粘右滚分栏/钉屏(§1.6),与 NEWS、LEGACY 明显不同。
- [ ] 桌面 technique 七步**吸顶钉屏**:外层高 section(≈700–800vh)+ 内层 `sticky` 一屏;步骤号 `01→07` 跳变;七图**钟形 opacity 交叉溶解**(相邻溶解,非硬切);文案错位滑动;**不掉帧、不频繁 re-render**。
- [ ] 白底聚光、靠光与浅景深做戏剧感,**无暗场**。
- [ ] 细节三连进入 `scale 1.1→1.0` + 微旋转(±1.5°)。
- [ ] collection 画廊:筛选 chips 用 **FLIP** 重排;点开 lightbox 从原位放大(shared layout)。
- [ ] **移动端 technique 不钉屏**:七张全幅卡片依次堆叠揭示;collection 纵向 2 列 + lightbox;iOS Safari 实测无抖动。

## Phase 7 · NEWS(《设计书》§2.5)
**验收清单:**
- [ ] **遮住文字也能一眼认出是"新闻/刊物版"(§1.7 母题)**:页顶**报头 `NEWS` + 规则线**已实现;每卡带**栏目标签 + 日期**;建议有**滚动 ticker**;网格比别页更密、左对齐。这些元件不出现在别页。
- [ ] **版式骨架 = 杂志式网格 + 顶部筛选 chips、高密度(§1.6)**,是全站最"可扫读"的一页,与其他页一眼可分。
- [ ] COMING SOON 标签**微光周期扫过**(2.5s);featured 用**象牙白柔雾半隐**(非暗场),hover 柔雾轻微淡开;ticker 横向滚动可 hover 暂停;规则线入场"画开"。
- [ ] 新闻格卡片错峰揭示;hover **抬升+zoom+投影**;分类 chips FLIP、当前 chip 酒红下划线;元信息晚 150ms 淡入。
- [ ] 移动端单列、chips 横向可滑;全亮场。

## Phase 8 · GOLF(《设计书》§2.6 + 《动画要点》§7)
**目标:** 高调亮场产品页 + "配置器"互动。
**验收清单:**
- [ ] **遮住文字也能一眼认出是"产品定制台"(§1.7 母题《配置台》)**:悬浮产品 + 杆头/杆色选择器卡组 + 规格示意线已落实;骨架=不对称叠图+选项卡组(§1.6),带交互玩味,与其他页明显不同。
- [ ] 全页**白/象牙亮场,无黑底**;hero 两支手镯漂浮(±8px,相位错开)+ 柔和长投影伸缩 + 轻视差。
- [ ] S3 点选杆头 → S1/S2 hero 图**交叉溶解切换**;所选项白底砖细边框 + 轻微下沉当前态。S4 颜色卡(hover 放大,可选切换握把色)。
- [ ] S2 `golf_hero_2` 随滚动从右推入;刻字区左侧细线逐条画出、右侧两图上/下滑入叠压。
- [ ] S6 实物/生活方式 Ken-Burns(仅桌面);收束句最后淡入。
- [ ] 移动端:hero 在上,杆头/颜色横向 snap carousel,点选仍切 hero;刻字改上下堆叠;关 Ken-Burns/视差。

## Phase 9 · 详情页与子页(《设计书》§2.7)
**目标:** 列表点进去的详情/子页 + 联系页 + 系统页。**核心:每个详情页继承所属板块母题,不退化成通用文章模板。**
**做法:**
- **NEWS 详情 `/news/[slug]`**(§2.7.1):刊物内页气质——规则线版头 + 栏目/日期 + 单栏窄版心正文(≤720px)+ 引用块酒红竖线 + 文末 CTA「문의하기」+ 相关报道 3 卡 +(可选)阅读进度条。
- **COLLECTION 详情 `/specialty/collection/[slug]`**(§2.7.2):珠宝产品页——左图廊(主图+缩略切换)/ 右 sticky 信息面板(规格键值表)+ 细节微距条 + 回 technique 链接 + CTA「맞춤 제작 문의」+ 相关作品。
- **CHRONICLE 里程碑**(§2.7.3):默认**时间轴就地展开**(accordion/弹层);内容够多再升级独立 `/chronicle/[year]`(年份巨字 + FIRST 章 + 前/后年导航)。
- **GOLF 咨询 `/golf/inquiry`**(§2.7.4):带配置(杆头/杆色/刻字)进入 → 配置摘要 + 咨询表单(B2B 选项)→ 成功态。**仅提交咨询,不收卡号/账号/支付。**
- **联系页 `/contact`**(§2.7.5):左咨询表单(문의 유형:임관/우승/맞춤/기타)/ 右直接联系信息 +(可选)FAQ 手风琴。所有详情页非 GOLF 的 CTA 落到这里。
- **系统页**(§2.7.6):404 / 加载态 / 空态,保持亮调与品牌气质。
- 统一"返回列表/面包屑"入口;文末 CTA 统一酒红点睛风格。

**验收清单:**
- [ ] **从 NEWS 点一条 → 详情页明显是"刊物内页"**(规则线版头、栏目/日期、窄版心),非通用博客模板。
- [ ] **从 COLLECTION 点一枚 → 详情页是"珠宝产品页"**(图廊 + sticky 规格面板 + 微距条);切换缩略图主图交叉溶解。
- [ ] CHRONICLE 里程碑可就地展开(或独立页);保留年份锚点/FIRST 气质;有前后翻或回轴入口。
- [ ] GOLF「이 구성으로 문의하기」带着所选配置进入 `/golf/inquiry`;表单提交后成功态;**全程无支付/无卡号字段**。
- [ ] `/contact` 表单 + 直接联系信息齐全;各详情页 CTA 正确落到 `/contact` 或 `/golf/inquiry`。
- [ ] 404/加载/空态为亮调品牌化页面,非默认丑页。
- [ ] 详情页全部双语、亮调、AA、缺图占位、移动端单栏可读。
- [ ] **表单仅提交咨询**:不收集银行卡/证件号;提交失败有兜底联系方式。

---

## Phase 10 · 打磨与全局验收(《设计书》§3.1)
**做法:** 无障碍、性能、SEO、跨浏览器与真机、reduced-motion 全量过、README。
**验收清单:**
- [ ] 所有图有双语 `alt`;正文对比度过 WCAG AA;菜单/语言/lightbox/GOLF 选择器键盘可达。
- [ ] Lighthouse:性能 ≥90、无障碍 ≥95;首屏 hero 图 + 展示字体 `preload`;其余懒加载;输出 webp/avif。
- [ ] SEO:逐页双语 `title`/`meta` + `hreflang` ko/en;OG 图用 `home_hero.png`;**详情页用各自标题/图做动态 meta + OG**。
- [ ] 真机:iOS Safari + 低端安卓,七步=堆叠、时间轴=分段点亮、无 sticky 抖动,滚动 ~60fps。
- [ ] 开 `prefers-reduced-motion`:全部退为静态/瞬时,信息无缺失。
- [ ] README:如何加图(`/public/images/` 文件名表)、如何改文案(`messages/*.json`)、如何加新闻/作品条目、如何填 OH/VULCAN 网址与真实数字。

---

## E. 最终交付前总闸(全绿才算完成)
- [ ] **全站零黑色/近黑背景**;只用 5 个色 + 4 字体。
- [ ] **「遮字测试」:把六页 hero+首屏各截一张,遮住全部文字,旁人仍能逐一说出板块名(§1.6 骨架 + §1.7 母题)。** 无两页共用布局原型,标识元素与母题元件均无跨页复用。尤其 NEWS 遮字后仍明显是"新闻/刊物版"。
- [ ] **详情页继承母题(§2.7):** NEWS 详情=刊物内页 / COLLECTION 详情=珠宝产品页 / CHRONICLE=档案卷宗 / GOLF 咨询=配置台;不退化成通用文章模板。所有表单仅提交咨询、无支付/卡号字段。
- [ ] 四个全局动作 + 各页招牌动画(逐词 / 时间轴描线 / 光扫文字 / 七步钉屏 / COMING SOON 微光 / GOLF 配置器)桌面正常、移动端按《动画要点》§8 降级。
- [ ] KO/EN 双语全站可切;缺图占位不塌;`prefers-reduced-motion` 全量退化。
- [ ] `build` 通过、Lighthouse 达标、真机无抖、README 完整。
- [ ] 所有"真实内容缺口"(数字/年份/文案/外链)以占位呈现且在 README 列明。

> 记住:**一次一个阶段、验收全绿再推进、亮调到底、每页骨架不同、有疑问先问。**
