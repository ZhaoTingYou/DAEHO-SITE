# DAEHO 网站内嵌实时咨询设计

日期：2026-09-01  
状态：设计已确认，等待最终文档审阅  
范围：将当前跳转 Telegram 私聊的咨询入口改为无需登录的网站内嵌聊天窗；Telegram 仅作为团队回复后台

## 1. 背景

当前网站右下角的实时咨询入口会打开 Telegram Bot 私聊。现有后端已经具备 Telegram Bot 配置、Webhook、每个客户一个 Forum Topic、CMS 会话管理、`/close` 关闭及异常恢复能力。

新的目标是让客户完全留在 DAEHO 网站内完成咨询：客户不需要 Telegram 账号、不需要安装 Telegram，也不需要注册网站账号。Telegram Bot 继续存在，但只负责把网站访客消息送入内部群组话题，并把团队回复送回网站聊天窗。

本改动是一个新的匿名访客会话子系统，不只是修改按钮链接。

## 2. 已确认的产品决策

- 客户无需登录，以安全匿名浏览器凭证识别。
- 同一浏览器可以恢复最近 30 天内的咨询；换设备或清除浏览器数据后视为新访客。
- 联系方式只用于业务联系，不能作为聊天记录访问凭证。
- 网页聊天第一版只支持文字，不支持图片、PDF 或其他附件。
- 页面打开时实时接收团队回复；页面关闭后不发送浏览器推送、短信或邮件，下次访问网站时显示未读消息。
- 每个咨询对应一个 Telegram Forum Topic。
- 同一访客的未关闭咨询继续使用原话题；关闭后发起新咨询时创建新话题。
- Telegram 话题中的普通消息发送给客户；`/note 内容` 仅作为内部备注；`/close` 结束咨询。
- 客户页面显示该匿名 Cookie 所拥有会话的初始咨询、客户追加内容、系统状态和 DAEHO 团队回复。客户内容使用右侧气泡；姓名与联系方式不渲染为聊天消息。
- 采用 HTTP POST 发送消息、Server-Sent Events（SSE）实时接收消息，并提供短轮询恢复接口。
- 不引入 Vercel、Redis、第三方聊天服务、短信、邮件或付费验证码服务。

## 3. 目标与非目标

### 3.1 目标

1. 点击网站入口后，在当前页面打开独立聊天窗。
2. 客户填写同意、姓名、联系方式和初始咨询内容后创建 CMS 问询及 Telegram 专属话题。
3. 团队在话题内正常输入即可回复正确客户，多人并发时不会串线。
4. 打开网页时，新团队回复近实时显示；刷新或重开网页后恢复记录和未读状态。
5. 保护匿名记录，无法通过可猜测的 ID、姓名或联系方式读取他人消息。
6. Telegram 或网络异常时可恢复，不重复创建问询、话题或消息。

### 3.2 非目标

- 网站账户体系或客户登录。
- 跨设备恢复聊天。
- 浏览器推送、短信或邮件通知。
- 图片、文件、语音、视频消息。
- 在线客服排班、在线状态或预计等待时间。
- 自动机器人回答、AI 客服或工单分配。
- 向客户展示 Telegram 群、话题、员工 Telegram 身份或内部备注。

## 4. 方案比较

### 4.1 推荐：HTTP 发送＋SSE 接收

客户消息使用普通 HTTPS POST；团队回复通过 SSE 推送到当前打开的网页。SSE 断线时使用 `Last-Event-ID` 恢复，连续失败时退回短轮询。

该方案复用现有 Spring、PostgreSQL、Nginx 和 AWS 部署，适合服务器到浏览器单向推送，不需要增加基础设施。

### 4.2 未采用：WebSocket

WebSocket 可以双向实时通信，但需要额外处理连接心跳、双向协议、代理超时和连接恢复。当前客户发送本身适合普通 POST，使用 WebSocket 会增加无必要的复杂度。

### 4.3 未采用：仅轮询

仅轮询容易实现，但回复延迟更高，并会在无新消息时持续产生请求。它保留为 SSE 不可用时的兼容恢复方式，而不是主通道。

## 5. 系统架构

```text
匿名浏览器 Cookie
        │
        ├── POST 表单/消息 ──────────────┐
        │                                ▼
网站内嵌聊天窗 ←── SSE/轮询 ── Spring CMS API ── PostgreSQL
                                         │
                                         ├── 创建 CMS 问询
                                         ├── 创建/写入 Telegram Topic
                                         └── Telegram Webhook 接收团队回复
```

Next.js 负责渲染入口和聊天 UI。公开聊天 API 由 Nginx 以明确的精确路径转发至 Spring CMS。Spring 负责匿名身份、会话、消息、Telegram 投递、SSE 事件和安全限制。PostgreSQL 是会话及投递状态的唯一事实来源。

Telegram Bot 不再作为客户入口。已知 Bot 私聊收到 `/start` 时应返回一条固定说明和网站咨询链接，不再创建新的 Bot 私聊咨询。历史 Telegram 私聊会话保留在 CMS 中，可继续关闭或审计，但网站不会再暴露 Bot 链接。

## 6. 匿名身份与访问控制

### 6.1 匿名凭证

- 首次打开聊天窗时，后端生成至少 256 位安全随机凭证。
- 原始凭证只写入 `Secure`、`HttpOnly`、`SameSite=Lax` Cookie。
- 数据库只保存带服务器密钥的凭证哈希，不保存原始凭证。
- Cookie 路径限制到实时咨询公开 API；生产环境仅通过 HTTPS 发送。
- 有效期按最后一条客户消息、团队回复或关闭事件滚动 30 天；单纯打开页面、读取历史或 SSE 心跳不延长有效期。超过有效期后旧凭证失效并创建新访客身份。
- 服务端同时校验 `Origin`/`Referer` 为 DAEHO 正式域名，降低跨站请求风险。

### 6.2 访问规则

- 公开 API 不接受对话 ID 作为独立授权依据；每次访问都必须由 Cookie 解析到访客，再验证对话归属。
- 姓名、手机号、邮箱或咨询编号不能用于恢复记录。
- API 返回中不包含 Telegram chat ID、topic thread ID、Telegram message ID、内部恢复状态或员工身份。
- 客户消息为投递、审计和同一匿名 Cookie 的 30 天历史恢复保存在数据库。只有通过 Cookie 归属验证的历史接口可以返回客户正文；SSE、CMS 列表和公开配置不返回客户正文。

## 7. 数据模型

为避免破坏已上线的 Telegram 私聊会话，新增独立网站访客表，并让团队 Webhook 同时兼容新旧话题映射。

### 7.1 `cms_web_live_chat_visitors`

- `id`：UUID 主键。
- `token_hash`：匿名凭证哈希，唯一。
- `expires_at`：访客访问凭证到期时间。
- `last_seen_at`：最后访问时间。
- `created_at`、`updated_at`。

### 7.2 `cms_web_live_chat_conversations`

- `id`：UUID 主键，同时作为 CMS 问询幂等来源 ID。
- `visitor_id`：归属匿名访客。
- `locale`：`ko` 或 `en`。
- `customer_name`、`customer_contact`、`inquiry_content`。
- `consent_version`、`consented_at`。
- `state`：`opening`、`active`、`closed`、`needs_attention`。
- `inquiry_id`：CMS 问询记录 ID。
- `topic_thread_id`、`root_message_id`：Telegram 团队话题映射。
- `configuration_generation`：绑定创建时的 Bot 配置代次，防止配置切换后串线。
- `last_read_team_message_id`：访客已读位置。
- `delivery_issue_code` 及恢复所需字段。
- `created_at`、`updated_at`、`closed_at`。

约束：每个访客在同一配置代次最多存在一个未关闭咨询。关闭后允许创建新咨询。

### 7.3 `cms_web_live_chat_messages`

- `id`：单调递增消息 ID，可作为 SSE event ID。
- `conversation_id`。
- `direction`：`visitor`、`team`、`system`。
- `body`：纯文字消息。
- `delivery_state`：`pending`、`delivered`、`needs_attention`。
- `client_message_key`：客户发送幂等键。
- `telegram_message_id`：团队回复或群内投递的去重来源。
- `is_initial`：标记由初始咨询内容生成的唯一首条客户消息。
- `created_at`、`delivered_at`。

同一对话的 `client_message_key` 唯一；同一 Topic 的 `telegram_message_id` 唯一；每个对话至多一条 `is_initial = true` 消息，并由局部唯一索引强制保证。

### 7.4 频率限制记录

使用 PostgreSQL 保存短时计数桶，键为服务器加盐后的 IP 哈希与访客 ID，不保存原始 IP。定期清理过期桶，不引入 Redis。

## 8. 公开 API

所有响应使用统一错误结构，不返回堆栈、数据库 ID 映射或凭证细节。

### 8.1 会话状态

`GET /api/live-chat/session`

- 没有 Cookie 时创建匿名访客并设置 Cookie。
- 返回当前未关闭咨询、最近 30 天可见历史摘要、未读数量和功能可用状态。

### 8.2 创建咨询

`POST /api/live-chat/conversations`

输入：语言、姓名、联系方式、初始内容、同意版本、隐藏防刷字段、客户端幂等键。  
行为：验证及限流后，以数据库状态机创建对话、CMS 问询和 Telegram Topic。相同幂等键重试返回同一结果。

如果该访客已有 active/opening 会话，返回该会话而不是创建新话题。

### 8.3 追加客户消息

`POST /api/live-chat/conversations/current/messages`

输入：文字和客户端幂等键。  
行为：保存后发送至当前 Telegram Topic。明确成功后从服务端权威历史加载并显示右侧客户气泡与“已发送”；`in_progress` 或结果不确定时保留同一草稿和幂等键，不误报成功且允许安全重试。

### 8.4 读取消息

`GET /api/live-chat/conversations/current/messages?after=<id>`

作为初次加载、刷新恢复和 SSE 备用轮询接口。在匿名 Cookie 归属验证后返回已投递的 `visitor`、`system` 与 `team` 消息。初始咨询内容是第一条 `visitor` 消息；姓名和联系方式不进入消息 DTO。

### 8.5 实时事件

`GET /api/live-chat/conversations/current/events`

- `Content-Type: text/event-stream`。
- 支持 `Last-Event-ID`，从数据库补发错过的团队消息。
- SSE 只发送 `team` 与 `system` 持久事件，绝不回显 `visitor` 行。
- 发送轻量心跳以防代理关闭空闲连接。
- 事件只包含消息 ID、正文、时间、会话状态和未读变化。

### 8.6 已读

`POST /api/live-chat/conversations/current/read`

更新已读位置。多个标签页重复提交必须幂等。

## 9. Telegram 团队话题行为

### 9.1 新咨询

创建 Topic 后发送固定卡片：

```text
🔔 새 실시간 상담

이름: {姓名}
연락처: {联系方式}
문의 내용:
{初始咨询内容}
```

Topic 名称保持简短，包含 `문의`、客户姓名及必要的区分信息，但不放完整联系方式。

### 9.2 客户追加消息

后续网页消息以明确前缀发送到同一 Topic：

```text
고객 추가 메시지

{内容}
```

### 9.3 团队回复与命令

- 普通文字：保存为 `team` 消息并通过 SSE/历史接口显示给客户。
- `/note 内容`：Webhook 识别后不写入客户可见消息；原消息留在 Telegram Topic 供团队查看。
- `/close` 或 `/close@Daeho_Service_bot`：原子关闭数据库会话、更新网页状态并关闭 Forum Topic，不转发命令文本。
- Telegram 原生“关闭话题”服务消息：同步关闭数据库会话，作为团队未使用 `/close` 时的保护。
- Bot 自身消息、其他 Topic、General 话题和未映射 Topic 全部忽略。

客户侧所有团队回复统一显示发送者为 `DAEHO 상담팀`，不显示具体 Telegram 成员信息。

## 10. 会话生命周期

```text
无会话
  │ 提交表单
  ▼
opening ──成功创建问询和 Topic──▶ active
  │                                  │
  │ 投递不确定                         │ /close、CMS 关闭或 Topic 关闭
  ▼                                  ▼
needs_attention ◀──恢复操作─────── closed
                                      │
                                      └── 新咨询 → 新 opening / 新 Topic
```

- 表单在浏览器中仅作为草稿；服务端接受后才进入 `opening`。
- `opening` 过程的每个外部动作都有数据库预留状态，避免网络超时后重复创建 Topic。
- `active` 会话接收客户追加消息和团队回复。
- `closed` 保留该访客自己的客户、系统与团队历史至访客凭证失效，输入框禁用，并提供“开始新咨询”。
- `needs_attention` 在 CMS 显示恢复动作；客户看到中性的“已收到，团队正在处理”状态，不暴露内部错误。
- 后台清理任务将超过 30 天没有消息或状态事件的活动咨询标记为 `closed`，并尽力关闭 Telegram Topic，避免产生无法再被访客访问的孤立活动话题。CMS 问询记录不随匿名凭证过期而删除。

## 11. 界面设计

### 11.1 入口

采用已确认的 B 方案：圆形聊天按钮旁固定小标签。

韩文：

```text
실시간 상담
로그인 없이 바로 문의
```

英文：

```text
Live consultation
No sign-in required
```

- 删除公开入口中的 `Telegram` 字样和 Telegram 纸飞机品牌图标。
- 使用中性的聊天气泡图标与 DAEHO 深蓝、金色视觉。
- 不显示绿色 Online 文案，避免在无人值守时承诺即时人工在线；可以使用非语义性的品牌色状态点。
- 有未读团队回复时显示数字角标。

### 11.2 展开动效

- Hover 保持固定尺寸，只 `translateY(-2px)`、约 `scale(1.03)`、增强阴影并轻转装饰环。
- 点击后以右下角为变换原点，在约 440ms 内从入口连续扩展为聊天窗。
- 外壳先展开，内容约延迟 120ms 淡入，避免压缩文字。
- 关闭使用约 300ms 反向动画并将焦点还给入口。
- 手机端从底部展开为全屏或近全屏层，不做横向拉伸。
- `prefers-reduced-motion` 下取消形变，只保留短淡入淡出。

### 11.3 聊天状态

1. **开始咨询**：姓名、联系方式、咨询内容、同意复选框。
2. **等待回复**：确认已经接收，提示同一浏览器可在 30 天内查看回复。
3. **实时聊天**：客户消息右对齐、金色，团队回复左对齐、深蓝色；双方气泡按内容收缩，最大宽度约 78%，长文本安全换行，以相反的小圆角提示方向并保持紧凑的垂直节奏。系统状态独立居中显示，不能与任何参与者混淆。界面同时提供输入框和可靠的发送状态反馈。
4. **已结束**：历史只读、输入禁用、“开始新咨询”按钮。

桌面窗体保持在右下角且不覆盖主要导航；手机端遵守安全区、锁定背景滚动并提供明确关闭按钮。支持 Esc、焦点陷阱、ARIA live、新消息可读提示和键盘操作。

## 12. 防刷与安全

- IP 哈希和访客 ID 双维度的短时提交、建会话和发消息限流。
- 隐藏字段、最短合理填写时间、重复内容检测和消息间隔限制。
- 名称、联系方式、初始内容和追加消息使用服务端长度及字符验证。
- 所有输出按纯文本处理并转义，Telegram 文本也不使用不可信 HTML。
- 仅允许 DAEHO 生产来源调用公开写接口；Cookie 配合 Origin 校验防止 CSRF。
- 日志不记录 Cookie、完整联系方式、完整正文或 Bot Token。
- Bot Token 继续由 CMS 加密保存；公开 API 永不返回 Token。
- Nginx 对表单、消息和 SSE 分别设置小请求体限制、无缓冲 SSE、合理连接超时和基础请求速率限制。

## 13. 实时、幂等与异常恢复

- SSE 客户端保存最后事件 ID；重连后从数据库补发。
- SSE 连续失败时每 5 秒轮询一次；恢复后停止轮询。
- 浏览器生成每次发送的随机 `client_message_key`，重复点击或网络重试不会重复投递。
- 客户气泡只由带正整数数据库 ID 的权威历史生成；刷新或重试按 ID 去重，不使用会破坏游标的合成 ID。
- 最高持久游标覆盖所有历史行，但未读数和已读游标只计算 `team` 消息。
- Telegram Webhook 使用 update/message ID 去重。
- 创建 Topic、发送初始卡片、追加客户消息和团队回复都先预留数据库状态，再执行外部调用。
- Telegram 返回明确失败时允许自动或 CMS 手动重试；投递结果不确定时标记 `needs_attention`，禁止自动重复创建 Topic。
- 多标签页共享同一 Cookie；数据库约束保证只有一个活动会话。标签页间可使用 `BroadcastChannel` 同步已读和关闭状态，但正确性不依赖浏览器广播。
- CMS 必须继续提供关闭、重试投递、确认 Topic 不存在后重建等恢复操作。

## 14. CMS 调整

- “实时咨询”配置继续管理独立 Bot Token、目标 Forum 群 Chat ID、连接和启用状态。
- 文案明确该 Bot 是“团队 Telegram 路由 Bot”，客户不需要 Telegram。
- 会话列表区分来源：网站匿名咨询与历史 Telegram Bot 私聊咨询。
- 网站会话显示姓名、联系方式、初始内容、状态、Topic ID、未读团队回复和恢复状态。
- 关闭网站会话时同步关闭 Topic，并使客户网页立即进入已结束状态。
- 不新增公共字段或破坏现有问询公共接口；网站会话仍创建普通 CMS 问询记录。

## 15. 部署与运行成本

- 使用现有 AWS、Spring CMS、Next.js、PostgreSQL 和 Nginx。
- Telegram Bot API、HTTP 和 SSE 不产生独立服务费用。
- 不需要 Vercel、Redis、消息队列、短信或邮件服务。
- 文字消息存储量小；当前咨询规模无需升级服务器。
- Nginx 必须同时在本地 HTTP 配置和生产 HTTPS 配置暴露精确聊天 API 路由，SSE 路由关闭代理缓冲。
- 数据库迁移必须向前兼容 V18 历史会话并支持滚动部署：V19 创建网站咨询表，V20 从 `inquiry_content` 为既有网站会话幂等回填唯一首条客户消息，并为新会话约束至多一条 `is_initial` 消息。Canonical SQLite schema 必须镜像 V20 最终结构和局部唯一索引。

## 16. 测试策略

### 16.1 单元与数据层

- 匿名凭证生成、哈希、过期及归属验证。
- 输入验证、限流、隐藏字段和重复内容检测。
- 会话状态机：创建、活动复用、关闭后新建、过期访客。
- 消息过滤：归属验证后的访客历史 API 返回其自身客户原文，但不返回内部备注或 Telegram 元数据；SSE 仍过滤客户消息。
- `/note`、`/close`、原生 Topic 关闭和普通团队回复路由。
- SSE last-event 恢复、未读计算和消息幂等。
- 并发建会话、重复 POST、重复 Telegram update 及投递不确定恢复。

### 16.2 API 与集成

- 无 Cookie 首次访问、Cookie 续期、伪造 ID、跨访客访问拒绝。
- V20 为既有网站会话从 `inquiry_content` 回填且仅回填一条初始客户消息，新会话以创建请求幂等键插入一条初始客户消息。
- 创建问询与 Topic 的完整事务补偿。
- Telegram 团队回复写入数据库后由 SSE 和轮询读取。
- Bot 配置切换时旧代次不能接收新回复。
- Nginx SSE 无缓冲、Webhook Secret Header 透传和请求体限制。

### 16.3 前端

- 入口固定标签、Hover 无宽度跳变、点击展开和关闭收回。
- 1440px、1024px、768px、375px 布局。
- 表单、等待、活动、未读、已结束、发送失败和后端不可用状态。
- 同一 Cookie 的初始咨询与后续客户消息均右对齐显示；明确发送成功后仅显示一条权威气泡，硬刷新后仍各保留一条，姓名与联系方式不作为气泡。
- 客户气泡不增加团队未读数，也不进入 SSE；团队气泡左对齐，系统状态使用中性布局。
- 双方气泡按内容收缩、最大宽度约 78%、长词可断行，使用左右相反的小角提示与紧凑间距；系统事件保持居中且不使用参与者角标。
- 页面刷新、关闭重开、多个标签页、SSE 断线及轮询回退。
- 键盘、焦点、屏幕阅读器和减少动态效果。

### 16.4 上线验收

1. 使用无登录浏览器提交测试咨询。
2. Telegram 自动创建唯一 Topic 并显示正确卡片。
3. 团队普通回复在打开的网页近实时出现。
4. 初始咨询与一条后续客户消息在右侧各显示一次，硬刷新后仍完整且不重复，客户消息不产生团队未读或 SSE 事件。
5. `/note` 不出现在网页。
6. 关闭网页后团队回复，再打开网站显示未读角标及回复。
7. `/close` 后网页进入只读结束状态。
8. 同一浏览器开始新咨询时创建新问询和新 Topic。
9. 第二个匿名浏览器不能读取第一个浏览器的记录。
10. V19/V20、canonical SQLite schema、线上日志、Webhook、SSE 和服务健康检查通过。

## 17. 验收标准

- 客户不登录、不离开网站即可完成提交、发送和接收文字咨询。
- 入口静止时明确表达“实时咨询、无需登录”，不存在 Hover 突然拉长。
- 多客户、多标签页和重试情况下不串线、不重复创建 Topic 或重复发送消息。
- 客户页面永远不泄露其他会话、内部备注或 Telegram 身份信息。
- 同一浏览器 30 天内可恢复，过期或换设备不能恢复。
- 团队继续只在 Telegram 独立 Topic 中工作，普通回复、`/note` 和 `/close` 行为明确。
- 功能在现有 AWS 架构上运行，无新增固定第三方费用。
