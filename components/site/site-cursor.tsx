'use client';

import {useEffect, useRef} from 'react';

import {usePrefersReducedMotion} from '@/components/motion/reduced-motion-provider';

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, summary, [role="button"], [data-cursor-interactive="true"]';

export function SiteCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const cursor = cursorRef.current;
    const scope = document.querySelector<HTMLElement>('.site-cursor-scope');
    const supportsFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (!cursor || !scope || !supportsFinePointer) {
      return;
    }

    let targetX = -100;
    let targetY = -100;
    let ringX = targetX;
    let ringY = targetY;
    let frame = 0;

    const setVisible = (visible: boolean) => {
      cursor.dataset.visible = visible ? 'true' : 'false';
    };

    const setPressed = (pressed: boolean) => {
      cursor.dataset.pressed = pressed ? 'true' : 'false';
    };

    const updateInteractiveState = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      cursor.dataset.interactive = element?.closest(INTERACTIVE_SELECTOR) ? 'true' : 'false';
    };

    const render = () => {
      if (prefersReducedMotion) {
        ringX = targetX;
        ringY = targetY;
      } else {
        ringX += (targetX - ringX) * 0.22;
        ringY += (targetY - ringY) * 0.22;
      }

      cursor.style.setProperty('--site-cursor-x', `${targetX}px`);
      cursor.style.setProperty('--site-cursor-y', `${targetY}px`);
      cursor.style.setProperty('--site-cursor-ring-x', `${ringX}px`);
      cursor.style.setProperty('--site-cursor-ring-y', `${ringY}px`);
      frame = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') {
        return;
      }

      targetX = event.clientX;
      targetY = event.clientY;
      setVisible(true);
      updateInteractiveState(event.target);
    };

    const onPointerLeave = () => setVisible(false);
    const onPointerDown = () => setPressed(true);
    const onPointerUp = () => setPressed(false);

    cursor.dataset.active = 'true';
    scope.classList.add('is-site-cursor-enabled');
    frame = window.requestAnimationFrame(render);

    window.addEventListener('pointermove', onPointerMove, {passive: true});
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onPointerLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
      scope.classList.remove('is-site-cursor-enabled');
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={cursorRef}
      className="site-cursor"
      aria-hidden="true"
      data-active="false"
      data-visible="false"
      data-interactive="false"
      data-pressed="false"
    >
      <span className="site-cursor__ring" />
      <span className="site-cursor__dot" />
    </div>
  );
}
