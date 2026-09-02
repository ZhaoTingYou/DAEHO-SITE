# DAEHO 统一会员系统：配置、费用与上线手册

更新时间：2026-09-02

## 当前实现边界

- 韩国用户：手机号 + 密码；SOLAPI 自动发送六位短信验证码。
- 账号与跨站登录：Amazon Cognito Essentials，区域 `ap-northeast-2`。
- 会员资料与认证记录：独立 `customer-api` Spring Boot 服务及 `customer_account` schema。
- MY DAEHO：个人资料、문의列表、详情、状态、旧 문의认领、退出所有设备、删除账号。
- NICE、本人人证一致认证、居民号码、原始 CI/DI、护照、聊天、附件、订单和企业多人账号均不在本期范围内。
- 系统默认关闭。未完成下列配置前，必须保持 `CUSTOMER_ACCOUNTS_ENABLED=false` 和 `INQUIRY_ACCOUNT_REQUIRED=false`。

## 小流量费用

SOLAPI Basic API 没有月租，韩国 SMS 当前公开单价为每条 ₩18（未含 VAT）。按含 10% VAT 粗算：

| 每月验证码短信 | 未税 | 含 VAT 粗算 |
| ---: | ---: | ---: |
| 10 条 | ₩180 | ₩198 |
| 100 条 | ₩1,800 | ₩1,980 |
| 1,000 条 | ₩18,000 | ₩19,800 |

一次成功注册通常消耗一条短信；用户重复请求、输入超时或运营商失败可能增加条数。自动充值是可选项，不开启就不会自动扣款，但余额不足时验证码会停止发送。价格以 [SOLAPI 官方价格页](https://solapi.com/pricing) 为准。

Cognito Essentials 对直接使用 Cognito 登录的用户提供每月 10,000 MAU 免费额度，免费额度长期有效且没有最低费用；超过后按 AWS 当期公开单价计费。小流量官网通常为 ₩0，但仍应配置 AWS Budget 告警。以 [AWS Cognito 官方价格页](https://aws.amazon.com/cognito/pricing/) 为准。

## 必需环境变量

从 `.env.example` 复制变量名，不要复制示例值到生产：

```text
CUSTOMER_ACCOUNTS_ENABLED=false
INQUIRY_ACCOUNT_REQUIRED=false
CUSTOMER_AUTH_MODE=cognito
CUSTOMER_INTERNAL_API_KEY=<至少 32 字节随机值>
CUSTOMER_VERIFICATION_HMAC_SECRET=<不同的至少 32 字节随机值>
AUTH_SESSION_SECRET=<不同的至少 32 字节随机值>

COGNITO_REGION=ap-northeast-2
COGNITO_ISSUER_URI=https://cognito-idp.ap-northeast-2.amazonaws.com/<USER_POOL_ID>
COGNITO_DOMAIN=https://login.daeho.works
COGNITO_CLIENT_ID=<官网 App Client ID>

SOLAPI_API_KEY=<SOLAPI API Key>
SOLAPI_API_SECRET=<SOLAPI API Secret>
SOLAPI_SENDER_NUMBER=<已登记发信号码，仅数字>
```

`CUSTOMER_INTERNAL_API_KEY`、`CUSTOMER_VERIFICATION_HMAC_SECRET`、`AUTH_SESSION_SECRET` 和 SOLAPI Secret 必须分别生成，放入 AWS Secrets Manager 或等效密钥服务，不得提交到 Git、前端变量或日志。

## SOLAPI 开通步骤

1. 创建 SOLAPI 账号。
2. 在控制台登记公司可证明使用权的发信号码。API 只允许使用预先登记的号码；填写环境变量时去掉连字符。
3. 创建 API Key 和 API Secret。Secret 只在创建时保存到密钥管理系统。
4. 小额充值；暂时不要开启自动充值。上线稳定后如需开启，先设置很低的余额告警和月度成本告警。
5. 设置三个 `SOLAPI_*` 变量并重启 `customer-api`。
6. 用公司测试手机号完成一次验证码发送、正确验证码、错误验证码、重复请求和余额不足测试。

系统调用官方 `POST /messages/v4/send-many/detail` 接口，并按 SOLAPI 要求为每次请求生成新的 salt 和 HMAC-SHA256 签名。验证码只保存 HMAC，不保存可查看的明文，也没有人工验证码队列。

## Cognito 配置

1. 在首尔区域创建 Essentials User Pool，登录名使用手机号，密码由 Cognito 管理。
2. 官网 App Client 使用公开客户端：不要创建 client secret；启用 Authorization Code 和 PKCE；scope 为 `openid email phone`。
3. 只添加精确 URL：
   - Callback：`https://daeho.works/api/auth/callback`
   - Sign-out：`https://daeho.works/ko`、`https://daeho.works/en`
   - 本地开发 URL 应作为单独的测试 App Client 配置，不要在生产 Client 中使用通配符。
4. 为 `login.daeho.works` 创建 Cognito Managed Login 自定义域名。Cognito 要求自定义域名证书位于 ACM `us-east-1`，即使 User Pool 位于首尔；按 AWS 返回的 CloudFront 目标创建 DNS Alias/CNAME。参见 [AWS 自定义域名文档](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html)。
5. 将 `infra/cognito/pre-signup/index.mjs` 部署为 Node.js 20+ Lambda，并配置为 User Pool 的 Pre sign-up trigger。Lambda 环境变量：
   - `CUSTOMER_GRANT_VALIDATION_URL=https://daeho.works/internal/cognito/registration-grants/validate`
   - `CUSTOMER_INTERNAL_API_KEY=<与服务端相同的内部密钥>`
6. Lambda 必须能访问上述 HTTPS 地址。Nginx 只公开这一个精确的验证路径，并由内部密钥和限流保护。该路径会在 Cognito 建号前原子消费一次性凭证；之后的客户资料建立只接受已由该触发器消费的凭证。
7. 未安装并实测 Pre sign-up trigger 前，不得把 `CUSTOMER_ACCOUNTS_ENABLED` 改为 `true`。该触发器会拒绝没有有效短信注册凭证、重复消费凭证、手机号不匹配或未成年声明未通过的直接 Cognito 注册。
8. 注册页先让 BFF 把一次性凭证加密保存在 `HttpOnly` Cookie，再由浏览器直接把手机号和密码提交给 Cognito。密码不经过 Next 或 Customer Service。用户首次登录后，OIDC 回调使用已验签的 `sub` 和该凭证幂等建立客户资料。如果资料服务短暂不可用，后续登录会用 Cognito 签名且已验证的手机声明重试幂等建立，不需要重新建号。

## 功能开关与发布顺序

1. 保持两个开关为 `false`，先启动 PostgreSQL、CMS、`customer-api`、Next 和 Nginx；确认两个 Spring 服务 health 为 `UP`。
2. 在测试 User Pool、测试 SOLAPI Key 和测试域名上完成全部验收。
3. 设置 `CUSTOMER_ACCOUNTS_ENABLED=true`、`INQUIRY_ACCOUNT_REQUIRED=false`，仅开放登录、注册和 MY DAEHO。
4. 稳定运行一至两周，检查注册完成率、短信失败、登录失败、无资料 Cognito 用户和 문의关联率。
5. 确认无异常后设置 `INQUIRY_ACCOUNT_REQUIRED=true`。未登录表单会先保存在当前标签页 `sessionStorage`，登录后恢复并要求用户再次确认，绝不自动提交。
6. 回滚只需把两个开关改回 `false`；恢复访客 문의，不回滚数据库迁移或删除会员数据。

## 安全与运维检查

- Access Token 在 `customer-api` 校验 issuer、`token_use=access` 和 App Client ID。
- OIDC 回调校验 state、PKCE、nonce、ID Token 签名、issuer 和 audience。
- BFF 令牌只存于加密的 `HttpOnly + Secure + SameSite=Lax` Cookie；浏览器不写 `localStorage`。
- 注册密码由浏览器直接发送给 Cognito，不经过 DAEHO BFF 和客户服务。
- 本地会话闲置 7 天、绝对 30 天。退出所有设备同时更新 `sessions_valid_after` 并调用 Cognito GlobalSignOut。
- 删除账号要求最近 5 分钟内重新登录；立即停止 MY DAEHO 访问并调用 Cognito DeleteUser，30 天后定时清理资料。清理任务通过 CMS 内部接口解除保留的询价关联；CMS 不可用时保留待重试状态。
- 新 문의只能由当前已登录且状态为 `active` 的账号写入 `customer_id`；列表和详情的 customer ID 由服务端会话解析。
- 旧 문의只有编号和旧联系方式完全匹配时自动关联；其余进入人工审核。关联、解除、审核、停用、恢复和删除均写审计记录。
- 日志不得记录验证码、完整手机号、完整邮箱、注册凭证、访问令牌、SOLAPI 请求体或 문의正文。
- 已过期的验证会话在过期 7 天后定时删除，包括未完成注册的手机号、IP 指纹、SOLAPI 消息 ID 和凭证元数据。已建立账号的必要认证结果和同意回执另行按账号保留政策处理。
- 每月检查 SOLAPI 余额和发送明细、Cognito MAU、AWS Budget、短信失败率、注册完成率和 30 天删除任务。

## 上线前硬性前置

- 韩国隐私律师复核韩英条款和隐私政策，特别是 SOLAPI/AWS 委托处理、跨境或境外主体说明、成年人限制、账号删除和 문의三年保留政策。
- 在 SOLAPI 完成发信号码登记并保存证明文件。
- 在 Cognito 生产池安装 Pre sign-up Lambda，验证无法绕过短信注册。
- 使用第二个测试主域名和独立 App Client 验证一小时中央 SSO；商城正式域名确认后再添加精确回调地址，禁止通配符。
