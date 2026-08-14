// Font-face CSS is bundled through app/globals.css. These hints only prepare
// connections to the immutable font-file origins used by that CSS.
export function FontLinks() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="preconnect" href="https://hangeul.pstatic.net" crossOrigin="" />
    </>
  );
}
