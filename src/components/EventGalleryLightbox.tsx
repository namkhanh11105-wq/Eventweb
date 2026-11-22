import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Images,
  X,
  ZoomIn,
} from 'lucide-react';
import type { EventGalleryImage } from '../types';

interface EventGallerySectionProps {
  galleryImages?: EventGalleryImage[];
  eventTitle: string;
}

export function EventGallerySection({
  galleryImages,
  eventTitle,
}: EventGallerySectionProps) {
  const images = (galleryImages || []).filter(
    (img) => Boolean(img && img.url && img.url.trim())
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const isLightboxOpen = activeIndex !== null && images.length > 0;
  const safeIndex =
    activeIndex !== null && images.length > 0
      ? Math.max(0, Math.min(activeIndex, images.length - 1))
      : 0;
  const activeImage = isLightboxOpen ? images[safeIndex] : null;

  useEffect(() => {
    if (!isLightboxOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveIndex(null);
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        e.preventDefault();
        setActiveIndex((idx) =>
          idx === null ? 0 : (idx + 1) % images.length
        );
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        e.preventDefault();
        setActiveIndex((idx) =>
          idx === null ? 0 : (idx - 1 + images.length) % images.length
        );
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, images.length]);

  if (images.length === 0) {
    return null;
  }

  function goPrev() {
    setActiveIndex((idx) =>
      idx === null ? 0 : (idx - 1 + images.length) % images.length
    );
  }

  function goNext() {
    setActiveIndex((idx) => (idx === null ? 0 : (idx + 1) % images.length));
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Images className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Hình ảnh địa điểm &amp; chuẩn bị</span>
        </h2>
        <span className="text-xs font-medium text-slate-500 tabular-nums">
          {images.length} ảnh · Nhấn để phóng to
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, idx) => (
          <button
            key={img.id || `${img.url}-${idx}`}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className="group relative rounded-xl overflow-hidden border border-slate-200/80 bg-slate-100 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <div className="aspect-[16/10] w-full overflow-hidden">
              <img
                src={img.url}
                alt={img.caption || `${eventTitle} — Hình ảnh ${idx + 1}`}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              />
            </div>

            <div className="pointer-events-none absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-colors duration-200 flex items-center justify-center">
              <span className="w-9 h-9 rounded-full bg-white/90 text-slate-900 shadow-md flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200">
                <ZoomIn className="w-4 h-4" />
              </span>
            </div>

            {img.caption && (
              <div className="px-2.5 py-2 bg-white border-t border-slate-100">
                <p className="text-xs font-medium text-slate-700 truncate">
                  {img.caption}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal via Portal */}
      {isLightboxOpen &&
        activeImage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Xem ảnh phóng to: ${activeImage.caption || eventTitle}`}
            onClick={() => setActiveIndex(null)}
            className="fixed inset-0 z-[120] bg-slate-950/88 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-ef-fade-in"
          >
            {/* Top Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between gap-4 text-white max-w-6xl w-full mx-auto"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300 tabular-nums">
                  <span>
                    {safeIndex + 1} / {images.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-sans truncate text-slate-200">
                    {eventTitle}
                  </span>
                </div>
                {activeImage.caption && (
                  <p className="mt-0.5 text-sm sm:text-base font-semibold text-white truncate">
                    {activeImage.caption}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label="Đóng trình xem ảnh"
                onClick={() => setActiveIndex(null)}
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Center Stage */}
            <div className="relative flex-1 flex items-center justify-center min-h-0 my-4 max-w-6xl w-full mx-auto">
              {images.length > 1 && (
                <button
                  type="button"
                  aria-label="Ảnh trước"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute left-1 sm:left-3 z-10 w-11 h-11 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white border border-white/15 flex items-center justify-center cursor-pointer transition-colors shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <div
                onClick={(e) => e.stopPropagation()}
                className="relative max-h-full max-w-full flex flex-col items-center justify-center"
              >
                <img
                  src={activeImage.url}
                  alt={activeImage.caption || `${eventTitle} — Hình ảnh ${safeIndex + 1}`}
                  referrerPolicy="no-referrer"
                  className="max-h-[72vh] max-w-full w-auto object-contain rounded-2xl shadow-2xl border border-white/10 bg-slate-900"
                />
              </div>

              {images.length > 1 && (
                <button
                  type="button"
                  aria-label="Ảnh tiếp theo"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute right-1 sm:right-3 z-10 w-11 h-11 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white border border-white/15 flex items-center justify-center cursor-pointer transition-colors shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Bottom Thumbnails */}
            {images.length > 1 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-2 overflow-x-auto pb-1 max-w-4xl mx-auto w-full"
              >
                {images.map((thumb, idx) => {
                  const isActive = idx === safeIndex;
                  return (
                    <button
                      key={thumb.id || `${thumb.url}-thumb-${idx}`}
                      type="button"
                      aria-label={`Chuyển đến ảnh ${idx + 1}`}
                      onClick={() => setActiveIndex(idx)}
                      className={`w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'border-white scale-105 shadow-md'
                          : 'border-white/25 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={thumb.url}
                        alt={thumb.caption || `Ảnh thu nhỏ ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>,
          document.body
        )}
    </section>
  );
}
