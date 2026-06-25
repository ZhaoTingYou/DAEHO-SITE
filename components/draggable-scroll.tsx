'use client';

import {type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState} from 'react';

type DraggableScrollProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  autoScroll?: boolean;
  autoScrollResetRatio?: number;
  autoScrollSpeed?: number;
};

export function DraggableScroll({
  children,
  className,
  ariaLabel,
  autoScroll = false,
  autoScrollResetRatio = 1,
  autoScrollSpeed = 18
}: DraggableScrollProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const momentumRef = useRef<number | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const autoScrollPositionRef = useRef(0);
  const dragState = useRef({
    isActive: false,
    hasMoved: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0
  });
  const [isDragging, setIsDragging] = useState(false);

  const cancelMomentum = () => {
    if (momentumRef.current === null) {
      return;
    }

    cancelAnimationFrame(momentumRef.current);
    momentumRef.current = null;
  };

  const startMomentum = () => {
    const scroller = scrollerRef.current;
    let velocity = Math.max(-2.4, Math.min(2.4, dragState.current.velocity));

    if (!scroller || Math.abs(velocity) < 0.06 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let lastTime = performance.now();

    const animate = (time: number) => {
      const elapsed = Math.min(32, time - lastTime);
      lastTime = time;
      scroller.scrollLeft += velocity * elapsed;
      velocity *= 0.93;

      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      const hitStart = scroller.scrollLeft <= 0 && velocity < 0;
      const hitEnd = scroller.scrollLeft >= maxScrollLeft && velocity > 0;

      if (Math.abs(velocity) < 0.02 || hitStart || hitEnd) {
        momentumRef.current = null;
        return;
      }

      momentumRef.current = requestAnimationFrame(animate);
    };

    momentumRef.current = requestAnimationFrame(animate);
  };

  const endDrag = (event?: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    const state = dragState.current;

    if (event && scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }

    state.isActive = false;
    state.pointerId = -1;
    setIsDragging(false);

    if (state.hasMoved) {
      startMomentum();
    }
  };

  const cancelAutoScroll = () => {
    if (autoScrollRef.current === null) {
      return;
    }

    cancelAnimationFrame(autoScrollRef.current);
    autoScrollRef.current = null;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;

    if (!scroller || event.button !== 0) {
      return;
    }

    cancelMomentum();

    dragState.current = {
      isActive: true,
      hasMoved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0
    };

    scroller.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    const state = dragState.current;

    if (!scroller || !state.isActive || state.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    const now = performance.now();
    const elapsed = Math.max(1, now - state.lastTime);
    const moveX = event.clientX - state.lastX;

    state.hasMoved = state.hasMoved || Math.abs(deltaX) > 4;
    state.velocity = -moveX / elapsed;
    state.lastX = event.clientX;
    state.lastTime = now;
    scroller.scrollLeft = state.scrollLeft - deltaX;
    event.preventDefault();
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragState.current.hasMoved) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragState.current.hasMoved = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scroller.scrollBy({left: -320, behavior: 'smooth'});
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scroller.scrollBy({left: 320, behavior: 'smooth'});
    }
  };

  useEffect(
    () => () => {
      if (momentumRef.current !== null) {
        cancelAnimationFrame(momentumRef.current);
      }

      if (autoScrollRef.current !== null) {
        cancelAnimationFrame(autoScrollRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!autoScroll || !scroller || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let lastTime = performance.now();
    autoScrollPositionRef.current = scroller.scrollLeft;

    const animate = (time: number) => {
      const scroller = scrollerRef.current;

      if (!scroller) {
        autoScrollRef.current = null;
        return;
      }

      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      const childCount = scroller.children.length;
      const loopChildIndex = Math.floor(childCount * autoScrollResetRatio);
      const firstChild = scroller.children[0] as HTMLElement | undefined;
      const loopChild = scroller.children[loopChildIndex] as HTMLElement | undefined;
      const loopDistance =
        firstChild && loopChild
          ? loopChild.offsetLeft - firstChild.offsetLeft
          : scroller.scrollWidth * autoScrollResetRatio;
      const loopAt = Math.min(
        maxScrollLeft,
        Math.max(1, loopDistance)
      );
      const shouldMove =
        maxScrollLeft > 0 &&
        !dragState.current.isActive &&
        momentumRef.current === null;

      if (shouldMove) {
        const elapsed = Math.min(32, time - lastTime);

        autoScrollPositionRef.current += (autoScrollSpeed * elapsed) / 1000;

        if (autoScrollPositionRef.current >= loopAt - 1) {
          autoScrollPositionRef.current = Math.max(0, autoScrollPositionRef.current - loopAt);
        }

        scroller.scrollLeft = autoScrollPositionRef.current;
      } else {
        autoScrollPositionRef.current = scroller.scrollLeft;
      }

      lastTime = time;
      autoScrollRef.current = requestAnimationFrame(animate);
    };

    cancelAutoScroll();
    autoScrollRef.current = requestAnimationFrame(animate);

    return cancelAutoScroll;
  }, [autoScroll, autoScrollResetRatio, autoScrollSpeed]);

  return (
    <div
      ref={scrollerRef}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      tabIndex={0}
      className={`${className ?? ''} cursor-grab select-none outline-none ${isDragging ? 'cursor-grabbing' : ''}`}
      onClickCapture={handleClickCapture}
      onDragStart={(event) => event.preventDefault()}
      onKeyDown={handleKeyDown}
      onPointerCancel={endDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
    >
      {children}
    </div>
  );
}
