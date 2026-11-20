import { useState } from 'react';
import { Calendar } from 'lucide-react';

interface EventBannerProps {
  src: string;
  alt: string;
  className?: string;
}

export function EventBanner({ src, alt, className = '' }: EventBannerProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-100 to-indigo-100 text-indigo-700 px-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Calendar className="w-8 h-8 mb-2 opacity-75" strokeWidth={1.75} />
        <span className="text-xs font-medium text-slate-600 line-clamp-1 max-w-xs">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
}
