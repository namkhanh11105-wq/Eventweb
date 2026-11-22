import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* -------------------------------------------------------------------------- */
/* Zero-rerender Pointer Spotlight Helper for Interactive Cards               */
/* -------------------------------------------------------------------------- */

export function handleSpotlightMove(e: MouseEvent<HTMLElement>): void {
  if (prefersReducedMotion()) return;
  const target = e.currentTarget;
  const rect = target.getBoundingClientRect();
  target.style.setProperty('--ef-mx', `${e.clientX - rect.left}px`);
  target.style.setProperty('--ef-my', `${e.clientY - rect.top}px`);
}

/* -------------------------------------------------------------------------- */
/* Global Top Progress Bar Emitter + Component (Linear / GitHub / YouTube)    */
/* -------------------------------------------------------------------------- */

const progressListeners = new Set<() => void>();

export function triggerPageProgress(): void {
  progressListeners.forEach((listener) => listener());
}

export function TopProgressBar() {
  const [phase, setPhase] = useState<'idle' | 'sweeping' | 'finishing'>('idle');
  const [scale, setScale] = useState(0);
  const timersRef = useRef<number[]>([]);
  const lastTriggerRef = useRef(0);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const startSweep = useCallback(() => {
    if (prefersReducedMotion()) return;
    const now = performance.now();
    if (now - lastTriggerRef.current < 120) return;
    lastTriggerRef.current = now;

    clearAllTimers();
    setPhase('sweeping');
    setScale(0.08);

    const t1 = window.setTimeout(() => {
      setScale(0.76);
    }, 16);

    const t2 = window.setTimeout(() => {
      setPhase('finishing');
      setScale(1);
    }, 240);

    const t3 = window.setTimeout(() => {
      setPhase('idle');
      setScale(0);
    }, 520);

    timersRef.current.push(t1, t2, t3);
  }, [clearAllTimers]);

  useEffect(() => {
    progressListeners.add(startSweep);
    return () => {
      progressListeners.delete(startSweep);
      clearAllTimers();
    };
  }, [startSweep, clearAllTimers]);

  if (phase === 'idle') return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-[100] h-[2px] overflow-hidden bg-transparent"
    >
      <div
        className={`relative h-full w-full origin-left bg-gradient-to-r from-rose-500 via-orange-500 to-indigo-500 shadow-[0_0_10px_rgba(244,63,94,0.55)] transition-[transform,opacity] ${
          phase === 'sweeping'
            ? 'duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] opacity-100'
            : 'duration-[260ms] ease-out opacity-0'
        }`}
        style={{ transform: `scaleX(${scale})` }}
      >
        <span className="ef-top-progress-sheen absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/75 to-transparent" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sliding Active Indicator Hook for Horizontal & Vertical Navbars            */
/* -------------------------------------------------------------------------- */

interface IndicatorRect {
  x: number;
  y: number;
  width: number;
  height: number;
  ready: boolean;
}

export function useSlidingIndicator(activeKey: string, dependencySignal?: unknown) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [rect, setRect] = useState<IndicatorRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    ready: false,
  });

  const setItemRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) {
        itemRefs.current.set(key, el);
      } else {
        itemRefs.current.delete(key);
      }
    },
    []
  );

  const measure = useCallback(() => {
    const container = containerRef.current;
    const activeEl = itemRefs.current.get(activeKey);
    if (!container || !activeEl) {
      setRect((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }

    const nextX = activeEl.offsetLeft;
    const nextY = activeEl.offsetTop;
    const nextW = activeEl.offsetWidth;
    const nextH = activeEl.offsetHeight;

    setRect((prev) => {
      if (
        prev.ready &&
        prev.x === nextX &&
        prev.y === nextY &&
        prev.width === nextW &&
        prev.height === nextH
      ) {
        return prev;
      }
      return { x: nextX, y: nextY, width: nextW, height: nextH, ready: true };
    });
  }, [activeKey]);

  useLayoutEffect(() => {
    measure();
  }, [measure, dependencySignal]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    const activeEl = itemRefs.current.get(activeKey);
    if (activeEl) ro.observe(activeEl);
    return () => ro.disconnect();
  }, [activeKey, measure, dependencySignal]);

  return { containerRef, setItemRef, rect };
}

/* -------------------------------------------------------------------------- */
/* Animated Modal with 320ms Spring Scale & Backdrop Blur Enter/Exit          */
/* -------------------------------------------------------------------------- */

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
  labelledBy?: string;
  backdropClassName?: string;
  panelClassName?: string;
  closeOnBackdropClick?: boolean;
}

export function AnimatedModal({
  isOpen,
  onClose,
  children,
  maxWidthClassName = 'max-w-3xl',
  labelledBy,
  backdropClassName = 'bg-slate-900/55 backdrop-blur-sm p-3 sm:p-6',
  panelClassName = 'bg-white border border-slate-200 rounded-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl',
  closeOnBackdropClick = true,
}: AnimatedModalProps) {
  const [rendered, setRendered] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      if (prefersReducedMotion()) {
        setVisible(true);
        return;
      }
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }

    setVisible(false);
    if (!rendered) return;
    const delay = prefersReducedMotion() ? 0 : 320;
    const timer = window.setTimeout(() => {
      setRendered(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [isOpen, rendered]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!rendered || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center transition-[opacity,backdrop-filter] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${backdropClassName} ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`${maxWidthClassName} ${panelClassName} transition-[opacity,transform] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.95] translate-y-2.5'
        }`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* -------------------------------------------------------------------------- */
/* Animated KPI Numbers, GPU Progress Bars & Scroll Reveals                   */
/* -------------------------------------------------------------------------- */

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  durationMs?: number;
}

export function AnimatedNumber({
  value,
  suffix = '',
  durationMs = 580,
}: AnimatedNumberProps) {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState<number>(() =>
    prefersReducedMotion() ? safeTarget : 0
  );
  const currentValRef = useRef<number>(prefersReducedMotion() ? safeTarget : 0);

  useEffect(() => {
    const startVal = currentValRef.current;
    const targetVal = safeTarget;

    if (prefersReducedMotion() || startVal === targetVal) {
      currentValRef.current = targetVal;
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
      currentValRef.current = nextVal;
      setDisplayValue(nextVal);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        currentValRef.current = targetVal;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [safeTarget, durationMs]);

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
  const targetRatio = clamped / 100;
  const [visualRatio, setVisualRatio] = useState(() =>
    prefersReducedMotion() ? targetRatio : 0
  );

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisualRatio(targetRatio);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setVisualRatio(targetRatio);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [targetRatio]);

  return (
    <div className={trackClassName}>
      <div
        className={`h-full w-full origin-left rounded-full transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none ${barClassName}`}
        style={{ transform: `scaleX(${visualRatio})` }}
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
      className={`transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}
    >
      {children}
    </div>
  );
}
