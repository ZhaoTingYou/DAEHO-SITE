// 폰트 CSS를 globals.css의 @import로 불러오면 globals.css를 모두 받은 뒤에야 존재가 드러나
// 요청이 직렬로 쌓인다. globals.css 다운로드 → 외부 도메인 접속 → 폰트 CSS → 폰트 파일 순서라
// 느린 회선에서 첫 텍스트 렌더링이 크게 밀린다.
//
// HTML head에서 직접 링크하면 브라우저가 문서를 파싱하는 즉시 병렬로 내려받고,
// preconnect로 DNS 조회와 TLS 핸드셰이크를 미리 끝내둘 수 있다.
// 폰트 이름은 그대로라 화면에 보이는 결과는 달라지지 않는다.

const GOOGLE_FONTS_CSS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap';

// @latest는 CDN이 장기 캐시를 걸 수 없고 상위 버전이 올라오면 서체가 바뀔 수 있어 버전을 고정한다.
//
// 통짜 pretendard.css는 굵기 9종을 한글 전체가 담긴 파일로 받아 굵기 하나가 760KB에 이른다.
// dynamic-subset은 같은 서체를 unicode-range로 쪼갠 것이라, 화면에 실제 쓰인 글자가 든
// 조각만 내려받는다. 서체와 굵기가 같은 원본에서 나오므로 보이는 결과는 달라지지 않는다.
const PRETENDARD_CSS =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.css';

export function FontLinks() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="preconnect" href="https://hangeul.pstatic.net" crossOrigin="" />
      <link rel="stylesheet" href={GOOGLE_FONTS_CSS} />
      <link rel="stylesheet" href={PRETENDARD_CSS} />
    </>
  );
}
