"use client";

import React, { useEffect, useRef, useState } from 'react';
import { animateStaggeredReveal, animateCounter } from '@/lib/anime-utils';
import { cn } from '@/lib/utils';

interface AnimeStaggerGroupProps {
  children: React.ReactNode;
  className?: string;
  itemSelector?: string;
  delay?: number;
  staggerTime?: number;
  triggerOnScroll?: boolean;
}

export function AnimeStaggerGroup({
  children,
  className,
  itemSelector = ".anime-item",
  delay = 80,
  staggerTime = 60,
  triggerOnScroll = true
}: AnimeStaggerGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || hasTriggered) return;

    const triggerAnimation = () => {
      if (!containerRef.current) return;
      const elements = containerRef.current.querySelectorAll(itemSelector);
      if (elements.length === 0) return;

      animateStaggeredReveal(Array.from(elements) as HTMLElement[], {
        delay,
        staggerTime
      });
      setHasTriggered(true);
    };

    if (!triggerOnScroll || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      triggerAnimation();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerAnimation();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [delay, itemSelector, staggerTime, triggerOnScroll, hasTriggered]);

  return (
    <div ref={containerRef} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}

export function AnimeCounterMetric({
  value,
  duration = 1800,
  className,
  formatter,
  triggerOnScroll = true
}: {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (val: number) => string;
  triggerOnScroll?: boolean;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (!spanRef.current || hasTriggered) return;

    const triggerCount = () => {
      if (!spanRef.current) return;
      animateCounter(spanRef.current, value, duration, formatter);
      setHasTriggered(true);
    };

    if (!triggerOnScroll || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      triggerCount();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerCount();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(spanRef.current);
    return () => observer.disconnect();
  }, [value, duration, formatter, triggerOnScroll, hasTriggered]);

  return <span ref={spanRef} className={cn("font-mono font-bold tracking-tight", className)}>0</span>;
}
