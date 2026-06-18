'use client';

import {type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, useRef, useState} from 'react';

type DraggableScrollProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function DraggableScroll({children, className, ariaLabel}: DraggableScrollProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    isActive: false,
    hasMoved: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0
  });
  const [isDragging, setIsDragging] = useState(false);

  const endDrag = (event?: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;

    if (event && scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }

    dragState.current.isActive = false;
    dragState.current.pointerId = -1;
    setIsDragging(false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;

    if (!scroller || event.button !== 0 || event.pointerType === 'touch') {
      return;
    }

    dragState.current = {
      isActive: true,
      hasMoved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft
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
    state.hasMoved = state.hasMoved || Math.abs(deltaX) > 4;
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
