import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import { ArrowRight, Calendar, MapPin, Sparkles } from 'lucide-react';
import { EventBanner } from './EventBanner';
import { canUsePointer3D } from './MotionPrimitives';
import { matchesEventCategoryFilter } from '../utils/formatters';
import type { EventItem } from '../types';

interface FloatingCardSpec {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  matchCategory?: string;
  positionClass: string;
  sizeClass: string;
  floatClass: string;
  rotateDeg: string;
  delayMs: number;
  depthFactor: number;
  zDepthPx: string;
}

const FLOATING_CARDS: FloatingCardSpec[] = [
  {
    id: 'workshop',
    title: 'Workshop Sáng tạo',
    subtitle: 'Thiết kế & Thực hành · T7',
    imageUrl: '/src/assets/images/event_design_workshop_1795132977362.jpg',
    matchCategory: 'Hội thảo / Workshop',
    positionClass: 'top-6 left-6 xl:left-12',
    sizeClass: 'w-44 xl:w-48',
    floatClass: 'ef-float-a',
    rotateDeg: '-3.5deg',
    delayMs: 0,
    depthFactor: 0.85,
    zDepthPx: '12px',
  },
  {
    id: 'picnic',
    title: 'Teambuilding Ngoài trời',
    subtitle: 'Công viên · Gắn kết đội ngũ',
    imageUrl: '/src/assets/images/outdoor_picnic_gathering_1795317964164.jpg',
    matchCategory: 'Hoạt động ngoại khóa / Teambuilding',
    positionClass: 'bottom-6 left-10 xl:left-20',
    sizeClass: 'w-44 xl:w-48',
    floatClass: 'ef-float-b',
    rotateDeg: '3deg',
    delayMs: 450,
    depthFactor: 1,
    zDepthPx: '20px',
  },
  {
    id: 'music-night',
    title: 'Đêm nhạc Acoustic',
    subtitle: 'Sân khấu mở · 19:30',
    imageUrl: '/src/assets/images/event_music_festival_1795132976683.jpg',
    matchCategory: 'Sự kiện văn hóa / Nghệ thuật / Ca nhạc',
    positionClass: 'top-6 right-6 xl:right-12',
    sizeClass: 'w-44 xl:w-48',
    floatClass: 'ef-float-b',
    rotateDeg: '3.5deg',
    delayMs: 250,
    depthFactor: 0.85,
    zDepthPx: '12px',
  },
  {
    id: 'rooftop-party',
    title: 'Tiệc Gala Rooftop',
    subtitle: 'Gala & Networking VIP',
    imageUrl: '/src/assets/images/evening_social_party_1795317965105.jpg',
    matchCategory: 'Tiệc Gala / Ra mắt sản phẩm',
    positionClass: 'bottom-6 right-10 xl:right-20',
    sizeClass: 'w-44 xl:w-48',
    floatClass: 'ef-float-c',
    rotateDeg: '-3deg',
    delayMs: 700,
    depthFactor: 1,
    zDepthPx: '20px',
  },
];

interface LumaFloatingHeroProps {
  publicEvents: EventItem[];
  onCreateFirstEvent: () => void;
  onExploreEvents: () => void;
  onSelectCard: (matchCategory?: string) => void;
}

export function LumaFloatingHero({
  publicEvents,
  onCreateFirstEvent,
  onExploreEvents,
  onSelectCard,
}: LumaFloatingHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const parallaxRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (parallaxRafRef.current !== null) {
        cancelAnimationFrame(parallaxRafRef.current);
      }
    };
  }, []);

  function handleHeroMouseMove(e: MouseEvent<HTMLElement>) {
    if (!canUsePointer3D()) return;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;

    const sectionEl = heroRef.current;
    if (!sectionEl) return;

    const rect = sectionEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    const clampedX = Math.max(-12, Math.min(12, nx * 24));
    const clampedY = Math.max(-12, Math.min(12, ny * 24));

    if (parallaxRafRef.current !== null) {
      cancelAnimationFrame(parallaxRafRef.current);
    }

    parallaxRafRef.current = requestAnimationFrame(() => {
      sectionEl.style.setProperty('--ef-px', `${clampedX.toFixed(2)}px`);
      sectionEl.style.setProperty('--ef-py', `${clampedY.toFixed(2)}px`);
      parallaxRafRef.current = null;
    });
  }

  function handleHeroMouseLeave() {
    if (parallaxRafRef.current !== null) {
      cancelAnimationFrame(parallaxRafRef.current);
      parallaxRafRef.current = null;
    }
    const sectionEl = heroRef.current;
    if (!sectionEl) return;
    sectionEl.style.setProperty('--ef-px', '0px');
    sectionEl.style.setProperty('--ef-py', '0px');
  }

  return (
    <section
      ref={heroRef}
      onMouseMove={handleHeroMouseMove}
      onMouseLeave={handleHeroMouseLeave}
      className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white px-4 py-10 sm:px-8 sm:py-16 lg:flex lg:min-h-[540px] xl:min-h-[560px] lg:flex-col lg:items-center lg:justify-center lg:px-10 lg:py-20"
    >
      {/* Soft Luma-inspired Warm Ambient Radial Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-rose-200/45 via-orange-200/45 to-amber-100/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-12 h-64 w-64 rounded-full bg-indigo-100/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-12 h-64 w-64 rounded-full bg-rose-100/45 blur-3xl"
      />

      {/* Desktop 4-Corner Multi-Layer 3D Parallax Floating Cards */}
      <div className="ef-hero-3d-stage pointer-events-none absolute inset-0 hidden lg:block">
        {FLOATING_CARDS.map((card) => {
          const matchedEvent = card.matchCategory
            ? publicEvents.find((e) => matchesEventCategoryFilter(e.category, card.matchCategory!))
            : undefined;
          const displayTitle = matchedEvent ? matchedEvent.title : card.title;
          const displaySub = matchedEvent ? matchedEvent.location : card.subtitle;

          return (
            <div
              key={card.id}
              style={
                {
                  '--ef-depth': card.depthFactor,
                  '--ef-pz': card.zDepthPx,
                } as CSSProperties
              }
              className={`ef-hero-parallax-layer pointer-events-auto transition-transform duration-300 ease-out ${card.positionClass} absolute z-10`}
            >
              <button
                type="button"
                onClick={() => onSelectCard(card.matchCategory)}
                style={
                  {
                    '--ef-rot': card.rotateDeg,
                    animationDelay: `${card.delayMs}ms`,
                  } as CSSProperties
                }
                className={`ef-floating-card ${card.floatClass} ${card.sizeClass} rounded-2xl border border-white/90 bg-white/95 p-2 text-left shadow-[0_18px_38px_-14px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/5 backdrop-blur-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`}
              >
                <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100">
                  <EventBanner
                    src={matchedEvent?.bannerUrl || card.imageUrl}
                    category={matchedEvent?.category || card.matchCategory}
                    alt={displayTitle}
                    className="h-full w-full"
                  />
                </div>
                <div className="px-1.5 pb-0.5 pt-2">
                  <div className="truncate text-xs font-bold text-slate-900">{displayTitle}</div>
                  <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                    {matchedEvent ? (
                      <MapPin className="h-3 w-3 shrink-0 text-rose-500" />
                    ) : (
                      <Calendar className="h-3 w-3 shrink-0 text-orange-500" />
                    )}
                    <span className="truncate">{displaySub}</span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Centered Luma Hero Copy & Primary Actions (Safe Zone away from corner cards) */}
      <div className="relative z-20 mx-auto max-w-2xl text-center lg:px-14 xl:px-10">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/70 bg-orange-50/80 px-3 py-1 text-[11px] sm:text-xs font-semibold text-orange-700 animate-ef-fade-up">
          <Sparkles className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <span>EventFlow · Trải nghiệm sự kiện sống động</span>
        </div>

        <h1
          className="mt-4 sm:mt-5 text-[1.95rem] font-bold tracking-tight text-balance leading-[1.15] sm:text-5xl lg:text-[3.35rem] animate-ef-fade-up"
          style={{ animationDelay: '70ms' }}
        >
          <span className="block text-slate-900">Sự kiện tuyệt vời</span>
          <span className="mt-1 block bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            bắt đầu từ đây
          </span>
        </h1>

        <p
          className="mx-auto mt-3.5 sm:mt-4 max-w-md text-xs sm:text-[15px] leading-relaxed text-slate-500 animate-ef-fade-up"
          style={{ animationDelay: '130ms' }}
        >
          Khởi tạo trang sự kiện truyền cảm hứng, điều phối dịch vụ trọn gói, quản lý khách mời
          và check-in mã QR đồng bộ thời gian thực.
        </p>

        <div
          className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 animate-ef-fade-up"
          style={{ animationDelay: '180ms' }}
        >
          <button
            type="button"
            onClick={onCreateFirstEvent}
            className="ef-btn-tactile w-full sm:w-auto inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 sm:px-7 text-sm font-semibold text-white shadow-[0_14px_30px_-10px_rgba(15,23,42,0.45)] hover:-translate-y-0.5 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <span>Tạo sự kiện đầu tiên của bạn</span>
          </button>

          <button
            type="button"
            onClick={onExploreEvents}
            className="w-full sm:w-auto group inline-flex h-11 sm:h-12 items-center justify-center gap-1.5 rounded-full border border-slate-200 sm:border-transparent bg-slate-50/80 sm:bg-transparent px-4 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950 cursor-pointer whitespace-nowrap"
          >
            <span>Khám phá sự kiện</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Showcase Strip (placed cleanly below Hero CTA without obscuring text) */}
      <div className="relative z-20 mt-8 sm:mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:hidden">
        {FLOATING_CARDS.slice(0, 4).map((card, idx) => {
          const matchedEvent = card.matchCategory
            ? publicEvents.find((e) => matchesEventCategoryFilter(e.category, card.matchCategory!))
            : undefined;
          const displayTitle = matchedEvent ? matchedEvent.title : card.title;
          const displaySub = matchedEvent ? matchedEvent.location : card.subtitle;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectCard(card.matchCategory)}
              className={`rounded-2xl border border-slate-200/85 bg-white/95 p-1.5 text-left shadow-sm transition-transform active:scale-[0.98] cursor-pointer ${
                idx >= 2 ? 'hidden sm:block' : ''
              }`}
            >
              <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100">
                <EventBanner
                  src={matchedEvent?.bannerUrl || card.imageUrl}
                  category={matchedEvent?.category || card.matchCategory}
                  alt={displayTitle}
                  className="h-full w-full"
                />
              </div>
              <div className="px-1.5 pb-1 pt-2">
                <div className="truncate text-xs font-bold text-slate-900">{displayTitle}</div>
                <div className="truncate text-[11px] text-slate-500">{displaySub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
