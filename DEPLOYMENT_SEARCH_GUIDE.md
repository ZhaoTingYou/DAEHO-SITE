# DAEHO 部署与搜索提交指南

这份文件用于网站最终完成后的上线、域名绑定，以及提交到 Google 和 Naver。当前项目是 Next.js 项目，推荐优先使用 Vercel 部署。

## 1. 上线前本地检查

在项目根目录执行：

```bash
npm install
npm run lint
npm run build
```

如果 `npm run build` 通过，再本地启动正式构建检查：

```bash
npm run start
```

重点检查这些页面：

- `http://localhost:3000/ko`
- `http://localhost:3000/ko/archive`
- `http://localhost:3000/ko/heritage/loyalty`
- `http://localhost:3000/ko/heritage/credibility`
- `http://localhost:3000/ko/heritage/achievement`
- `http://localhost:3000/ko/mastery/making`
- `http://localhost:3000/ko/mastery/creations`
- `http://localhost:3000/ko/news`
- `http://localhost:3000/ko/golf`
- `http://localhost:3000/ko/contact`
- `http://localhost:3000/sitemap.xml`
- `http://localhost:3000/robots.txt`

上线前确认：

- 页面没有明显错位、图片缺失、移动端遮挡。
- `sitemap.xml` 可以打开。
- `robots.txt` 可以打开，并且里面有 sitemap 地址。
- 表单、链接、语言切换、顶部栏和 footer 都能正常点击。

## 2. 提交代码

确认只提交这次要上线的改动：

```bash
git status --short
git add <需要提交的文件>
git commit -m "Prepare production release"
git push origin main
```

如果使用的不是 `main` 分支，把 `main` 换成实际生产分支。

## 3. Vercel 部署

### 第一次部署

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)。
2. 点击 `Add New...` -> `Project`。
3. 选择 GitHub/GitLab/Bitbucket 里的这个项目仓库。
4. Framework Preset 选择 `Next.js`。
5. Build Command 使用默认或填写：

```bash
npm run build
```

6. Install Command 使用默认或填写：

```bash
npm install
```

7. Output Directory 不需要填写，Next.js/Vercel 会自动处理。
8. 点击 Deploy。

### 重要环境变量

在 Vercel 项目里进入 `Settings` -> `Environment Variables`，添加：

```text
NEXT_PUBLIC_SITE_URL=https://你的正式域名
```

这个变量非常重要。项目里的 `sitemap.xml`、`robots.txt` 和 canonical URL 会用它生成正式域名。如果这里还是 localhost 或预览域名，搜索引擎提交会出问题。

添加或修改环境变量后，需要重新部署一次。

### 后续部署

以后改完代码后：

```bash
npm run lint
npm run build
git add <需要提交的文件>
git commit -m "Update site"
git push origin main
```

Vercel 会自动触发新的 Production Deployment。

## 4. 绑定正式域名

1. 在 Vercel 项目中打开 `Settings` -> `Domains`。
2. 添加正式域名，例如：

```text
daeho.example.com
www.daeho.example.com
```

3. 按 Vercel 页面提示去域名服务商设置 DNS。
4. 常见设置方式：

- Apex/root 域名通常使用 Vercel 提供的 `A` 记录。
- `www` 或子域名通常使用 Vercel 提供的 `CNAME` 记录。

5. 等待 DNS 生效和 SSL 证书自动签发。
6. 域名可访问后，回到 Vercel 环境变量，把 `NEXT_PUBLIC_SITE_URL` 改成最终对外使用的那个域名。
7. 重新部署。

完成后检查：

```text
https://你的正式域名/ko
https://你的正式域名/sitemap.xml
https://你的正式域名/robots.txt
```

确认 sitemap 里的 URL 都是正式域名，不是 localhost，也不是 Vercel preview 域名。

## 5. 提交到 Google

### 添加网站

1. 打开 [Google Search Console](https://search.google.com/search-console/)。
2. 点击 `Add property`。
3. 推荐选择 `Domain property`，例如：

```text
daeho.example.com
```

如果暂时不方便改 DNS，也可以选择 `URL prefix`，例如：

```text
https://www.daeho.example.com
```

### 验证所有权

推荐使用 DNS TXT 验证：

1. Google 会给一条 TXT 记录。
2. 到域名服务商的 DNS 管理页面添加这条 TXT。
3. 等 DNS 生效后回到 Search Console 点击 Verify。

如果选择 HTML meta tag 验证，需要把 Google 给的 meta tag 放进网站 `<head>`，重新部署后再验证。能用 DNS 的话，优先用 DNS，后面换框架或改页面也不容易丢。

### 提交 sitemap

验证成功后：

1. 进入 Search Console。
2. 左侧点击 `Sitemaps`。
3. 输入：

```text
sitemap.xml
```

或者完整地址：

```text
https://你的正式域名/sitemap.xml
```

4. 点击 Submit。

### 请求重点页面收录

在 `URL Inspection` 输入重点页面，然后点击 `Request indexing`：

- `https://你的正式域名/ko`
- `https://你的正式域名/ko/heritage/loyalty`
- `https://你的正式域名/ko/heritage/credibility`
- `https://你的正式域名/ko/heritage/achievement`
- `https://你的正式域名/ko/mastery/making`
- `https://你的正式域名/ko/mastery/creations`
- `https://你的正式域名/ko/news`
- `https://你的正式域名/ko/golf`

注意：提交 sitemap 和请求索引不等于马上出现在搜索结果里。Google 需要时间抓取、判断和收录。

## 6. 提交到 Naver

### 添加网站

1. 打开 [Naver Search Advisor](https://searchadvisor.naver.com/)。
2. 登录 Naver 账号。
3. 进入 `웹마스터 도구`。
4. 添加正式域名，例如：

```text
https://www.daeho.example.com
```

Naver 对协议、www、子域名区分比较严格。提交时要和最终公开访问的正式域名完全一致。

### 验证所有权

Naver 常见验证方式：

- HTML meta tag
- HTML 文件上传
- DNS 记录

如果可以，推荐 DNS 记录验证。这样不会受页面结构调整影响。

如果使用 HTML meta tag，必须放在页面的 `<head>` 里，不能放在 body 里，也不能被 iframe 或脚本跳转挡住。添加后重新部署，再回到 Naver 点击验证。

### 提交 sitemap

验证成功后：

1. 进入该站点的管理页面。
2. 找到 `요청` -> `사이트맵 제출`。
3. 提交：

```text
https://你的正式域名/sitemap.xml
```

Naver 要求 sitemap 里的 URL 域名必须和已验证的网站域名一致。

### 请求重点页面收集

进入 `요청` -> `웹 페이지 수집`，提交重点页面：

- `https://你的正式域名/ko`
- `https://你的正式域名/ko/heritage/loyalty`
- `https://你的正式域名/ko/heritage/credibility`
- `https://你的正式域名/ko/heritage/achievement`
- `https://你的正式域名/ko/mastery/making`
- `https://你的正式域名/ko/mastery/creations`
- `https://你的正式域名/ko/news`
- `https://你的正式域名/ko/golf`

注意：Naver 的 수집 요청 也不是实时保证收录，它只是让 Naver 知道这些 URL 应该被抓取。

## 7. 上线后检查清单

上线后当天：

- 打开正式域名首页。
- 打开 `https://你的正式域名/sitemap.xml`。
- 打开 `https://你的正式域名/robots.txt`。
- 检查 sitemap 里没有 localhost。
- 检查 sitemap 里没有 Vercel preview 域名。
- Google Search Console 提交 sitemap。
- Naver Search Advisor 提交 sitemap。
- 在 Google 和 Naver 分别请求几个重点页面收录。

上线后一周内：

- 在 Google 搜索：

```text
site:你的正式域名
```

- 在 Naver 搜索：

```text
site:你的正式域名
```

- 回到 Google Search Console 看 Indexing / Pages。
- 回到 Naver Search Advisor 看 수집 현황、사이트 진단、사이트 최적화。

## 8. 常见问题

### sitemap 里出现 localhost

原因通常是 Vercel 没设置正式域名变量。

处理：

1. Vercel -> Project -> Settings -> Environment Variables。
2. 设置：

```text
NEXT_PUBLIC_SITE_URL=https://你的正式域名
```

3. Redeploy。
4. 重新打开 `/sitemap.xml` 检查。

### Google 或 Naver 验证失败

检查：

- 域名是否已经能公开访问。
- 验证的是不是同一个域名版本：`https`、`http`、`www`、非 `www` 都要一致。
- 如果用 meta tag，是否真的在 `<head>` 内。
- 如果用 DNS TXT，是否已经生效。
- 网站是否有密码保护或访问限制。

### sitemap 提交失败

检查：

- `https://你的正式域名/sitemap.xml` 是否能在浏览器打开。
- sitemap 里面的 URL 是否都是正式域名。
- robots.txt 是否允许搜索引擎访问。
- 页面是否返回 200 状态码。

### 提交后搜索不到

这是正常情况。搜索引擎需要时间抓取和判断。先确认：

- sitemap 状态是成功。
- 页面没有 `noindex`。
- robots.txt 没有阻止页面。
- 页面内容不是空白或加载失败。
- 页面之间有正常内部链接。

## 9. 官方参考

- Vercel Deployments: https://vercel.com/docs/deployments
- Vercel Next.js: https://vercel.com/docs/frameworks/full-stack/nextjs
- Google Search Console: https://search.google.com/search-console/about
- Google sitemap guide: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google Sitemaps report: https://support.google.com/webmasters/answer/7451001
- Naver Search Advisor: https://searchadvisor.naver.com/
- Naver site registration / ownership: https://searchadvisor.naver.com/guide/faq-start-register
- Naver sitemap submission guide: https://searchadvisor.naver.com/guide/request-feed
- Naver crawl request guide: https://searchadvisor.naver.com/guide/request-crawl

