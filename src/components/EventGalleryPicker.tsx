import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlertCircle,
  Check,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  compressImageFileToBase64,
  estimateDataUrlBytes,
  MAX_GALLERY_HARD_CAP_BYTES,
  MAX_GALLERY_IMAGE_BYTES,
} from '../utils/imageCompression';
import type { EventGalleryImage } from '../types';
import {
  DirectionalTabPanel,
  useSlidingIndicator,
  useTabDirection,
} from './MotionPrimitives';

const GALLERY_PICKER_MODES = ['upload', 'url'] as const;

interface EventGalleryPickerProps {
  images: EventGalleryImage[];
  onChange: (nextImages: EventGalleryImage[]) => void;
  currentBannerUrl?: string;
  onSetAsBanner?: (url: string) => void;
  maxImages?: number;
  accentColor?: 'slate' | 'indigo';
}

const TOTAL_EMBEDDED_BUDGET_BYTES = 720 * 1024; // Reserve space for bannerUrl & event fields (<1MB Firestore limit)

export function EventGalleryPicker({
  images,
  onChange,
  currentBannerUrl = '',
  onSetAsBanner,
  maxImages = 8,
  accentColor = 'slate',
}: EventGalleryPickerProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({});

  const remainingSlots = Math.max(0, maxImages - images.length);

  const modeDirection = useTabDirection(mode, GALLERY_PICKER_MODES);
  const {
    containerRef: modeTabRef,
    setItemRef: setModeTabRef,
    rect: modeTabPill,
  } = useSlidingIndicator(mode, accentColor);

  const activePillBgClass =
    accentColor === 'indigo' ? 'bg-indigo-600' : 'bg-slate-950';

  const activeFocusBorder =
    accentColor === 'indigo'
      ? 'focus:border-indigo-600'
      : 'focus:border-slate-900';

  const currentGalleryEmbeddedBytes = images.reduce(
    (sum, img) => sum + (img.url.startsWith('data:image/') ? estimateDataUrlBytes(img.url) : 0),
    0
  );

  async function processFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setErrorMsg(null);
    if (remainingSlots <= 0) {
      setErrorMsg(`Thư viện đã đạt tối đa ${maxImages} ảnh. Vui lòng xóa bớt trước khi thêm.`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const skippedCount = files.length - filesToProcess.length;

    setProcessing(true);
    const added: EventGalleryImage[] = [];
    const errors: string[] = [];
    let runningBytes = currentGalleryEmbeddedBytes;

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        try {
          const result = await compressImageFileToBase64(file, {
            maxWidth: 960,
            targetBytes: MAX_GALLERY_IMAGE_BYTES,
            hardCapBytes: MAX_GALLERY_HARD_CAP_BYTES,
          });
          if (runningBytes + result.byteSize > TOTAL_EMBEDDED_BUDGET_BYTES) {
            errors.push(
              `Tổng dung lượng ảnh tải lên từ thiết bị đã đạt giới hạn an toàn Firestore (${Math.round(
                TOTAL_EMBEDDED_BUDGET_BYTES / 1024
              )}KB). Bạn vẫn có thể thêm ảnh bằng link URL.`
            );
            break;
          }
          runningBytes += result.byteSize;
          added.push({
            id: `gal-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            url: result.dataUrl,
            caption: '',
          });
        } catch (err) {
          errors.push(
            err instanceof Error ? `${file.name}: ${err.message}` : `Không thể đọc ${file.name}.`
          );
        }
      }

      if (added.length > 0) {
        onChange([...images, ...added]);
      }

      if (errors.length > 0) {
        setErrorMsg(errors[0]);
      } else if (skippedCount > 0) {
        setErrorMsg(
          `Đã thêm ${added.length} ảnh. Bỏ qua ${skippedCount} ảnh vì đã đạt tối đa ${maxImages} ảnh.`
        );
      }
    } finally {
      setProcessing(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(e.target.files);
    }
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void processFiles(e.dataTransfer.files);
    }
  }

  function handleAddUrl() {
    setErrorMsg(null);
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng dán đường dẫn ảnh (URL) hợp lệ.');
      return;
    }
    if (remainingSlots <= 0) {
      setErrorMsg(`Thư viện đã đạt tối đa ${maxImages} ảnh.`);
      return;
    }
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setErrorMsg('Đường dẫn ảnh cần bắt đầu bằng http:// hoặc https://.');
      return;
    }
    if (images.some((img) => img.url.trim() === trimmed)) {
      setErrorMsg('Ảnh này đã có trong thư viện.');
      return;
    }

    onChange([
      ...images,
      {
        id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: trimmed,
        caption: '',
      },
    ]);
    setUrlInput('');
  }

  function handleUrlKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl();
    }
  }

  function handleCaptionChange(id: string, caption: string) {
    onChange(
      images.map((img) => (img.id === id ? { ...img, caption } : img))
    );
  }

  function handleRemoveImage(id: string) {
    setErrorMsg(null);
    onChange(images.filter((img) => img.id !== id));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <label
              htmlFor={inputId}
              className="text-xs font-bold text-slate-800 flex items-center gap-1.5"
            >
              <Images className="w-3.5 h-3.5 text-indigo-600" />
              <span>Thư viện ảnh địa điểm / chuẩn bị (tùy chọn)</span>
            </label>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 tabular-nums">
              {images.length}/{maxImages} ảnh
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Đính kèm ảnh khu vực tổ chức, sân khấu, bãi cỏ dã ngoại... Ảnh tải lên được tự động nén nhẹ dưới ~200KB.
          </p>
        </div>

        {/* Input Mode Switch */}
        <div
          ref={modeTabRef}
          role="tablist"
          aria-label="Cách thêm ảnh thư viện"
          className="relative inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-full self-start sm:self-auto shrink-0"
        >
          <span
            aria-hidden="true"
            className={`ef-sliding-pill pointer-events-none absolute top-0 left-0 rounded-full shadow-xs transition-[transform,width,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${activePillBgClass}`}
            style={{
              width: `${modeTabPill.width}px`,
              height: `${modeTabPill.height}px`,
              transform: `translate3d(${modeTabPill.x}px, ${modeTabPill.y}px, 0)`,
              opacity: modeTabPill.ready ? 1 : 0,
            }}
          />
          <button
            ref={setModeTabRef('upload')}
            type="button"
            role="tab"
            aria-selected={mode === 'upload'}
            onClick={() => {
              setErrorMsg(null);
              setMode('upload');
            }}
            className={`relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 cursor-pointer whitespace-nowrap ${
              mode === 'upload'
                ? 'text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải nhiều ảnh</span>
          </button>
          <button
            ref={setModeTabRef('url')}
            type="button"
            role="tab"
            aria-selected={mode === 'url'}
            onClick={() => {
              setErrorMsg(null);
              setMode('url');
            }}
            className={`relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 cursor-pointer whitespace-nowrap ${
              mode === 'url'
                ? 'text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Dán link URL</span>
          </button>
        </div>
      </div>

      {/* Hidden multi-file input */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="sr-only"
      />

      <DirectionalTabPanel activeKey={mode} direction={modeDirection}>
      {mode === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!processing && remainingSlots > 0) fileInputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !processing && remainingSlots > 0) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed transition-colors ${
            remainingSlots <= 0
              ? 'border-slate-200 bg-slate-100/70 cursor-not-allowed opacity-70'
              : isDragging
              ? 'border-indigo-500 bg-indigo-50/70 cursor-pointer'
              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
            </span>
            <div className="min-w-0 text-left">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {processing
                  ? 'Đang thu nhỏ và nén ảnh chuẩn Firestore...'
                  : remainingSlots > 0
                  ? `Chọn hoặc kéo thả ảnh từ máy (còn ${remainingSlots} chỗ)`
                  : `Đã đạt giới hạn tối đa ${maxImages} ảnh`}
              </div>
              <div className="text-[11px] text-slate-500">
                Hỗ trợ chọn nhiều file JPG, PNG, WEBP cùng lúc · Tự động nén nhẹ
              </div>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0 whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Chọn ảnh</span>
          </span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setErrorMsg(null);
                setUrlInput(e.target.value);
              }}
              onKeyDown={handleUrlKeyDown}
              disabled={remainingSlots <= 0}
              placeholder="https://example.com/hinh-anh-dia-diem.jpg"
              className={`w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none ${activeFocusBorder} disabled:opacity-60`}
            />
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            disabled={remainingSlots <= 0 || !urlInput.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            <span>Thêm vào thư viện</span>
          </button>
        </div>
      )}
      </DirectionalTabPanel>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Thumbnail Grid with Caption & Actions */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {images.map((img, idx) => {
            const isCurrentBanner =
              Boolean(currentBannerUrl.trim()) &&
              currentBannerUrl.trim() === img.url.trim();
            const isBroken = Boolean(brokenIds[img.id]);

            return (
              <div
                key={img.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  {!isBroken ? (
                    <img
                      src={img.url}
                      alt={img.caption || `Ảnh địa điểm #${idx + 1}`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenIds((prev) => ({ ...prev, [img.id]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center px-3 text-center bg-slate-100 text-slate-500">
                      <AlertCircle className="w-5 h-5 mb-1 text-amber-500" />
                      <span className="text-[11px]">Không tải được ảnh URL</span>
                    </div>
                  )}

                  {/* Index badge */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/70 backdrop-blur-xs text-[10px] font-mono font-semibold text-white tabular-nums">
                    #{idx + 1}
                  </span>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    aria-label={`Xóa ảnh ${idx + 1}`}
                    title="Xóa ảnh khỏi thư viện"
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/95 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200/80 shadow-xs flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                  <input
                    type="text"
                    maxLength={80}
                    value={img.caption}
                    onChange={(e) => handleCaptionChange(img.id, e.target.value)}
                    placeholder="Chú thích ngắn (tùy chọn)..."
                    className={`w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none ${activeFocusBorder}`}
                  />

                  {onSetAsBanner && (
                    <button
                      type="button"
                      onClick={() => onSetAsBanner(img.url)}
                      disabled={isCurrentBanner}
                      className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                        isCurrentBanner
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                      }`}
                    >
                      {isCurrentBanner ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Đang là ảnh bìa chính</span>
                        </>
                      ) : (
                        <>
                          <Star className="w-3 h-3" />
                          <span>Đặt làm ảnh bìa chính</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
