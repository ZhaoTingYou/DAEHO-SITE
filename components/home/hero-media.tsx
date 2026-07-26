'use client';

import {useEffect, useRef, useState} from 'react';
import {motion, useScroll, useTransform} from 'framer-motion';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';
import {PlaceholderImg} from '@/components/placeholder-img';
import {ResponsiveCmsImage} from '@/components/responsive-cms-image';
import {imageSrc} from '@/lib/image-src';
import {resolveVideoSource} from '@/lib/video-src';

type HeroMediaProps = {
  poster: string;
  mobilePoster?: string;
  videoPoster?: string;
  mobileVideoPoster?: string;
  videoSrc?: string;
  webmSrc?: string;
  priority?: boolean;
  className?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

export function HeroMedia({
  poster,
  mobilePoster,
  videoPoster,
  mobileVideoPoster,
  videoSrc,
  webmSrc,
  priority = false,
  className = ''
}: HeroMediaProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [saveData] = useState(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const connection = (navigator as NavigatorWithConnection).connection;
    return Boolean(connection?.saveData);
  });
  const [coarsePointer, setCoarsePointer] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(pointer: coarse)').matches;
  });
  const [mobileViewport, setMobileViewport] = useState<boolean | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const {scrollYProgress} = useScroll({
    target: frameRef,
    offset: ['start start', 'end start']
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -72]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const updatePointer = () => setCoarsePointer(mediaQuery.matches);
    const updateMobileViewport = () => setMobileViewport(mobileQuery.matches);
    updateMobileViewport();
    mediaQuery.addEventListener('change', updatePointer);
    mobileQuery.addEventListener('change', updateMobileViewport);

    return () => {
      mediaQuery.removeEventListener('change', updatePointer);
      mobileQuery.removeEventListener('change', updateMobileViewport);
    };
  }, []);

  const resolvedMobilePoster = mobilePoster ? imageSrc(mobilePoster) : undefined;
  const selectedVideoPoster = mobileViewport === null
    ? undefined
    : mobileViewport && mobileVideoPoster
      ? mobileVideoPoster
      : videoPoster;
  const resolvedVideoPoster = selectedVideoPoster ? imageSrc(selectedVideoPoster) : undefined;
  const resolvedVideoSrc = resolveVideoSource(videoSrc);
  const resolvedWebmSrc = resolveVideoSource(webmSrc);
  const shouldRenderVideo =
    Boolean(resolvedVideoSrc || resolvedWebmSrc) && !prefersReducedMotion && !saveData && !videoFailed;
  const shouldAnimate = !prefersReducedMotion && !coarsePointer && !saveData;

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !shouldRenderVideo) {
      return;
    }

    let isInView = true;
    video.muted = true;

    const play = () => {
      video.muted = true;
      video.play().catch(() => {});
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInView = entry.isIntersecting;

        if (isInView && !document.hidden) {
          play();
        } else {
          video.pause();
        }
      },
      {threshold: 0.1}
    );

    observer.observe(video);

    const onVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else if (isInView) {
        play();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    play();

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      video.pause();
    };
  }, [shouldRenderVideo]);

  return (
    <motion.div
      ref={frameRef}
      aria-hidden="true"
      className={`overflow-hidden ${className}`}
      style={{y: shouldAnimate ? y : 0}}
    >
      <div className="h-full w-full">
        <motion.div
          className="relative h-full w-full"
          initial={false}
        >
          {imageFailed ? (
            <PlaceholderImg filename={poster} aspect="h-full" />
          ) : shouldRenderVideo ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={resolvedVideoPoster}
              className="h-full w-full object-cover"
              onError={() => setVideoFailed(true)}
            >
              {resolvedWebmSrc ? <source src={resolvedWebmSrc} type="video/webm" /> : null}
              {resolvedVideoSrc ? <source src={resolvedVideoSrc} type="video/mp4" /> : null}
            </video>
          ) : (
            <ResponsiveCmsImage
              filename={poster}
              mobileFilename={resolvedMobilePoster}
              alt=""
              priority={priority}
              sizes="100vw"
              className="object-cover"
              onDesktopError={() => setImageFailed(true)}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
