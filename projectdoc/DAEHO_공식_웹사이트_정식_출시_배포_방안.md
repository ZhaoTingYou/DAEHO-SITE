# DAEHO 공식 웹사이트 정식 출시 배포 방안

업데이트일: 2026-06-30

본 문서는 DAEHO 공식 웹사이트의 정식 출시를 준비하기 위한 배포 방안입니다. 회사 의사결정자, 구매 담당자, 운영 담당자, 기술 담당자가 함께 볼 수 있도록 작성했습니다. 비기술 담당자는 “준비해야 할 계정”과 “권장 구매 항목”을 통해 무엇을 준비해야 하는지 확인할 수 있고, 기술 담당자는 “배포 절차”와 “검수 체크리스트”에 따라 정식 배포를 진행할 수 있습니다.

## 기본 선택안

| 항목 | 기본 선택 |
| --- | --- |
| 주 도메인 | `www.<회사도메인>.co.kr` |
| 보조 도메인 | `<회사도메인>.com`, 주 도메인으로 301 리다이렉트 |
| DNS | Cloudflare Free |
| 서버 | AWS Lightsail, 가능하면 한국 서울 리전 |
| Lightsail 사양 | Linux/Unix, General Purpose, 4GB RAM / 2 vCPU / 80GB SSD / 4TB transfer, public IPv4 포함 |
| 이메일 | NAVER WORKS Standard부터 시작 |
| SSL | Let's Encrypt 무료 인증서 |
| 배포 방식 | Docker Compose |
| 미디어 저장소 | AWS Lightsail Object Storage, bucket: `daeho-prod-media`, region: Seoul / `ap-northeast-2` |
| 백업 | 매일 PostgreSQL dump + Lightsail snapshot, 미디어 파일은 Object Storage에 보관 |

## 권장 아키텍처

정식 출시에는 다음 구성을 권장합니다.

Cloudflare DNS + AWS Lightsail + Docker Compose + Nginx HTTPS + Next.js + Spring Boot CMS + PostgreSQL + Lightsail Object Storage + backup

구성 설명:

1. 사용자는 `https://www.<회사도메인>.co.kr`로 접속합니다.
2. 도메인 DNS는 Cloudflare에서 관리합니다.
3. Cloudflare는 트래픽을 AWS Lightsail Static IP로 연결합니다.
4. Lightsail 서버에서 Docker Compose를 실행합니다.
5. Nginx는 HTTPS와 reverse proxy를 담당하며, 로컬 `/uploads`는 호환/예비 경로로만 사용합니다.
6. Next.js는 공식 웹사이트 페이지, `/admin` CMS 관리자 UI, BFF API를 담당합니다.
7. Spring Boot CMS는 CMS 데이터, 공개 콘텐츠 API, 문의, 미디어 업로드, import/export, 상태 점검을 담당합니다.
8. PostgreSQL은 CMS 데이터를 저장합니다.
9. Lightsail Object Storage는 CMS에서 업로드한 이미지를 저장하며, 공개 이미지 주소는 `https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com/...`를 사용합니다.
10. backup 컨테이너는 매일 데이터베이스 dump를 생성하고, Lightsail snapshot은 서버 단위 복구에 사용합니다.

## Amazon Lightsail은 어떤 사양을 선택해야 하는가

정식 출시의 기본 선택은 다음입니다.

AWS Lightsail Instance를 선택합니다. Containers, Windows, 별도 Managed Database는 첫 단계에서 선택하지 않습니다.

생성 시 권장 선택:

| 설정 항목 | 선택 |
| --- | --- |
| Region | Asia Pacific, Seoul 가능 시 선택 |
| Platform | Linux/Unix |
| Blueprint | OS Only: Ubuntu 24.04 LTS 또는 최신 Ubuntu LTS |
| Plan 유형 | General Purpose |
| 권장 플랜 | 4GB RAM / 2 vCPU / 80GB SSD / 4TB transfer, public IPv4 |
| 현재 공식 가격 | public IPv4 포함 플랜 기준 약 USD 24/월 |
| Static IP | 생성 후 Lightsail Static IP를 할당하고 인스턴스에 연결 |

4GB RAM / 2 vCPU를 권장하는 이유:

1. 현재 프로젝트는 한 서버에서 Nginx, Next.js, Spring Boot, PostgreSQL, backup을 함께 실행합니다.
2. 2GB RAM에서도 실행은 가능하지만, 정식 사이트에서 CMS 관리자, 이미지 업로드, 재시작 또는 빌드 상황까지 고려하면 여유가 부족합니다.
3. 4GB RAM은 비용과 안정성의 균형이 좋아 정식 출시 1단계에 적합합니다.
4. 이후 관리자 미디어 업로드가 많아지거나 방문자가 증가하거나 Java/PostgreSQL 메모리 사용량이 높아지면 8GB RAM / 2 vCPU / 160GB SSD 플랜으로 업그레이드합니다.

정식 웹사이트의 유일한 진입점으로 IPv6-only 플랜은 권장하지 않습니다. IPv6-only 동일 사양은 비용이 더 낮을 수 있지만, 한국 및 해외 사용자, 일부 회사 네트워크, 검색 엔진 크롤러, 외부 서비스 중에는 여전히 IPv4 접근성이 중요한 경우가 있습니다. 정식 공식 웹사이트는 public IPv4가 포함된 플랜을 사용하는 것이 안전합니다.

## 준비해야 할 계정

| 계정 | 용도 | 준비 담당 |
| --- | --- | --- |
| 도메인 등록 업체 계정 | `.co.kr`, `.com` 도메인 구매 | 회사 또는 담당자 |
| Cloudflare 계정 | DNS, 기본 CDN, 보안, SSL 보조 기능 | 기술 담당자 |
| AWS 계정 | Lightsail 서버, Static IP, 백업 저장소 | 회사 또는 기술 담당자 |
| NAVER WORKS 계정 | 기업 이메일, 예: `contact@<회사도메인>.co.kr` | 회사 운영/행정 담당자 |
| GitHub 계정 | 코드 저장, 배포 버전 관리, 협업 | 기술 담당자 |
| Google Search Console | Google 색인, sitemap 제출 | 기술 담당자 |
| Naver Search Advisor | Naver 색인, sitemap 제출 | 기술 담당자 |

계정 소유 권장사항:

1. AWS, Cloudflare, 도메인 등록 업체 계정은 개인 이메일이 아니라 회사 이메일로 가입하는 것이 좋습니다.
2. 모든 주요 계정은 2단계 인증을 활성화합니다.
3. AWS root 계정은 결제와 권한 관리에만 사용하고, 일상 배포는 별도 IAM 사용자로 진행합니다.
4. 비밀번호와 복구 코드는 회사가 관리할 수 있는 비밀번호 관리 도구 또는 암호화 문서에 보관합니다.

## 권장 구매 항목

### 도메인

다음 두 도메인 구매를 권장합니다.

1. `<회사도메인>.co.kr`: 한국 공식 주 도메인.
2. `<회사도메인>.com`: 국제 보조 도메인. `.co.kr` 주 도메인으로 리다이렉트.

주 도메인 권장 형식:

`www.<회사도메인>.co.kr`

보조 도메인 리다이렉트 규칙:

1. `<회사도메인>.co.kr`은 `www.<회사도메인>.co.kr`로 이동합니다.
2. `<회사도메인>.com`은 `www.<회사도메인>.co.kr`로 이동합니다.
3. `www.<회사도메인>.com`은 `www.<회사도메인>.co.kr`로 이동합니다.

원하는 도메인이 이미 등록되어 있다면 다음 대안을 검토할 수 있습니다.

1. 브랜드명 + 업종 키워드, 예: `<브랜드명>jewelry.co.kr`.
2. 브랜드명 + Korea, 예: `<브랜드명>korea.com`.
3. 너무 길거나 철자가 어렵거나 하이픈이 많은 도메인은 피합니다.

### 서버

권장 구매:

AWS Lightsail 4GB RAM / 2 vCPU / 80GB SSD / 4TB transfer, Linux/Unix, public IPv4.

초기 단계에서 바로 구매하지 않아도 되는 항목:

1. Lightsail Managed Database: 현재 Docker Compose에 PostgreSQL이 포함되어 있어 1단계에서는 비용이 낮고 이전이 단순합니다.
2. Load Balancer: 단일 서버 단계에서는 필요하지 않습니다.
3. Cloudflare Pro: 1단계에서는 Cloudflare Free로 충분합니다.

### 기업 이메일

NAVER WORKS Standard부터 시작하는 것을 권장합니다. Standard 플랜부터 기업 메일과 자체 도메인 이메일 사용에 적합합니다.

권장 생성 이메일:

1. `contact@<회사도메인>.co.kr`
2. `info@<회사도메인>.co.kr`
3. `admin@<회사도메인>.co.kr`
4. `privacy@<회사도메인>.co.kr`

문의 메일 수신 주소 권장:

`contact@<회사도메인>.co.kr`

### SSL

Let's Encrypt 무료 SSL 인증서를 사용합니다. Nginx와 Certbot 또는 acme.sh를 함께 사용하여 자동 갱신을 설정합니다.

주의사항:

1. 인증서 자동 갱신 작업을 반드시 설정해야 합니다.
2. 갱신 후 Nginx reload가 필요합니다.
3. 출시 검수 시 `https://`, HTTP에서 HTTPS로의 리다이렉트, 인증서 만료일을 확인해야 합니다.

## 예상 비용

아래는 정식 출시 1단계의 예상 비용입니다. 실제 비용은 구매 당일의 공식 가격을 기준으로 확인해야 합니다. 환율은 변동되며, 아래 원화 금액은 `1 USD ≈ 1,535 KRW` 기준의 대략적인 계산입니다.

| 항목 | 권장안 | 월 비용 예상 | 연 비용 예상 | 설명 |
| --- | --- | ---: | ---: | --- |
| AWS Lightsail 서버 | 4GB / 2 vCPU, public IPv4 | USD 24, 약 KRW 36,800 | USD 288, 약 KRW 442,000 | 웹사이트, CMS, PostgreSQL을 같은 서버에서 운영 |
| Lightsail snapshot | 약 80GB 이하 기준 | 약 USD 4, 약 KRW 6,100 | 약 USD 48, 약 KRW 73,700 | 실제 snapshot 사용량에 따라 과금 |
| `.co.kr` 도메인 | 한국 주 도메인 | - | 약 KRW 10,000-30,000 | 등록 업체마다 다름 |
| `.com` 도메인 | 보조 도메인 | - | 약 KRW 15,000-30,000 | 등록 업체마다 다름 |
| Cloudflare DNS | Free | KRW 0 | KRW 0 | 1단계에서는 충분 |
| Let's Encrypt SSL | 무료 | KRW 0 | KRW 0 | 자동 갱신 설정 필요 |
| NAVER WORKS | Standard | KRW 8,500/명/월 또는 연간 계약 시 약 KRW 7,000/명/월 | 인원 수에 따라 다름 | 기업 이메일이 필요할 때 권장 |
| 미디어 Object Storage | Lightsail Object Storage 100GB | AWS Lightsail 화면의 실제 가격 기준 | 실제 사용량 기준 | CMS 업로드 이미지를 서버 로컬이 아닌 Object Storage에 저장 |
| 외부 아카이브 | 이후 S3 Glacier 또는 별도 보관소 | USD 1-5부터 | USD 12-60부터 | 더 엄격한 재해복구가 필요할 때 추가 |

권장 출시 예산:

1. 서버 + 기본 백업: 약 KRW 43,000/월부터.
2. NAVER WORKS Standard 월간 결제로 기업 이메일 3개 사용 시: 약 KRW 25,500/월.
3. 1단계 일반 월 운영 비용: 약 KRW 70,000/월 수준. 도메인 연 비용, 세금, 환율 변동은 별도입니다.

8GB RAM / 2 vCPU Lightsail로 업그레이드할 경우:

1. public IPv4 포함 플랜 기준 약 USD 44/월.
2. 방문자가 증가하거나, 관리자 이미지 업로드가 많아지거나, PostgreSQL 데이터가 증가한 후 업그레이드하면 됩니다.

## 배포 절차

### 1. 도메인 구매

1. 회사의 최종 브랜드 도메인을 확정합니다.
2. `.co.kr` 도메인을 구매합니다.
3. `.com` 도메인을 구매합니다.
4. 도메인 등록 이메일이 회사 소유인지 확인합니다.
5. 등록 업체 계정, 결제 정보, 도메인 만료일을 기록합니다.

### 2. Cloudflare 연결

1. Cloudflare 계정을 생성합니다.
2. Add site에서 `.co.kr` 주 도메인을 추가합니다.
3. Free plan을 선택합니다.
4. Cloudflare가 제공하는 nameserver 2개를 확인합니다.
5. 도메인 등록 업체 관리자 화면에서 nameserver를 Cloudflare nameserver로 변경합니다.
6. DNS 전파를 기다립니다.
7. `.com` 도메인도 Cloudflare에 연결하고 주 도메인으로 리다이렉트합니다.

Cloudflare DNS 기록 권장:

| Type | Name | Value |
| --- | --- | --- |
| A | `www` | Lightsail Static IP |
| A | `@` | Lightsail Static IP |
| CNAME 또는 Redirect Rule | `.com` 관련 도메인 | `https://www.<회사도메인>.co.kr`로 리다이렉트 |

### 3. AWS Lightsail 서버 생성

1. AWS에 로그인합니다.
2. Lightsail로 이동합니다.
3. Seoul 리전을 선택합니다.
4. Linux/Unix Ubuntu LTS 인스턴스를 생성합니다.
5. 4GB RAM / 2 vCPU / 80GB SSD / 4TB transfer, public IPv4 플랜을 선택합니다.
6. Static IP를 생성하고 인스턴스에 연결합니다.
7. 방화벽에서 다음 포트를 엽니다.
   - 22: SSH. 가능하면 관리자 IP만 허용.
   - 80: HTTP. HTTPS 리다이렉트와 인증서 발급용.
   - 443: HTTPS.
8. PostgreSQL 5432 포트는 외부에 공개하지 않습니다.

### 4. 서버 기본 환경 구성

서버에 설치할 항목:

1. Docker
2. Docker Compose plugin
3. Git
4. Certbot 또는 acme.sh
5. 기본 보안 도구, 예: UFW, fail2ban

보안 설정 권장:

1. SSH 비밀번호 로그인을 비활성화하고 SSH key만 허용합니다.
2. root가 아닌 배포 전용 사용자를 생성합니다.
3. 시스템 보안 패치를 정기적으로 적용합니다.
4. PostgreSQL은 Docker 내부 네트워크에서만 접근 가능하게 둡니다.
5. `.env` 파일 권한은 배포 사용자만 읽을 수 있도록 제한합니다.

### 5. 코드 가져오기와 환경 변수 설정

서버에서:

```bash
git clone git@github.com:ZhaoTingYou/DAEHO-SITE.git
cd DAEHO-SITE
cp .env.example .env
```

운영 환경에서 최소로 설정할 값:

```env
NEXT_PUBLIC_SITE_URL=https://www.<회사도메인>.co.kr
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

CMS_NOTIFY_TO=contact@<회사도메인>.co.kr
SMTP_FROM=contact@<회사도메인>.co.kr
SMTP_HOST=<NAVER-WORKS-SMTP-HOST>
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@<회사도메인>.co.kr
SMTP_PASS=<mail-app-password-or-smtp-password>
```

### 6. CMS 데이터 가져오기

출시 전에 로컬 CMS에서 데이터를 export합니다.

```bash
npm run cms:export
```

생성된 JSON 파일을 서버에 업로드한 뒤 import를 실행합니다.

권장 절차:

1. 로컬 CMS 편집을 잠시 중단합니다.
2. 로컬에서 CMS JSON을 export합니다.
3. 서버에서 PostgreSQL과 CMS API를 먼저 실행합니다.
4. dry-run import를 먼저 실행합니다.
5. row counts를 확인합니다.
6. replace import를 실행합니다.
7. 서버 CMS를 다시 export하여 row counts가 같은지 확인합니다.

반드시 확인할 항목:

1. 페이지 콘텐츠가 존재합니다.
2. 뉴스가 존재합니다.
3. 작품 컬렉션이 존재합니다.
4. 미디어가 125개 또는 최신 개수와 일치합니다.
5. 새로 업로드한 이미지는 Lightsail Object Storage에 저장됩니다.
6. `https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com/...` 이미지가 접근 가능합니다.

### 7. Docker Compose 실행

```bash
docker compose up -d --build
docker compose ps
```

확인 명령:

```bash
curl -I http://localhost
curl -I http://localhost/api/admin/status
```

### 8. HTTPS 구성

권장 방식:

1. 먼저 Nginx를 80 포트로 실행합니다.
2. Certbot 또는 acme.sh로 다음 도메인 인증서를 발급합니다.
   - `www.<회사도메인>.co.kr`
   - `<회사도메인>.co.kr`
   - `<회사도메인>.com`
   - `www.<회사도메인>.com`
3. Nginx에 443 설정을 추가합니다.
4. HTTP는 HTTPS로 자동 리다이렉트합니다.
5. 주 도메인이 아닌 모든 도메인은 `https://www.<회사도메인>.co.kr`로 301 리다이렉트합니다.

### 9. 출시 검수

출시 후 확인할 주소:

1. `https://www.<회사도메인>.co.kr/ko`
2. `https://www.<회사도메인>.co.kr/en`
3. `https://www.<회사도메인>.co.kr/admin`
4. `https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com/...`
5. `https://www.<회사도메인>.co.kr/sitemap.xml`
6. `https://www.<회사도메인>.co.kr/robots.txt`

## SEO 색인 등록

### 기본 원칙

1. Google과 Naver 색인은 접근 가능한 페이지, 안정적인 도메인, 올바른 sitemap, robots, canonical 설정에 달려 있으며 백엔드 언어와는 무관합니다.
2. 주 도메인을 하나로 통일해야 합니다. `.co.kr`, `.com`, bare domain, `www`가 각각 별도 사이트처럼 노출되면 중복 콘텐츠 문제가 생길 수 있습니다.
3. 주 도메인은 `https://www.<회사도메인>.co.kr`로 고정하는 것을 권장합니다.
4. `.com`은 독립 색인용이 아니라 301 리다이렉트용으로 사용합니다.

### robots.txt

출시 후 다음 주소를 확인합니다.

```text
https://www.<회사도메인>.co.kr/robots.txt
```

확인 항목:

1. 공개 페이지 크롤링이 허용되어 있습니다.
2. `/admin`은 크롤링되지 않도록 차단되어 있습니다.
3. sitemap 주소가 포함되어 있습니다.

### sitemap.xml

출시 후 다음 주소를 확인합니다.

```text
https://www.<회사도메인>.co.kr/sitemap.xml
```

확인 항목:

1. `/ko`와 `/en` 페이지가 포함되어 있습니다.
2. 뉴스 상세 페이지가 포함되어 있습니다.
3. 작품 상세 페이지가 포함되어 있습니다.
4. URL은 모두 정식 주 도메인으로 되어 있습니다.

### canonical 도메인

페이지 canonical은 다음 도메인을 사용해야 합니다.

```text
https://www.<회사도메인>.co.kr
```

다음 값이 나오면 안 됩니다.

1. localhost
2. Vercel 임시 도메인
3. 서버 IP
4. `.com` 보조 도메인

### Google Search Console

1. Google Search Console 계정을 생성하거나 회사 Google 계정을 사용합니다.
2. Domain property 또는 URL prefix property를 추가합니다.
3. Cloudflare DNS TXT 레코드를 사용해 소유권을 인증하는 방식을 권장합니다.
4. sitemap을 제출합니다.

```text
https://www.<회사도메인>.co.kr/sitemap.xml
```

5. URL Inspection으로 홈페이지를 확인합니다.

```text
https://www.<회사도메인>.co.kr/ko
```

### Naver Search Advisor

1. Naver Search Advisor에 로그인합니다.
2. 사이트를 추가합니다.

```text
https://www.<회사도메인>.co.kr
```

3. HTML 파일 또는 DNS TXT 방식으로 소유권을 인증합니다.
4. sitemap을 제출합니다.
5. robots.txt를 확인합니다.
6. 홈페이지와 주요 페이지의 수집 요청을 진행합니다.

Naver에서 특히 중요한 점:

1. 한국어 페이지 `/ko`가 주 페이지입니다.
2. 회사 정보, 연락처, 주소, 개인정보 보호책임자 정보가 명확해야 합니다.
3. 사이트 속도와 모바일 사용성이 검색 품질에 영향을 줄 수 있습니다.

## 검수 체크리스트

### 공식 웹사이트

- [ ] `/ko` 접근 가능, 상태 200.
- [ ] `/en` 접근 가능, 상태 200.
- [ ] 모바일 360px, 390px, 430px에서 가로 스크롤이 없음.
- [ ] Header 메뉴, 언어 전환, Footer 링크가 정상 작동.
- [ ] Archive, Heritage, Making, Creations, News, Golf, Contact 페이지가 모두 열림.
- [ ] Terms와 Privacy 페이지 내용이 회사 실제 정보와 일치.

### 관리자

- [ ] `/admin` 로그인 가능.
- [ ] `/admin/pages`에서 페이지 콘텐츠 저장 가능.
- [ ] `/admin/footer`에서 Footer 편집 가능.
- [ ] `/admin/media`에서 미디어 목록 확인 가능.
- [ ] `/admin/news`에서 뉴스 편집 가능.
- [ ] `/admin/collections`에서 작품 편집 가능.
- [ ] Admin session cookie가 `daeho_admin_session`을 사용.

### 이미지 업로드

- [ ] 관리자에서 JPG, PNG, WebP 업로드 가능.
- [ ] SVG는 거부됨.
- [ ] 단일 이미지 파일이 20MB를 초과하면 거부됨.
- [ ] 업로드 후 Object Storage URL로 접근 가능.
- [ ] 컨테이너 재시작 후에도 이미지가 유지됨.
- [ ] `CMS_S3_ACCESS_KEY_ID`와 `CMS_S3_SECRET_ACCESS_KEY`가 GitHub에 커밋되지 않음.

### 문의 메일

- [ ] Contact form 제출 가능.
- [ ] Golf inquiry form 제출 가능.
- [ ] 반복 제출 제한이 동작.
- [ ] 스팸 방지 honeypot이 동작.
- [ ] CMS 관리자에서 문의 확인 가능.
- [ ] 회사 이메일로 알림 메일 수신 가능.
- [ ] SMTP 비밀번호가 GitHub에 커밋되지 않음.

### 백업

- [ ] 매일 PostgreSQL dump 생성.
- [ ] CMS 업로드 이미지는 Lightsail Object Storage에 저장.
- [ ] 백업 파일명에 날짜 포함.
- [ ] 최근 7-14일 백업 보관.
- [ ] 복구 절차를 최소 1회 무작위로 확인.
- [ ] 필요 시 S3 Glacier 또는 별도 외부 아카이브 추가.

### 검색 엔진 크롤링

- [ ] `/robots.txt` 접근 가능.
- [ ] `/sitemap.xml` 접근 가능.
- [ ] `NEXT_PUBLIC_SITE_URL`이 정식 주 도메인.
- [ ] Google Search Console 인증 완료.
- [ ] Google에 sitemap 제출 완료.
- [ ] Naver Search Advisor 인증 완료.
- [ ] Naver에 sitemap 제출 완료.
- [ ] `.com` 보조 도메인은 `.co.kr` 주 도메인으로 301 리다이렉트.

## 출시 전 최종 확인

출시 전 반드시 완료할 항목:

1. 회사가 최종 도메인을 확정.
2. 회사가 Footer 기업 정보를 확인.
3. 회사가 Terms와 Privacy 내용을 확인.
4. 회사가 문의 수신 이메일을 확인.
5. 기술 담당자가 서버 배포 완료.
6. 기술 담당자가 HTTPS 구성 완료.
7. 기술 담당자가 백업 구성 완료.
8. 기술 담당자가 Google과 Naver 색인 등록 제출 완료.

## 공식 참고 링크

- AWS Lightsail Pricing: https://aws.amazon.com/lightsail/pricing/
- Cloudflare Free Plan: https://www.cloudflare.com/plans/free/
- NAVER WORKS Pricing: https://naver.worksmobile.com/pricing/
- Let's Encrypt: https://letsencrypt.org/
- Google Search Central Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- Google Search Console: https://search.google.com/search-console
- Naver Search Advisor: https://searchadvisor.naver.com/
