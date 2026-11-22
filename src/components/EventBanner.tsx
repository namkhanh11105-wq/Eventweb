import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getEventCategoryMeta } from '../utils/formatters';

interface EventBannerProps {
  src: string;
  alt: string;
  category?: string;
  className?: string;
}

export function EventBanner({ src, alt, category, className = '' }: EventBannerProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const trimmedSrc = (src || '').trim();

  if (!trimmedSrc || hasError) {
    const catMeta = getEventCategoryMeta(category || '');
    return (
      <div
        className={`relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br ${catMeta.fallbackGradient} px-5 text-center select-none ${className}`}
        role="img"
        aria-label={alt || 'Ảnh bìa sự kiện'}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/15 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-black/15 blur-2xl"
        />
        <div className="relative flex flex-col items-center max-w-xs">
          <span className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 backdrop-blur-xs flex items-center justify-center mb-2 text-white shadow-xs">
            <Calendar className="w-5 h-5" strokeWidth={1.75} />
          </span>
          {category && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80 mb-0.5 line-clamp-1">
              {category}
            </span>
          )}
          <span className="text-xs font-semibold text-white/95 line-clamp-2 leading-snug">
            {alt || 'Sự kiện EventFlow'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={trimmedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
}
