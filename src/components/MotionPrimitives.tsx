import { useEffect, useRef, useState, type ReactNode } from 'react';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  durationMs?: number;
}

export function AnimatedNumber({
  value,
  suffix = '',
  durationMs = 520,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevRef = useRef(0);

  useEffect(() => {
    const startVal = prevRef.current;
    const targetVal = Number.isFinite(value) ? value : 0;

    if (prefersReducedMotion() || startVal === targetVal) {
      prevRef.current = targetVal;
      setDisplayValue(targetVal);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(startVal + (targetVal - startVal) * eased);
      setDisplayValue(nextVal);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = targetVal;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      prevRef.current = targetVal;
    };
  }, [value, durationMs]);

  return (
    <span className="tabular-nums">
      {new Intl.NumberFormat('vi-VN').format(displayValue)}
      {suffix}
    </span>
  );
}

interface AnimatedProgressBarProps {
  percent: number;
  barClassName: string;
  trackClassName?: string;
}

export function AnimatedProgressBar({
  percent,
  barClassName,
  trackClassName = 'w-full h-1.5 bg-slate-100 rounded-full overflow-hidden',
}: AnimatedProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const [visualWidth, setVisualWidth] = useState(() =>
    prefersReducedMotion() ? clamped : 0
  );

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisualWidth(clamped);
      return;
    }
    const raf = requestAnimationFrame(() => {
      setVisualWidth(clamped);
    });
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  return (
    <div className={trackClassName}>
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${barClassName}`}
        style={{ width: `${visualWidth}%` }}
      />
    </div>
  );
}

interface RevealBlockProps {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}

export function RevealBlock({
  children,
  delayMs = 0,
  className = '',
}: RevealBlockProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -24px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:transform-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}
    >
      {children}
    </div>
  );
}
