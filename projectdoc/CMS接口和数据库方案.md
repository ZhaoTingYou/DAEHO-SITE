# DAEHO CMS 接口和数据库方案

## 当前定位

CMS 先作为公司内部内容后台的数据底座，不处理草稿、审核流和复杂页面搭建器。当前阶段重点是接口和数据库：

- 双语言内容：`ko`、`en`
- 页面内容块：先整体存 JSON，后续前端逐步接入
- 新闻管理
- Collection/作品管理
- 媒体库：当前写入 `public/images`，预留对象存储字段
- Contact/Golf 询盘入库
- 询盘邮件通知：SMTP 配置后发送，未配置时照常入库并记录跳过事件

## 本地数据库

默认 SQLite 文件：

```bash
data/cms.sqlite
```

可通过环境变量覆盖：

```bash
CMS_DB_PATH=/absolute/path/cms.sqlite
```

初始化/重建基础内容：

```bash
npm run cms:init
```

初始化脚本会从 `messages/ko.json`、`messages/en.json` 和 `public/images` 导入现有内容。

导出当前 CMS 数据备份：

```bash
npm run cms:export
```

默认输出到：

```text
artifacts/cms-exports/daeho-cms-export-{timestamp}.json
```

也可以输出到 stdout 或指定路径：

```bash
npm run cms:export -- --stdout
npm run cms:export -- --output=/absolute/path/daeho-cms-export.json
```

恢复 CMS 数据备份：

```bash
npm run cms:import -- /absolute/path/daeho-cms-export.json
```

默认只做 dry-run，会校验文件结构并显示每张表的导入行数，不会修改数据库。确认后再执行覆盖恢复：

```bash
npm run cms:import -- /absolute/path/daeho-cms-export.json --replace
```

`--replace` 会清空并重写所有 CMS 表；如果目标数据库已经存在，脚本会先自动生成：

```text
data/cms.sqlite.pre-import-{timestamp}.bak
```

如需跳过自动备份：

```bash
npm run cms:import -- /absolute/path/daeho-cms-export.json --replace --no-backup
```

## 环境变量

可从模板开始：

```bash
cp .env.example .env.local
```

生产环境内部管理接口必须配置：

```bash
CMS_ADMIN_API_KEY=your-admin-key
```

后台页面登录建议配置：

```bash
CMS_ADMIN_PASSWORD=your-admin-password
CMS_ADMIN_SESSION_SECRET=long-random-session-secret
```

如果没有单独配置 `CMS_ADMIN_PASSWORD`，后台页面会回退使用 `CMS_ADMIN_API_KEY`。本地开发环境两者都没有时，临时密码为 `admin`。

邮件通知需要配置：

```bash
CMS_NOTIFY_TO=admin@example.com
SMTP_FROM=no-reply@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
```

本地开发如果没有 `CMS_ADMIN_API_KEY`，管理接口默认放行，方便调试。

## 公开接口

### 提交 Contact 询盘

```http
POST /api/inquiries/contact
```

```json
{
  "locale": "ko",
  "name": "Name",
  "organization": "Company",
  "contact": "010-0000-0000",
  "type": "appointment",
  "message": "Message",
  "pagePath": "/ko/contact"
}
```

### 提交 Golf 询盘

```http
POST /api/inquiries/golf
```

```json
{
  "locale": "ko",
  "name": "Name",
  "contact": "010-0000-0000",
  "quantity": 10,
  "due": "2026-08-01",
  "team": "Team",
  "use": "Tournament",
  "message": "Message",
  "selectedHead": "Wood",
  "selectedShaft": "Navy",
  "engravingSample": "JUDY KIM",
  "pagePath": "/ko/golf/inquiry"
}
```

### 读取公开 CMS 内容

```http
GET /api/cms/pages/{pageKey}?locale=ko
GET /api/cms/news?locale=ko
GET /api/cms/news/{slug}?locale=ko
GET /api/cms/collections?locale=ko
GET /api/cms/collections/{slug}?locale=ko
```

## 管理接口

管理接口支持两种鉴权方式：

```http
Authorization: Bearer {CMS_ADMIN_API_KEY}
```

或：

```http
x-admin-api-key: {CMS_ADMIN_API_KEY}
```

### 页面内容

```http
GET /api/admin/pages
GET /api/admin/pages/{pageKey}
PUT /api/admin/pages/{pageKey}
```

### 新闻

```http
GET /api/admin/news
POST /api/admin/news
GET /api/admin/news/{idOrSlug}
PUT /api/admin/news/{idOrSlug}
DELETE /api/admin/news/{idOrSlug}
```

### Collection/作品

```http
GET /api/admin/collections
POST /api/admin/collections
GET /api/admin/collections/{idOrSlug}
PUT /api/admin/collections/{idOrSlug}
DELETE /api/admin/collections/{idOrSlug}
```

### 媒体库

```http
GET /api/admin/media
POST /api/admin/media
GET /api/admin/media/{id}
PATCH /api/admin/media/{id}
DELETE /api/admin/media/{id}
```

`POST /api/admin/media` 支持两种方式：

- `multipart/form-data` 上传文件，字段名为 `file`
- `application/json` 登记已有媒体

`PATCH /api/admin/media/{id}` 当前用于更新 `altKo`、`altEn`。`DELETE /api/admin/media/{id}` 当前只移除媒体库记录，不删除 `public/images` 中的物理文件，避免误删前台仍在使用的资源。

### 询盘

```http
GET /api/admin/inquiries
GET /api/admin/inquiries?source=contact
GET /api/admin/inquiries?status=new
GET /api/admin/inquiries/{id}
PATCH /api/admin/inquiries/{id}
```

更新状态：

```json
{
  "status": "contacted"
}
```

可用状态：

- `new`
- `contacted`
- `in_progress`
- `done`
- `spam`

### 数据导出

```http
GET /api/admin/export
```

返回并下载完整 JSON 备份，包含：

- 页面内容
- 新闻和双语翻译
- Collection/作品和双语翻译
- 媒体库记录
- Contact/Golf 询盘
- 邮件发送事件

接口需要 `CMS_ADMIN_API_KEY`。后台页面另有基于登录 session 的下载入口，不会把 API key 暴露给浏览器。

## 后台页面

后台入口：

```http
GET /admin/login
GET /admin
```

当前页面：

- `/admin`：数据总览
- `/admin/inquiries`：Contact/Golf 询盘列表与状态更新
- `/admin/inquiries/{id}`：询盘详情、配置 JSON、请求元数据、邮件事件、重新发送通知
- `/admin/news`：新闻列表
- `/admin/news/new`：新增新闻
- `/admin/news/{id}`：编辑新闻
- `/admin/collections`：作品/Collection 列表
- `/admin/collections/new`：新增作品
- `/admin/collections/{id}`：编辑作品
- `/admin/media`：媒体库与图片上传
- `/admin/pages`：页面内容 JSON 列表
- `/admin/pages/{pageKey}`：页面双语 JSON 内容编辑
- `/admin/export`：CMS JSON 备份下载

后台页面使用 httpOnly cookie session，不会把 `CMS_ADMIN_API_KEY` 暴露给浏览器。

媒体库页面支持：

- 上传图片到 `public/images`
- 编辑韩文/英文 alt 文案
- 移除媒体库记录

询盘邮件事件会显示：

- `sent`：SMTP 已发送
- `skipped`：SMTP 未配置，询盘仍已入库
- `failed`：SMTP 调用失败，错误信息会保存在事件中

## 前台 CMS 接入状态

当前已经接入 CMS 数据并保留 JSON fallback 的前台区域：

- 首页 `/[locale]`：Latest News 弹窗卡片
- News 列表 `/[locale]/news`
- News 详情 `/[locale]/news/{slug}`
- Collection 分类入口 `/[locale]/specialty/collection`
- Collection 分类页 `/[locale]/specialty/collection/champion|appointment|bespoke`
- Collection 详情 `/[locale]/specialty/collection/{slug}`
- Sitemap `/sitemap.xml`：优先使用 CMS slug，CMS 为空时回退 JSON

适配层：

```text
lib/cms/public-content.ts
```

这些页面设置为动态渲染，以便后台内容更新后前台能读取数据库当前内容。
