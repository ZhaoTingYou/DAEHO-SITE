# DAEHO 统一会员系统：配置、费用与上线手册

更新时间：2026-09-03

## 当前实现边界

- 韩国用户：自定义用户名 + 密码；注册、找回用户名和重置密码均使用 SOLAPI 验证已登记手机号。
- 账号认证：Amazon Cognito Essentials，区域 `ap-northeast-2`；注册页和登录页均由 DAEHO 官网代码渲染，不向普通客户展示 Cognito Managed Login。
- 会员资料与认证记录：独立 `customer-api` Spring Boot 服务及 `customer_account` schema。
- MY DAEHO：个人资料、문의列表、详情、状态、旧 문의认领、退出所有设备、删除账号。
- NICE、本人人证一致认证、居民号码、原始 CI/DI、护照、聊天、附件、订单和企业多人账号均不在本期范围内。
- 系统默认关闭。未完成下列配置前，必须保持基础设施总保险 `CUSTOMER_ACCOUNTS_ENABLED=false`；CMS 内的“开放登录、注册和 MY DAEHO”与“提交 문의 前必须登录”也必须保持关闭。

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
CUSTOMER_AUTH_MODE=cognito
CUSTOMER_INTERNAL_API_KEY=<至少 32 字节随机值>
CUSTOMER_VERIFICATION_HMAC_SECRET=<不同的至少 32 字节随机值>
AUTH_SESSION_SECRET=<不同的至少 32 字节随机值>

COGNITO_REGION=ap-northeast-2
COGNITO_ISSUER_URI=https://cognito-idp.ap-northeast-2.amazonaws.com/<USER_POOL_ID>
COGNITO_DOMAIN=https://login.daeho.works
COGNITO_CLIENT_ID=<官网 App Client ID>
COGNITO_RECOVERY_FUNCTION_URL=<密码重置 Lambda 的 HTTPS Function URL>

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

1. 在首尔区域创建 Essentials User Pool，登录标识只选择“用户名”，注册必要属性选择 `phone_number`。用户名采用 4–24 位小写英文、数字、点、下划线或连字符，必须以英文字母开头；Cognito 用户名创建后不可修改。手机号仅用于 SOLAPI 验证与密码找回，不作为登录名。
2. 官网 App Client 使用公开客户端，不要创建 client secret；启用 `ALLOW_USER_PASSWORD_AUTH` 和 `ALLOW_REFRESH_TOKEN_AUTH`。官网自写登录页通过同源 BFF 调用 Cognito `InitiateAuth`，Cognito 返回的令牌只写入服务端加密会话。
3. 只添加精确 URL：
   - Callback：`https://daeho.works/api/auth/callback`
   - Sign-out：`https://daeho.works/ko`、`https://daeho.works/en`
   - 本地开发 URL 应作为单独的测试 App Client 配置，不要在生产 Client 中使用通配符。
4. `login.daeho.works` 和 Authorization Code + PKCE 配置保留给未来跨主域名 SSO。客户当前登录不依赖 Cognito Managed Login；未来启用中央自写登录站和一次性授权票据前，不得把不同主域名误认为已经共享会话。
5. 将 `infra/cognito/pre-signup/index.mjs` 部署为 Node.js 20+ Lambda，并配置为 User Pool 的 Pre sign-up trigger。Lambda 环境变量：
   - `CUSTOMER_GRANT_VALIDATION_URL=https://daeho.works/internal/cognito/registration-grants/validate`
   - `CUSTOMER_INTERNAL_API_KEY=<与服务端相同的内部密钥>`
   - `CUSTOM_USERNAME_POOL_ID=<当前支持自定义用户名的 User Pool ID>`
   - `LEGACY_USER_POOL_IDS=<仍需兼容的旧 User Pool ID，多个时用逗号分隔>`；不在这两个显式列表内的 Pool 会被拒绝。
6. Lambda 必须能访问上述 HTTPS 地址。Nginx 只公开这一个精确的验证路径，并由内部密钥和限流保护。该路径会在 Cognito 建号前把一次性凭证原子绑定到准确的 User Pool、App Client 和用户名；只有完全相同的 Cognito 密码策略重试可以复用，改换用户名、客户端或用户池会被拒绝。手机号 HMAC 指纹会持续占用到资料建立完成，避免用户建号后未首次登录而绕过重复手机号限制。资料建立还必须同时持有浏览器的加密注册事务 Cookie，并匹配已验签 ID Token 中的手机号和用户名。
7. 未安装并实测 Pre sign-up trigger 前，不得把 `CUSTOMER_ACCOUNTS_ENABLED` 改为 `true`。该触发器会拒绝没有有效短信注册凭证、重复消费凭证、手机号不匹配或未成年声明未通过的直接 Cognito 注册。
8. 注册页先让 BFF 把一次性凭证加密保存在 `HttpOnly` Cookie，再由浏览器直接把用户名、手机号和密码提交给 Cognito。注册密码不经过 Next 或 Customer Service。账号创建后返回 DAEHO 自写登录页；登录密码通过 HTTPS 提交给同源 BFF，BFF 只转交 Cognito 校验，不记录、不持久化密码。已验签的 ID Token、手机号、用户名和同一注册 Cookie 用于幂等建立客户资料。如果同一已验证手机号原来属于旧手机号用户池，Customer Account Service 仅允许一次迁移：保留原 `customer_id`、문의关联和资料，把新旧两个 Cognito `sub` 都保存在身份映射表中，将新用户名设为当前身份，并补记本次短信验证、条款、隐私与营销选择；迁移完成后同一手机号不能再创建第二个用户名账号，停用或待删除账号也不能借此恢复。旧池仍可解析原 `sub`，用于受控回滚。
9. 将 `infra/cognito/account-recovery` 按其中的 lockfile 安装生产依赖并打包为 Node.js 22 Lambda。Lambda 只授予当前 User Pool 的 `cognito-idp:AdminSetUserPassword` 与 `cognito-idp:AdminUserGlobalSignOut`，环境变量设置为：
   - `COGNITO_USER_POOL_ID=<当前自定义用户名 User Pool ID>`
   - `CUSTOMER_INTERNAL_API_KEY=<与服务端相同的内部密钥>`
   - 创建 `NONE` Function URL，并由至少 32 字节的上述内部密钥做等时比较；调用方还会把 URL 限定为首尔区域的 AWS Lambda Function URL。URL 只写入服务端的 `COGNITO_RECOVERY_FUNCTION_URL`，不得出现在 `NEXT_PUBLIC_*`、页面源码或日志中。该函数不发送短信，不需要 Cognito Custom SMS Sender，也不需要单独的 KMS 密钥月租。
   - 函数只接受 `signOut` 与 `setPassword` 两个内部动作。先撤销 Cognito 会话，Customer Service 再原子提升本地会话版本，最后才设置新密码；这样不会出现密码已经改变但旧本地会话仍有效的窗口。
10. 找回账号只接受已验证手机号，并把完整用户名通过 SOLAPI 发到原手机号；HTTP 响应始终相同。真实短信由数据库队列在响应结束后异步发送，未知账号只写入 decoy 记录，避免通过 SOLAPI 网络耗时枚举账号。短信请求的幂等键在网络超时或 5xx 后保持不变，只有用户修改账号资料才开始新请求，避免响应丢失造成重复付费短信。重置密码要求用户名与原手机号同时匹配，SOLAPI 验证码最多尝试 5 次，成功后签发 10 分钟、单次使用的重置凭证。验证码完成步骤也使用独立幂等键，凭证由服务端 HMAC 确定性派生；响应丢失时提交相同验证码和操作键会返回完全相同的凭证。所有手机号、IP、验证码与凭证在数据库中只保留 HMAC 指纹。
11. 密码重置使用可重试的 `verified → resetting → consumed` 状态机。BFF 以内部 HMAC 把浏览器操作键、用户名和准确的新密码绑定为不可伪造的幂等操作；短租约用于接管中断请求，独立的 3 分钟截止时间限制整个重置。流程依次为 Cognito 全局退出、本地会话失效和设置新密码，成功后再消费凭证。只有调用 Cognito 前的明确配置或鉴权失败才释放预留；网络超时、限流和服务端错误视为结果未知，保持预留并只允许同一操作在租约到期后安全重试。已完成请求重放会直接返回成功，不会再次修改密码。

## 功能开关与发布顺序

> 生产开放前置：必须先部署并实测 Pre sign-up Lambda、找回账号短信以及密码重置 Lambda。任一项未通过时不得在 CMS 开启会员入口。

1. 保持 `CUSTOMER_ACCOUNTS_ENABLED=false` 和 CMS 内的两个开关关闭。生产发布统一执行 `sudo COMPOSE_PROJECT_NAME=daeho-prod ./scripts/deploy-production.sh`；脚本先取得独占发布锁，并在任何 Flyway 迁移启动前以不可覆盖方式生成、校验 PostgreSQL 压缩备份，随后等待服务健康、校验并重载 Nginx，最后检查官网与实时咨询接口。并发发布、同名备份或任一环节失败都会立即终止，不继续开放会员入口。
2. 在测试 User Pool、测试 SOLAPI Key 和测试域名上完成全部验收。
3. 设置一次基础设施总保险 `CUSTOMER_ACCOUNTS_ENABLED=true` 并重启 `customer-api` 与 Next；此时 CMS 开关仍关闭，公众入口不会出现。
4. 在 CMS > 会员中开启“开放登录、注册和 MY DAEHO”，先只开放会员功能。
5. 稳定运行一至两周，检查注册完成率、短信失败、登录失败、无资料 Cognito 用户和 문의关联率。
6. 确认无异常后在同一 CMS 页面开启“提交 문의 前必须登录”。未登录表单会先保存在当前标签页 `sessionStorage`，登录后恢复并要求用户再次确认，绝不自动提交。
7. 日常回滚只需在 CMS 关闭两个开关；紧急基础设施回滚再把 `CUSTOMER_ACCOUNTS_ENABLED=false` 并重启服务。两种回滚都不删除会员数据或回滚数据库迁移。

CMS 每次保存这两个开关都会写入 `cms_account_feature_events` 审计记录。“提交 문의 前必须登录”不能在会员入口关闭时单独开启。CMS 服务不可用时，会员入口会自动关闭，但访客 문의继续开放，避免配置故障导致客户无法联系。

## 安全与运维检查

- Access Token 在 `customer-api` 校验 issuer、`token_use=access` 和 App Client ID。
- 自写登录调用 Cognito `USER_PASSWORD_AUTH`，并校验 ID Token 签名、issuer、audience、`token_use` 和 `sub`；预留的 OIDC 回调仍校验 state、PKCE 和 nonce。
- 登录接口在调用 Cognito 前按 HMAC 化的用户名和客户端 IP 做 15 分钟失败次数限流；不在内存中保存明文用户名或 IP。当前单实例部署与 Cognito 自身限流共同生效，扩为多实例前应迁移到共享限流存储。
- 找回账号和密码重置分别按手机号与 IP 限流；不存在、手机号不匹配、停用和待删除账号均返回与正常请求相同的启动响应，不发送短信，也不能取得有效重置凭证。
- 账号找回短信使用 `FOR UPDATE SKIP LOCKED` 的持久队列领取，并在独立短事务内从 `pending` 原子转换为 `sending` 后才调用 SOLAPI，外部短信请求不占用数据库事务。发送结果不确定时转为 `delivery_unknown`，禁止自动重发，避免同一次领取重复发送；日志只记录不含手机号、用户名或短信正文的 attempt ID、用途和异常类型，供人工核对与告警使用。
- BFF 令牌只存于加密的 `HttpOnly + Secure + SameSite=Lax` Cookie；浏览器不写 `localStorage`。
- 注册密码由浏览器直接发送给 Cognito；登录密码只经 HTTPS 到同源 BFF 并立即转交 Cognito，不写入日志、数据库、Cookie 或浏览器存储。
- 本地会话闲置 7 天、绝对 30 天。退出所有设备同时更新 `sessions_valid_after` 并调用 Cognito GlobalSignOut。
- 删除账号要求最近 5 分钟内重新登录；立即停止 MY DAEHO 访问并调用 Cognito DeleteUser，30 天后定时清理资料。清理任务通过 CMS 内部接口解除保留的询价关联；CMS 不可用时保留待重试状态。
- 新 문의只能由当前已登录且状态为 `active` 的账号写入 `customer_id`；列表和详情的 customer ID 由服务端会话解析。
- 旧 문의只有编号和旧联系方式完全匹配时自动关联；其余进入人工审核。关联、解除、审核、停用、恢复和删除均写审计记录。
- 日志不得记录验证码、完整手机号、完整邮箱、注册凭证、访问令牌、SOLAPI 请求体或 문의正文。
- 已过期的临时验证数据在过期 7 天后删除；已完成 Cognito 注册但尚未补建资料的记录仅保留不可逆手机号 HMAC 与同意凭证，资料补建成功后立即删除。
- 每月检查 SOLAPI 余额和发送明细、Cognito MAU、AWS Budget、短信失败率、注册完成率和 30 天删除任务。

## 上线前硬性前置

- 韩国隐私律师复核韩英条款和隐私政策，特别是 SOLAPI/AWS 委托处理、跨境或境外主体说明、成年人限制、账号删除和 문의三年保留政策。
- 在 SOLAPI 完成发信号码登记并保存证明文件。
- 在 Cognito 生产池安装 Pre sign-up Lambda，验证无法绕过短信注册。
- 部署专用密码重置 Lambda，限制为单个生产 User Pool，并实测错误账号、错误手机号、验证码过期、5 次错误、凭证过期和凭证重复使用。
- 跨主域名商城启用前，先实现并测试 `login.daeho.works` 中央自写登录站与一次性授权票据；每个商城使用独立 App Client 和精确回调地址，禁止通配符。
