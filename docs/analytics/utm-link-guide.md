# DAEHO UTM 링크 운영 가이드

GA4의 `보고서 > 획득 > 트래픽 획득`에서 방문 경로를 일관되게 확인하기 위한 링크 규칙입니다.

## 기본 규칙

- 모든 값은 영문 소문자와 `snake_case`를 사용합니다.
- `utm_source`는 플랫폼, `utm_medium`은 유입 유형, `utm_campaign`은 캠페인, `utm_content`는 링크 위치나 소재를 의미합니다.
- 같은 플랫폼에 `instagram`, `insta`, `Instagram`처럼 서로 다른 이름을 혼용하지 않습니다.
- 이름, 전화번호, 각인 문구 등 개인정보를 UTM 값에 넣지 않습니다.

## 채널별 링크

### Instagram 프로필

```text
https://daeho.works/ko?utm_source=instagram&utm_medium=social&utm_campaign=always_on&utm_content=profile_link
```

### Instagram Story

```text
https://daeho.works/ko?utm_source=instagram&utm_medium=social&utm_campaign=always_on&utm_content=story
```

### Instagram 광고

```text
https://daeho.works/ko?utm_source=instagram&utm_medium=paid_social&utm_campaign=<campaign_slug>&utm_content=<creative_slug>
```

### Naver Blog

```text
https://daeho.works/ko?utm_source=naver_blog&utm_medium=referral&utm_campaign=always_on&utm_content=post
```

### Kakao

```text
https://daeho.works/ko?utm_source=kakao&utm_medium=social&utm_campaign=always_on&utm_content=<placement>
```

### 이메일

```text
https://daeho.works/ko?utm_source=<newsletter_name>&utm_medium=email&utm_campaign=<campaign_slug>
```

### 오프라인 QR

```text
https://daeho.works/ko?utm_source=qr&utm_medium=offline&utm_campaign=<event_slug>
```

## 확인 방법

1. 테스트 링크로 사이트에 접속하고 분석 쿠키를 허용합니다.
2. GA4 `보고서 > 실시간`에서 방문을 먼저 확인합니다.
3. 처리 후 `보고서 > 획득 > 트래픽 획득`에서 기본 측정기준을 `세션 소스/매체`로 선택합니다.
4. Google 및 Naver 자연검색은 보통 Referrer로 자동 식별되고, 직접 관리하는 SNS·블로그·QR 링크는 위 UTM 값을 기준으로 식별됩니다.

Referrer와 UTM이 모두 없는 방문은 `(direct) / (none)`으로 표시될 수 있습니다.
