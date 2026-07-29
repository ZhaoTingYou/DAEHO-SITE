const LEGACY_STORAGE_IMAGE_KEYS = new Set(`
bg1.jpg
bg2.jpg
bg3.jpg
c1.png
c2.png
c3.png
chronicle_detail_01.png
chronicle_detail_02.png
chronicle_detail_03.png
chronicle_hero.png
chronicle_milestone_01.png
chronicle_milestone_02.png
chronicle_milestone_03.png
chronicle_milestone_04.png
chronicle_milestone_05.png
chronicle_milestone_06.png
cl1.png
cl2.png
cl3.png
cl4.png
collection_detail_01.png
collection_detail_02.png
collection_detail_03.png
collection_detail_04.png
collection_detail_05.png
collection_ring1.png
collection_ring2.png
collection_ring3.png
collection_ring_01.png
collection_ring_02.png
collection_ring_03.png
collection_ring_04.png
collection_ring_05.png
collection_ring_06.png
collection_ring_07.png
collection_ring_08.png
collection_ring_09.png
collection_ring_10.png
collection_ring_11.png
collection_ring_12.png
golf/1.png
golf/2.png
golf/3.png
golf/4.png
golf/Mask group.png
golf/golf s1.png
golf/golf s2.png
golf/golf s3.png
golf/golf s4.png
golf/golf1.png
golf/golf2.png
golf/section2 nb.png
golf/section2.png
golf/골프채,_테니스채_제품1 2.png
golf/골프채,_테니스채_제품1 3.png
golf/드라이버.png
golf/퍼터.png
golf_hero.png
home2_video_poster.jpg
home_hero.png
home_pillar_chronicle.png
home_pillar_legacy.png
home_pillar_news.png
home_pillar_specialty.png
home_ring_01.png
home_ring_02.png
home_ring_03.png
home_ring_04.png
home_ring_05.png
home_stats_bg.png
home_video_poster.jpg
legacy_achievement_01.png
legacy_achievement_02.png
legacy_achievement_03.png
legacy_achievement_04.png
legacy_achievement_hero.png
legacy_card_achievement.png
legacy_card_credibility.png
legacy_card_loyalty.png
legacy_credibility_hero.png
legacy_hero.png
legacy_loyalty_hero.png
legacy_partner_placeholder.png
logo.png
news_card_01.png
news_card_02.png
news_card_03.png
news_card_04.png
news_card_05.png
news_card_06.png
news_detail_hero.png
news_featured.png.png
specialty_bespoke.png
specialty_card_collection.png
specialty_card_technique.png
specialty_collection_hero.png
specialty_detail_01.png
specialty_detail_02.png
specialty_detail_03.png
specialty_hero.png
specialty_process_1_sketch.png
specialty_process_2_modeling.png
specialty_process_3_casting.png
specialty_process_4_setting.png
specialty_process_5_polishing.png
specialty_process_6_packaging.png
specialty_process_7_delivery.png
specialty_technique_hero.png
team-logos/anyang-kgc.png
team-logos/busan-kcc-egis.png
team-logos/cheongju-kb-stars.png
team-logos/doosan-bears.png
team-logos/gs-caltex-seoul-kixx.png
team-logos/heungkuk-life-pink-spiders.png
team-logos/hyundai-capital-skywalkers.png
team-logos/jeonbuk-hyundai-motors.png
team-logos/kgc-ginseng-volleyball.png
team-logos/korean-air-jumbos.png
team-logos/kt-wiz.png
team-logos/nc-dinos.png
team-logos/samsung-lions.png
team-logos/ssg-landers.png
team-logos/ulsan-hd-fc.png
team-logos/ulsan-hyundai-mobis-phoebus.png
`.trim().split('\n').map((key) => key.normalize('NFC')));

export function isKnownStorageImageKey(value) {
  const assetPath = value.trim().split(/[?#]/)[0] ?? '';
  const withoutLegacyPrefix = assetPath.replace(/^\/?(?:images|uploads)\//, '');
  const normalized = safelyDecodePath(withoutLegacyPrefix)
    .replace(/^\/+/, '')
    .normalize('NFC');

  return LEGACY_STORAGE_IMAGE_KEYS.has(normalized);
}

function safelyDecodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
