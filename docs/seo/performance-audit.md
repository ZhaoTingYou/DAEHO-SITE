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

### 캐시 적용 전 실측 (2026-08-10)

| 지표 | 값 |
|---|---|
| 중앙값 | 636ms |
| 최대 | 896ms |
| 최소 | 430ms |
| 측정 페이지 | 118개 |

당시에는 CMS 조회가 `no-store`였고 118개 페이지 전부가 `Cache-Control: private, no-cache, no-store`로 응답했습니다.

### 현재 구현 상태 (최신 main 기준)

이후 고객사 개발팀이 캐시를 직접 구현해 main에 반영했습니다. 확인한 구현은 다음과 같습니다.

| 대상 | 구현 위치 |
|---|---|
| 공개 페이지 1시간 캐시 | `app/[locale]/(site)/layout.tsx` — `revalidate = 3600` |
| CMS 조회 정책 | `lib/cms/repositories.ts:761` — 공개 조회는 태그와 함께 `force-cache`, 관리자 조회만 `no-store` 유지 |
| sitemap · RSS | `unstable_cache` + 1시간 재검증 |
| 페이지 저장 | `revalidatePublicPageCache()` — `repositories.ts:394` |
| 뉴스 저장·수정·삭제 | `revalidatePublicNewsCache()` — `repositories.ts:454, 467, 480` |
| 작품 저장·수정·삭제 | `revalidatePublicCollectionCache()` — `repositories.ts:529, 542, 555` |
| 전체 임포트 | `revalidateAllPublicCmsCache()` — `app/api/admin/import/route.ts:37` |

무효화는 `lib/cms/public-cache.ts`에서 캐시 태그와 경로를 함께 처리하며, 뉴스·작품은 목록·상세·sitemap·RSS가 모두 포함됩니다. **앞서 미구현으로 적었던 작품 캐시 무효화도 구현되어 있습니다.**

### 동작 확인

2026-08-13 AWS 운영 사이트에서 응답 헤더를 확인했습니다.

```
Cache-Control: s-maxage=3600, stale-while-revalidate=31532400
x-nextjs-cache: HIT
x-nextjs-prerender: 1
```

캐시 적용 전의 `private, no-cache, no-store`와 대비됩니다. 캐시가 실제로 적중하는 것까지 확인했습니다.

**따라서 위 636ms는 캐시 적용 이전 수치이며 현재 상태를 나타내지 않습니다.** AWS에서 캐시 적중은 확인됐으며, 118개 페이지의 새 TTFB 중앙값은 SEO 코드 배포 후 같은 조건으로 다시 측정합니다.

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

### 4-0. 폰트 요청 경로 개선 (효과 가장 큼 / **배포 후 재측정 필요**)

구글이 지목한 최대 원인입니다. 측정 당시 렌더링 차단으로 보고된 시간이 **23,450ms**로, 다른 항목을 모두 합친 것보다 컸습니다.

> **표현에 대한 정정.** 이전 문서에서 이 항목을 "23,450ms 절감 / 조치 완료"로 적었으나 정확하지 않습니다. 이번 변경으로 줄인 것은 **요청이 직렬로 쌓이던 구간**이며, 외부 폰트를 여전히 `<link rel="stylesheet">`로 불러오는 이상 스타일시트 자체의 렌더링 차단 성질은 남습니다. 23,450ms는 조치 전 구글이 보고한 차단 구간 총량이지 제거된 시간이 아닙니다. **실제 개선 폭은 AWS 배포 후 PageSpeed Insights 재측정으로 확인해야 합니다.**

**원인**: `app/globals.css` 1~2행에서 외부 폰트 CSS를 `@import`로 불러오고 있었습니다. `@import`는 해당 CSS 파일을 모두 내려받은 뒤에야 존재가 드러나므로 요청이 완전히 직렬로 쌓입니다.

```
globals.css 다운로드 (310ms)
  └→ @import 발견
      └→ fonts.googleapis.com 접속 (750ms)
      └→ cdn.jsdelivr.net 접속 (860ms)
          └→ 폰트 CSS 다운로드
              └→ 폰트 파일 다운로드
                  └→ 그제야 텍스트 렌더링
```

`pretendard.css`는 1.2KB에 불과한데 860ms가 걸렸습니다. 용량이 아니라 **새 도메인에 대한 DNS 조회와 TLS 핸드셰이크 비용**입니다.

**차단 리소스 실측**

| 리소스 | 출처 | 크기 | 소요 |
|---|---|---|---|
| `chunks/...css` | daeho.works | 30.8 KiB | 310ms |
| `pretendard.css` | cdn.jsdelivr.net | 1.2 KiB | 860ms |
| `css2?family=...` | fonts.googleapis.com | 1.6 KiB | 750ms |

**조치 내용**

- `globals.css`의 외부 `@import` 2줄 제거
- `components/site/font-links.tsx`로 분리해 HTML `<head>`에서 직접 링크 — 브라우저가 문서 파싱 즉시 병렬로 요청
- 외부 도메인 4곳에 `preconnect` 추가 — DNS·TLS를 미리 완료
- Pretendard를 `@latest`에서 `v1.3.9`로 고정 — `@latest`는 CDN 장기 캐시가 불가능하고 상위 버전 배포 시 서체가 바뀔 수 있음
- 공개 레이아웃과 관리자 레이아웃 모두 적용

**폰트 이름과 굵기는 변경하지 않았으므로 화면에 보이는 결과는 동일합니다.**

**남아 있는 한계**: 위 조치로도 폰트 CSS는 외부 도메인의 스타일시트이므로 렌더링을 차단합니다. 줄어든 것은 "globals.css를 다 받아야 폰트 CSS의 존재를 알게 되는" 지연과 뒤늦은 DNS·TLS 비용입니다.

**완전 해결책 (후속 과제)**: `next/font`로 전환하면 폰트를 자체 호스팅해 외부 도메인 의존과 스타일시트 차단을 함께 없앨 수 있습니다. 다만 `Cormorant Garamond`를 직접 참조하는 코드가 **17개 파일 27곳**에 있어, 전환 시 모두 CSS 변수로 교체하고 시각 회귀를 검증해야 합니다. 이번 범위에 넣기에는 검증 부담이 커 별도 일정으로 진행하시길 권합니다.

### 4-1. JS 번들 축소 (효과 큼 / 위험 중간)

288KB 중 상위 4개 청크가 188KB입니다. 컬렉션 갤러리가 카드마다 `framer-motion`의 `motion.article`을 사용하고 있어, 애니메이션 라이브러리가 초기 번들에 포함될 가능성이 높습니다.

검토할 방향입니다.

- 카드 등장 애니메이션을 CSS `@keyframes` + `IntersectionObserver`로 대체
- 또는 `framer-motion` 사용 컴포넌트를 동적 임포트로 분리

**주의**: 애니메이션 동작이 달라질 수 있어 시각적 회귀 검증이 필요합니다. 디자인 확인을 거쳐 진행하시길 권합니다.

### 4-2. Brotli 압축 검토 (효과 중간 / 위험 낮음)

현재 gzip으로 응답합니다. Brotli를 적용하면 텍스트 자원이 통상 15~20% 더 작아집니다. 서버·CDN 설정 사항이며 코드 변경은 필요 없습니다.

### 4-3. 캐시 적용 (효과 큼 / **AWS 운영 반영 완료**)

2장 참고. 고객사 개발팀이 최신 main에 구현했고 AWS 운영 응답의 캐시 적중까지 확인했습니다. 전체 페이지의 개선 폭은 동일 조건 재측정으로 확인합니다.

### 4-4. 기존 이미지 파일명 (효과 작음 / 위험 낮음)

S3에 `chatgpt-image-2026-7-17-02-53-29.png` 형태의 파일이 다수 있습니다. 검색 신호로서 파일명의 비중은 크지 않지만, 이미지 검색 유입에는 도움이 됩니다. 다만 파일명 변경은 기존 URL이 끊기므로 CMS 참조를 함께 갱신해야 하며, **신규 업로드부터 의미 있는 이름을 사용하는 방식을 권합니다.**

---

## 5. Core Web Vitals 측정 결과

PageSpeed Insights로 `/ko` 모바일을 측정했습니다. (2026-08-11, 에뮬레이션 Moto G Power, 느린 4G 제한, Lighthouse 13.4.1)

| 카테고리 | 점수 |
|---|---|
| 성능 | **55** |
| 접근성 | **100** |
| 권장사항 | 96 |
| 검색엔진 최적화 | **92** |

| 지표 | 값 | 판정 |
|---|---|---|
| LCP (최대 콘텐츠 표시) | **30.3초** | 나쁨 |
| FCP (첫 콘텐츠 표시) | **23.5초** | 나쁨 |
| Speed Index | 23.5초 | 나쁨 |
| TBT (총 차단 시간) | **0ms** | **양호** |
| CLS (레이아웃 이동) | **0** | **양호** |

성능 점수 55는 **TBT 30점 + CLS 25점**의 합계입니다. 즉 상호작용 반응성과 화면 안정성은 만점이고, **로딩 속도 지표만 0점**입니다. 문제가 한 곳에 몰려 있어 원인 특정이 가능했습니다.

### 구글이 산출한 개선 여지

| 항목 | 절감 가능 | 대응 |
|---|---|---|
| **렌더링 차단 요청** | **23,450ms** | 4-0에서 요청 경로 개선, 배포 후 재측정 |
| 효율적인 캐시 수명 | 2,479KiB | 고객사 캐시 구현 완료 (2장), 배포 후 재측정 |
| 이미지 전송 개선 | 1,854KiB | AVIF·WebP 적용분 머지 시 해소 |
| 사용하지 않는 JS | 48KiB | 4-1 권고 |
| 레거시 JS | 13KiB | 4-1 권고 |
| 총 네트워크 페이로드 | 6,348KiB | — |
| 긴 메인 스레드 작업 | 4개 발견 | 4-1 권고 |

### 재측정 안내

이 수치는 **SEO 코드 조치 전** 기준입니다. 캐시는 이미 AWS에 반영됐고, 4-0의 폰트 요청 경로 개선과 이미지 포맷 적용 효과는 이번 SEO 코드 배포 후에 측정합니다.

아래 링크로 동일 조건 재측정이 가능합니다. 측정 주체와 무관하게 같은 결과가 나오므로 검증할 수 있습니다.

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

---

## 6. 요약

| 항목 | 상태 |
|---|---|
| **폰트 요청 경로** | 직렬 요청 구간 제거, **배포 후 재측정 필요** (외부 스타일시트 차단은 잔존) |
| OG 이미지 | 3장 압축(88~91%)·파일명 개선 후 **운영 적용 완료** |
| 이미지 포맷 | AVIF·WebP 적용, 배포 후 반영 |
| 이미지 alt | 972개 중 누락 0개, 조치 불필요 |
| CSS 번들 | 30KB 단일 파일, 이미 최적이라 조치 불필요 |
| 접근성·CLS·TBT | 각 100점 / 0 / 0ms, 조치 불필요 |
| JS 번들 | 288KB, **축소 권고** (디자인 확인 필요) |
| TTFB | 636ms는 캐시 적용 전 값. **AWS 캐시 HIT 확인, 동일 조건 재측정 예정** |
| Brotli | 적용 검토 권고 |
| `next/font` 전환 | 후속 과제 — 폰트 차단의 완전 해결책 (17개 파일 27곳 시각 검증 필요) |

조치 전 기준 성능 55점입니다. 캐시와 OG 이미지는 이미 운영 반영됐으며, 폰트 요청 경로와 이미지 포맷 변경은 이번 AWS 배포 후 PageSpeed Insights로 다시 측정합니다.
