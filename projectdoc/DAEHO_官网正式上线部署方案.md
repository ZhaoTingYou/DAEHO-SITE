# DAEHO 官网正式上线部署方案

更新日期：2026-06-30

本文档用于 DAEHO 官网正式上线准备。目标读者包括公司决策人员、采购人员和负责部署的技术人员。非技术人员可以根据“需要准备的账号”和“推荐购买”确认要买什么；技术人员可以根据“部署流程”和“验收清单”执行上线。

## 默认选择

| 项目 | 默认方案 |
| --- | --- |
| 主域名 | `www.<公司域名>.co.kr` |
| 辅助域名 | `<公司域名>.com`，301 跳转到主域名 |
| DNS | Cloudflare Free |
| 服务器 | AWS Lightsail，韩国首尔区域优先 |
| Lightsail 型号 | Linux/Unix，General Purpose，4GB RAM / 2 vCPU / 80GB SSD / 4TB transfer，带 public IPv4 |
| 邮箱 | NAVER WORKS Standard 起步 |
| SSL | Let's Encrypt 免费证书 |
| 部署方式 | Docker Compose |
| 媒体存储 | AWS Lightsail Object Storage，bucket: `daeho-prod-media`，region: Seoul / `ap-northeast-2` |
| 备份 | 每日 PostgreSQL dump + Lightsail snapshot；对象存储保留媒体文件，后续可增加异地归档 |

## 推荐架构

正式上线推荐使用：

Cloudflare DNS + AWS Lightsail + Docker Compose + Nginx HTTPS + Next.js + Spring Boot CMS + PostgreSQL + Lightsail Object Storage + backup

架构说明：

1. 用户访问 `https://www.<公司域名>.co.kr`。
2. 域名 DNS 托管在 Cloudflare。
3. Cloudflare 将流量解析到 AWS Lightsail 静态 IP。
4. Lightsail 上运行 Docker Compose。
5. Nginx 负责 HTTPS 和反向代理；本地 `/uploads` 仅作为兼容/回退路径。
6. Next.js 提供官网页面、`/admin` CMS 后台 UI 和 BFF API。
7. Spring Boot CMS 负责 CMS 数据、公开内容 API、询盘、媒体上传、导入导出和状态检查。
8. PostgreSQL 保存 CMS 数据。
9. Lightsail Object Storage 保存后台上传图片，公开图片地址使用 `https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com/...`。
10. backup 容器每天生成数据库 dump；Lightsail snapshot 负责服务器级恢复。

## Amazon Lightsail 应该选择什么型号

正式上线首选：

AWS Lightsail Instance，不要选 Containers，不要选 Windows，不要单独购买 Managed Database。

创建时建议选择：

| 配置项 | 选择 |
| --- | --- |
| Region | Asia Pacific，Seoul，如果可选 |
| Platform | Linux/Unix |
| Blueprint | OS Only: Ubuntu 24.04 LTS，或最新 Ubuntu LTS |
| Plan 类型 | General Purpose |
| 推荐套餐 | 4GB RAM / 2 vCPU / 80GB SSD / 4TB transfer，public IPv4 |
| 当前官方价格 | public IPv4 套餐约 USD 24/月 |
| 静态 IP | 创建后分配并绑定 Lightsail Static IP |

为什么选 4GB RAM / 2 vCPU：

1. 当前项目会在同一台服务器上同时运行 Nginx、Next.js、Spring Boot、PostgreSQL 和 backup。
2. 2GB RAM 可以跑，但正式站加 CMS 后台、图片上传和构建/重启时余量偏小。
3. 4GB RAM 是成本和稳定性的平衡点，适合作为正式上线第一阶段。
4. 如果后台媒体越来越多、访问量上升、Java 或 PostgreSQL 内存压力明显，再升级到 8GB RAM / 2 vCPU / 160GB SSD。

不要只选 IPv6-only 套餐作为正式站唯一入口。IPv6-only 同规格价格更低，但韩国和海外仍有一部分用户、公司网络、爬虫或第三方服务依赖 IPv4。正式官网应选择带 public IPv4 的套餐。

## 需要准备的账号

| 账号 | 用途 | 谁来准备 |
| --- | --- | --- |
| 域名注册商账号 | 购买 `.co.kr` 和 `.com` 域名 | 公司或负责人 |
| Cloudflare 账号 | DNS、基础 CDN、防护、SSL 辅助 | 技术负责人 |
| AWS 账号 | 创建 Lightsail 服务器、静态 IP、备份存储 | 公司或技术负责人 |
| NAVER WORKS 账号 | 企业邮箱，如 `contact@<公司域名>.co.kr` | 公司行政或负责人 |
| GitHub 账号 | 保存代码、部署版本、协作 | 技术负责人 |
| Google Search Console | Google 收录、sitemap 提交 | 技术负责人 |
| Naver Search Advisor | Naver 收录、sitemap 提交 | 技术负责人 |

建议账号归属：

1. AWS、Cloudflare、域名注册商应使用公司邮箱注册，不要长期绑定个人邮箱。
2. 所有账号开启二步验证。
3. AWS root 账号只做账单和权限管理，日常部署使用单独 IAM 用户。
4. 密码和恢复码保存到公司可控的密码管理工具或加密文档。

## 推荐购买

### 域名

推荐购买两个域名：

1. `<公司域名>.co.kr`：韩国正式主域名。
2. `<公司域名>.com`：国际辅助域名，跳转到 `.co.kr`。

主域名建议使用：

`www.<公司域名>.co.kr`

辅助域名跳转规则：

1. `<公司域名>.co.kr` 跳转到 `www.<公司域名>.co.kr`。
2. `<公司域名>.com` 跳转到 `www.<公司域名>.co.kr`。
3. `www.<公司域名>.com` 跳转到 `www.<公司域名>.co.kr`。

如果理想域名已经被注册，可以考虑：

1. 品牌全称 + 行业词，例如 `<品牌名>jewelry.co.kr`。
2. 品牌全称 + Korea，例如 `<品牌名>korea.com`。
3. 避免太长、难拼、包含连字符过多的域名。

### 服务器

推荐购买：

AWS Lightsail 4GB RAM / 2 vCPU / 80GB SSD / 4TB transfer，Linux/Unix，public IPv4。

暂不推荐一开始购买：

1. Lightsail Managed Database：当前 Docker Compose 已经包含 PostgreSQL，第一阶段成本更低、迁移更简单。
2. Load Balancer：单台服务器阶段暂不需要。
3. Cloudflare Pro：第一阶段 Cloudflare Free 足够。

### 企业邮箱

推荐 NAVER WORKS Standard 起步，因为 Standard 才提供企业邮件和自有域名邮箱能力。

建议创建的邮箱：

1. `contact@<公司域名>.co.kr`
2. `info@<公司域名>.co.kr`
3. `admin@<公司域名>.co.kr`
4. `privacy@<公司域名>.co.kr`

询盘邮件建议发送到：

`contact@<公司域名>.co.kr`

### SSL

使用 Let's Encrypt 免费 SSL 证书。Nginx 配合 Certbot 或 acme.sh 自动续期。

注意：

1. 证书自动续期必须配置定时任务。
2. 续期后 Nginx 需要 reload。
3. 上线验收时必须检查 `https://`、HTTP 到 HTTPS 跳转、证书有效期。

## 预计费用

以下为上线第一阶段预估费用。实际费用以购买当天页面为准。美元折算韩元按 `1 USD ≈ 1,535 KRW` 粗算，汇率会变化。

| 项目 | 推荐方案 | 月成本估算 | 年成本估算 | 说明 |
| --- | --- | ---: | ---: | --- |
| AWS Lightsail 服务器 | 4GB / 2 vCPU，public IPv4 | USD 24，约 KRW 36,800 | USD 288，约 KRW 442,000 | 官网、CMS、PostgreSQL 同机运行 |
| Lightsail snapshot | 约 80GB 以内 | 约 USD 4，约 KRW 6,100 | 约 USD 48，约 KRW 73,700 | 按实际快照占用容量计费 |
| 域名 `.co.kr` | 韩国主域名 | - | 约 KRW 10,000-30,000 | 不同注册商不同 |
| 域名 `.com` | 辅助域名 | - | 约 KRW 15,000-30,000 | 不同注册商不同 |
| Cloudflare DNS | Free | KRW 0 | KRW 0 | 第一阶段足够 |
| Let's Encrypt SSL | 免费 | KRW 0 | KRW 0 | 需要自动续期 |
| NAVER WORKS | Standard | KRW 8,500/人/月，或年约 KRW 7,000/人/月 | 视人数而定 | 需要企业邮箱时推荐 |
| 媒体对象存储 | Lightsail Object Storage 100GB | 以 AWS Lightsail 页面实际价格为准 | 以实际使用量计费 | 保存 CMS 上传图片，避免图片只存在服务器本地 |
| 异地归档 | 后续 S3 Glacier 或其他归档 | USD 1-5 起 | USD 12-60 起 | 需要更严格灾备时再增加 |

推荐上线预算：

1. 服务器 + 基础备份：约 KRW 43,000/月起。
2. 如果 3 个企业邮箱账号使用 NAVER WORKS Standard 月付：约 KRW 25,500/月。
3. 合计第一阶段常规月成本：约 KRW 70,000/月左右，不含域名年费、税费和汇率波动。

如果使用 8GB RAM / 2 vCPU Lightsail：

1. public IPv4 套餐约 USD 44/月。
2. 适合访问量明显增加、后台频繁上传图片、PostgreSQL 数据增长后升级。

## 部署流程

### 1. 买域名

1. 确认公司最终品牌域名。
2. 购买 `.co.kr`。
3. 购买 `.com`。
4. 确认域名注册邮箱属于公司。
5. 保存注册商账号、付款信息、域名到期时间。

### 2. 接入 Cloudflare

1. 创建 Cloudflare 账号。
2. Add site，添加 `.co.kr` 主域名。
3. 选择 Free plan。
4. Cloudflare 会给出两条 nameserver。
5. 到域名注册商后台，把域名 NS 改成 Cloudflare 提供的 nameserver。
6. 等待 DNS 生效。
7. `.com` 域名也接入 Cloudflare，并配置跳转到主域名。

Cloudflare DNS 记录建议：

| Type | Name | Value |
| --- | --- | --- |
| A | `www` | Lightsail Static IP |
| A | `@` | Lightsail Static IP |
| CNAME 或 Redirect Rule | `.com` 相关域名 | 跳转到 `https://www.<公司域名>.co.kr` |

### 3. 创建 AWS Lightsail 服务器

1. 登录 AWS。
2. 进入 Lightsail。
3. 选择 Seoul 区域。
4. 创建 Linux/Unix Ubuntu LTS 实例。
5. 选择 4GB RAM / 2 vCPU / 80GB SSD / 4TB transfer，public IPv4。
6. 创建并绑定 Static IP。
7. 防火墙开放：
   - 22：SSH，仅限管理员 IP 更好。
   - 80：HTTP，用于跳转和证书签发。
   - 443：HTTPS。
8. 不开放 PostgreSQL 5432 到公网。

### 4. 配置服务器基础环境

服务器上安装：

1. Docker
2. Docker Compose plugin
3. Git
4. Certbot 或 acme.sh
5. 基础安全工具，如 UFW、fail2ban

建议安全设置：

1. 禁止密码 SSH，只允许 SSH key。
2. 创建非 root 部署用户。
3. 定期更新系统安全补丁。
4. PostgreSQL 只在 Docker 内网访问。
5. `.env` 权限设置为仅部署用户可读。

### 5. 拉取代码和配置环境变量

在服务器上：

```bash
git clone git@github.com:ZhaoTingYou/DAEHO-SITE.git
cd DAEHO-SITE
cp .env.example .env
```

生产环境至少配置：

```env
NEXT_PUBLIC_SITE_URL=https://www.<公司域名>.co.kr
CMS_BACKEND_URL=http://cms-api:8080
CMS_BACKEND_API_KEY=<long-random-secret>
CMS_ADMIN_PASSWORD=<strong-password>
CMS_ADMIN_SESSION_SECRET=<long-random-secret>

POSTGRES_DB=daeho_cms
POSTGRES_USER=daeho
POSTGRES_PASSWORD=<strong-db-password>

SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/daeho_cms
SPRING_DATASOURCE_USERNAME=daeho
SPRING_DATASOURCE_PASSWORD=<strong-db-password>

CMS_UPLOAD_DIR=/data/uploads
CMS_PUBLIC_UPLOAD_BASE_URL=/uploads
CMS_STORAGE_PROVIDER=s3
CMS_S3_BUCKET=daeho-prod-media
CMS_S3_REGION=ap-northeast-2
CMS_S3_ENDPOINT=
CMS_S3_PUBLIC_BASE_URL=https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com
CMS_S3_ACCESS_KEY_ID=<lightsail-storage-access-key>
CMS_S3_SECRET_ACCESS_KEY=<lightsail-storage-secret-key>

CMS_NOTIFY_TO=contact@<公司域名>.co.kr
SMTP_FROM=contact@<公司域名>.co.kr
SMTP_HOST=<NAVER-WORKS-SMTP-HOST>
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@<公司域名>.co.kr
SMTP_PASS=<mail-app-password-or-smtp-password>
```

### 6. 导入 CMS 数据

上线前从本地导出 CMS：

```bash
npm run cms:export
```

把导出的 JSON 文件上传到服务器，然后执行导入。

建议流程：

1. 冻结本地 CMS 编辑。
2. 本地导出 CMS JSON。
3. 服务器启动 PostgreSQL 和 CMS API。
4. 先 dry-run 导入。
5. 确认 row counts。
6. replace 导入。
7. 再次导出服务器 CMS，确认 row counts 一致。

必须确认：

1. 页面内容存在。
2. 新闻存在。
3. 作品集合存在。
4. 媒体 125 条或最新数量一致。
5. 新上传图片保存到 Lightsail Object Storage。
6. `https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com/...` 图片能访问。

### 7. 启动 Docker Compose

```bash
docker compose up -d --build
docker compose ps
```

检查：

```bash
curl -I http://localhost
curl -I http://localhost/api/admin/status
```

### 8. 配置 HTTPS

推荐方式：

1. Nginx 先用 80 端口启动。
2. Certbot 或 acme.sh 为以下域名签发证书：
   - `www.<公司域名>.co.kr`
   - `<公司域名>.co.kr`
   - `<公司域名>.com`
   - `www.<公司域名>.com`
3. Nginx 配置 443。
4. HTTP 自动跳转 HTTPS。
5. 非主域名全部 301 跳转到 `https://www.<公司域名>.co.kr`。

### 9. 上线验收

上线后检查：

1. `https://www.<公司域名>.co.kr/ko`
2. `https://www.<公司域名>.co.kr/en`
3. `https://www.<公司域名>.co.kr/admin`
4. `https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com/...`
5. `https://www.<公司域名>.co.kr/sitemap.xml`
6. `https://www.<公司域名>.co.kr/robots.txt`

## SEO 收录

### 基础原则

1. Google 和 Naver 收录依赖可访问页面、稳定域名、正确 sitemap、robots 和 canonical，不依赖后端语言。
2. 主域名必须统一，避免 `.co.kr`、`.com`、裸域、`www` 多个版本同时被搜索引擎当成重复站点。
3. 推荐主域名固定为 `https://www.<公司域名>.co.kr`。
4. `.com` 只做 301 跳转，不作为独立收录站。

### robots.txt

上线后打开：

```text
https://www.<公司域名>.co.kr/robots.txt
```

确认：

1. 允许公开页面抓取。
2. 不允许 `/admin` 被抓取。
3. 包含 sitemap 地址。

### sitemap.xml

上线后打开：

```text
https://www.<公司域名>.co.kr/sitemap.xml
```

确认：

1. 包含 `/ko` 和 `/en` 页面。
2. 包含新闻详情。
3. 包含作品详情。
4. URL 全部是正式主域名。

### canonical 域名

确认页面 canonical 使用：

```text
https://www.<公司域名>.co.kr
```

不要出现：

1. localhost
2. Vercel 临时域名
3. 服务器 IP
4. `.com` 辅助域名

### Google Search Console

1. 创建 Google Search Console 账号或使用公司 Google 账号。
2. 添加 Domain property 或 URL prefix property。
3. 推荐用 Cloudflare DNS TXT 记录验证所有权。
4. 提交 sitemap：

```text
https://www.<公司域名>.co.kr/sitemap.xml
```

5. 使用 URL Inspection 检查首页：

```text
https://www.<公司域名>.co.kr/ko
```

### Naver Search Advisor

1. 登录 Naver Search Advisor。
2. 添加网站：

```text
https://www.<公司域名>.co.kr
```

3. 用 HTML 文件或 DNS TXT 验证所有权。
4. 提交 sitemap。
5. 检查 robots.txt。
6. 请求抓取首页和主要页面。

Naver 特别注意：

1. 韩语页面 `/ko` 是主页面。
2. 公司信息、联系方式、地址、隐私负责人等信息要完整。
3. 网站速度和移动端体验会影响搜索质量。

## 验收清单

### 官网

- [ ] `/ko` 可访问，状态 200。
- [ ] `/en` 可访问，状态 200。
- [ ] 移动端 360px、390px、430px 无横向滚动。
- [ ] Header 菜单、语言切换、Footer 链接正常。
- [ ] Archive、Heritage、Making、Creations、News、Golf、Contact 页面都能打开。
- [ ] Terms 和 Privacy 页面内容符合公司实际信息。

### 后台

- [ ] `/admin` 可以登录。
- [ ] `/admin/pages` 可以保存页面内容。
- [ ] `/admin/footer` 可以编辑 Footer。
- [ ] `/admin/media` 可以看到媒体列表。
- [ ] `/admin/news` 可以编辑新闻。
- [ ] `/admin/collections` 可以编辑作品。
- [ ] Admin session cookie 使用 `daeho_admin_session`。

### 图片上传

- [ ] 后台能上传 JPG、PNG、WebP。
- [ ] SVG 被拒绝。
- [ ] 超过 20MB 的单张图片文件被拒绝。
- [ ] 上传后对象存储 URL 可以访问。
- [ ] 重启容器后图片仍存在。
- [ ] `CMS_S3_ACCESS_KEY_ID` 和 `CMS_S3_SECRET_ACCESS_KEY` 没有提交到 GitHub。

### 询盘邮件

- [ ] Contact 表单可以提交。
- [ ] Golf inquiry 表单可以提交。
- [ ] 重复提交会被限制。
- [ ] 垃圾提交 honeypot 生效。
- [ ] CMS 后台能看到询盘。
- [ ] 公司邮箱能收到通知邮件。
- [ ] SMTP 密码没有提交到 GitHub。

### 备份

- [ ] 每天生成 PostgreSQL dump。
- [ ] CMS 上传图片保存到 Lightsail Object Storage。
- [ ] 备份文件名包含日期。
- [ ] 至少保留最近 7-14 天备份。
- [ ] 随机抽查一次恢复流程。
- [ ] 后续按需要增加 S3 Glacier 或其他异地归档。

### 搜索引擎抓取

- [ ] `/robots.txt` 可访问。
- [ ] `/sitemap.xml` 可访问。
- [ ] `NEXT_PUBLIC_SITE_URL` 是正式主域名。
- [ ] Google Search Console 已验证。
- [ ] Google 已提交 sitemap。
- [ ] Naver Search Advisor 已验证。
- [ ] Naver 已提交 sitemap。
- [ ] `.com` 辅助域名 301 到 `.co.kr` 主域名。

## 上线前最终确认

上线前必须完成：

1. 公司确认最终域名。
2. 公司确认 Footer 企业信息。
3. 公司确认 Terms 和 Privacy。
4. 公司确认询盘接收邮箱。
5. 技术人员完成服务器部署。
6. 技术人员完成 HTTPS。
7. 技术人员完成备份。
8. 技术人员完成 Google 和 Naver 收录提交。

## 官方参考链接

- AWS Lightsail Pricing: https://aws.amazon.com/lightsail/pricing/
- Cloudflare Free Plan: https://www.cloudflare.com/plans/free/
- NAVER WORKS Pricing: https://naver.worksmobile.com/pricing/
- Let's Encrypt: https://letsencrypt.org/
- Google Search Central Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- Google Search Console: https://search.google.com/search-console
- Naver Search Advisor: https://searchadvisor.naver.com/
