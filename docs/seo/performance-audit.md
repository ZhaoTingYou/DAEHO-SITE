# 페이지 속도 진단 (daeho.works)

## 측정 범위와 방법

| 항목 | 방법 |
|---|---|
| TTFB, 응답 헤더, 이미지 | 운영 118개 페이지 전수 크롤 |
| HTML·CSS·JS 전송량 | 운영 URL에 `Accept-Encoding: gzip` 요청 후 실제 수신 바이트 측정 |
| Core Web Vitals | PageSpeed Insights (아래 5장 참고) |

모든 수치는 **운영 사이트(daeho.works) 실측**이며 로컬 개발 환경 값이 아닙니다.

---

## 1. 전송량 실측

| 자원 | 측정값 | 평가 |
|---|---|---|
| HTML | 23KB (gzip) / 130KB 원본 | 압축률 5.6배, 정상 |
| **CSS** | **1개 파일 · 30KB** | **양호** — 단일 번들이라 요청 수가 최소 |
| **JS** | **17~19개 청크 · 288KB** | **개선 여지** |
| 압축 방식 | gzip | 적용됨 |
| **최초 로드 합계** | **약 341KB** | 모바일 기준 다소 무거움 |

페이지별 HTML 크기는 `/ko` 23KB, `/ko/mastery/creations` 18KB, `/ko/contact` 15KB로 안정적입니다.

### JS 청크 분포 (`/ko` 기준)

상위 4개가 188KB로 전체 288KB의 **65%**를 차지합니다.

| 순위 | 크기 (gzip) |
|---|---|
| 1 | 69KB |
| 2 | 45KB |
| 3 | 38KB |
| 4 | 36KB |
| 5 | 16KB |

**CSS는 손댈 부분이 없습니다.** 개선 여지는 JS에 집중되어 있습니다.

---

## 2. 서버 응답 속도 (TTFB)

| 지표 | 값 |
|---|---|
| 중앙값 | **636ms** |
| 최대 | 896ms |
| 최소 | 430ms |
| 측정 페이지 | 118개 |

원인은 명확합니다. `lib/cms/repositories.ts`의 CMS 조회가 `cache: 'no-store'`로 설정되어 있어, CMS 데이터를 사용하는 모든 페이지가 캐시 대상에서 제외됩니다. 전 118개 페이지가 `Cache-Control: private, no-cache, no-store`로 응답합니다.

**이 항목은 고객사 개발팀이 내부적으로 진행 중입니다.** (2026-08-10 협의) 캐시를 적용하고 CMS 저장 시 해당 URL만 무효화하는 방식으로, 적용되면 TTFB가 크게 개선될 것으로 예상합니다. 정확한 개선 폭은 적용 후 재측정이 필요합니다.

참고로 재검증 배선은 이미 일부 구현되어 있습니다.

| 저장 대상 | 공개 페이지 캐시 무효화 |
|---|---|
| 페이지 | 구현됨 (`app/admin/actions.ts`) |
| 뉴스 | 구현됨 |
| 컬렉션 | 미구현 |

---

## 3. 이미지 (조치 완료)

| 항목 | 결과 |
|---|---|
| 총 이미지 | 972개 (118페이지 누적) |
| **alt 속성 누락** | **0개** |
| 장식용 `alt=""` | 24개 — 의도된 처리 (스크린리더 중복 낭독 방지) |
| lazy loading | 842개 적용 |
| **포맷** | **AVIF·WebP 자동 협상 적용** (1차 PR) |

### OG 이미지 최적화 (2026-08-11 적용)

전달받은 이미지 3장을 압축 후 CMS에 반영했습니다. 파일명도 검색엔진이 내용을 유추할 수 있도록 변경했습니다.

| 페이지 | 파일명 | 용량 |
|---|---|---|
| `/ko/contact` | `daeho-custom-ring-production-inquiry.jpg` | 968KB → **108KB** (-88%) |
| `/ko/news` | `daeho-news-updates.jpg` | 1084KB → **125KB** (-88%) |
| `/ko/mastery/technique` | `daeho-ring-craft-technique.jpg` | 2100KB → **179KB** (-91%) |

해상도 1200×630 유지, 텍스트 선명도 확인 완료. 적용 후 운영 응답에서 `og:image` 반영과 S3 접근(HTTP 200)을 검증했습니다.

이로써 118개 페이지 중 기본 이미지를 공유하는 페이지는 홈·약관·개인정보 3개만 남았으며, 이 3개는 성격상 현행 유지가 적절합니다.

---

## 4. 개선 권고

우선순위 순입니다.

### 4-1. JS 번들 축소 (효과 큼 / 위험 중간)

288KB 중 상위 4개 청크가 188KB입니다. 컬렉션 갤러리가 카드마다 `framer-motion`의 `motion.article`을 사용하고 있어, 애니메이션 라이브러리가 초기 번들에 포함될 가능성이 높습니다.

검토할 방향입니다.

- 카드 등장 애니메이션을 CSS `@keyframes` + `IntersectionObserver`로 대체
- 또는 `framer-motion` 사용 컴포넌트를 동적 임포트로 분리

**주의**: 애니메이션 동작이 달라질 수 있어 시각적 회귀 검증이 필요합니다. 디자인 확인을 거쳐 진행하시길 권합니다.

### 4-2. Brotli 압축 검토 (효과 중간 / 위험 낮음)

현재 gzip으로 응답합니다. Brotli를 적용하면 텍스트 자원이 통상 15~20% 더 작아집니다. 서버·CDN 설정 사항이며 코드 변경은 필요 없습니다.

### 4-3. 캐시 적용 (효과 큼 / 고객사 진행 중)

2장 참고. 고객사 개발팀이 담당합니다.

### 4-4. 기존 이미지 파일명 (효과 작음 / 위험 낮음)

S3에 `chatgpt-image-2026-7-17-02-53-29.png` 형태의 파일이 다수 있습니다. 검색 신호로서 파일명의 비중은 크지 않지만, 이미지 검색 유입에는 도움이 됩니다. 다만 파일명 변경은 기존 URL이 끊기므로 CMS 참조를 함께 갱신해야 하며, **신규 업로드부터 의미 있는 이름을 사용하는 방식을 권합니다.**

---

## 5. Core Web Vitals

측정 시도 중 PageSpeed Insights API가 일일 할당량(HTTP 429)에 걸려 자동 수집을 완료하지 못했습니다. 공용 할당량이라 API 키 없이는 우회할 수 없으며, 매일 초기화됩니다.

**아래 링크로 직접 측정하시면 구글 서버 기준 값을 확인하실 수 있습니다.** 보고서에는 이 값을 사용하는 것이 정확합니다. 측정 주체와 무관하게 동일한 결과가 나오므로 검증이 가능합니다.

```
https://pagespeed.web.dev/analysis?url=https://daeho.works/ko
https://pagespeed.web.dev/analysis?url=https://daeho.works/ko/mastery/creations
https://pagespeed.web.dev/analysis?url=https://daeho.works/ko/news
https://pagespeed.web.dev/analysis?url=https://daeho.works/ko/contact
https://pagespeed.web.dev/analysis?url=https://daeho.works/ko/heritage/achievement
https://pagespeed.web.dev/analysis?url=https://daeho.works/ko/mastery/making
```

### 판정 기준 (구글 공식)

| 지표 | 양호 | 개선 필요 | 나쁨 |
|---|---|---|---|
| LCP (최대 콘텐츠 표시) | 2.5초 이하 | 2.5~4.0초 | 4.0초 초과 |
| INP (상호작용 반응) | 200ms 이하 | 200~500ms | 500ms 초과 |
| CLS (레이아웃 이동) | 0.1 이하 | 0.1~0.25 | 0.25 초과 |

### 예상 지점

측정 전이지만 실측 데이터로부터 다음을 예상할 수 있습니다.

- **LCP** — TTFB 636ms가 LCP에 그대로 더해집니다. 캐시 적용 시 가장 크게 개선될 지표입니다.
- **INP** — JS 288KB가 메인 스레드 점유에 영향을 줍니다. 4-1 조치와 연결됩니다.
- **CLS** — 이미지에 `aspect-*` 클래스로 종횡비가 지정되어 있어 레이아웃 이동 위험은 낮습니다.

---

## 6. 요약

| 항목 | 상태 |
|---|---|
| CSS 번들 | 이미 최적, 조치 불필요 |
| 이미지 alt | 972개 중 누락 0개, 조치 불필요 |
| 이미지 포맷 | AVIF·WebP 적용 완료 |
| OG 이미지 | 3장 압축·파일명 개선 후 적용 완료 |
| JS 번들 | **288KB, 축소 권고** (디자인 확인 필요) |
| TTFB | **636ms, 고객사 캐시 작업으로 개선 예정** |
| Brotli | 적용 검토 권고 |
| Core Web Vitals | 위 링크로 측정 필요 |
