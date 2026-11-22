import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { DEFAULT_EVENT_BANNERS } from '../utils/formatters';
import {
  compressImageFileToBase64,
  estimateDataUrlBytes,
  MAX_BANNER_IMAGE_BYTES,
} from '../utils/imageCompression';
import { EventBanner } from './EventBanner';

interface EventImagePickerProps {
  value: string;
  onChange: (nextValue: string) => void;
  eventTitle?: string;
  eventCategory?: string;
  accentColor?: 'slate' | 'indigo';
}

export function EventImagePicker({
  value,
  onChange,
  eventTitle,
  eventCategory,
  accentColor = 'slate',
}: EventImagePickerProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  const trimmedValue = (value || '').trim();
  const isBase64Image = trimmedValue.startsWith('data:image/');
  const isPresetImage = DEFAULT_EVENT_BANNERS.some((b) => b.url === trimmedValue);

  const [mode, setMode] = useState<'upload' | 'url'>(() =>
    trimmedValue && !isBase64Image && !isPresetImage ? 'url' : 'upload'
  );
  const [showSamples, setShowSamples] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [previewLoadError, setPreviewLoadError] = useState(false);

  useEffect(() => {
    setPreviewLoadError(false);
  }, [trimmedValue]);

  useEffect(() => {
    if (!trimmedValue) {
      setUploadMeta(null);
    } else if (isBase64Image && !uploadMeta) {
      const kb = Math.max(1, Math.round(estimateDataUrlBytes(trimmedValue) / 1024));
      setUploadMeta(`Ảnh đã tối ưu (${kb} KB · chuẩn Firestore)`);
    }
  }, [trimmedValue, isBase64Image, uploadMeta]);

  const activeFocusBorder =
    accentColor === 'indigo'
      ? 'focus:border-indigo-600'
      : 'focus:border-slate-900';

  const activeTabClass =
    accentColor === 'indigo'
      ? 'bg-indigo-600 text-white shadow-xs'
      : 'bg-slate-950 text-white shadow-xs';

  async function processSelectedFile(file: File | null | undefined) {
    if (!file) return;
    setPickerError(null);
    setCompressing(true);
    try {
      const result = await compressImageFileToBase64(file, {
        maxWidth: 1200,
        targetBytes: MAX_BANNER_IMAGE_BYTES,
        hardCapBytes: 250 * 1024,
      });
      const kb = Math.max(1, Math.round(result.byteSize / 1024));
      setUploadMeta(
        `Đã tối ưu ${result.width}×${result.height}px · ${kb} KB`
      );
      setMode('upload');
      onChange(result.dataUrl);
    } catch (err) {
      setPickerError(
        err instanceof Error
          ? err.message
          : 'Không thể xử lý tệp ảnh đã chọn.'
      );
    } finally {
      setCompressing(false);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    void processSelectedFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    void processSelectedFile(file);
  }

  function handleChangeImageAction() {
    setPickerError(null);
    if (mode === 'url') {
      urlInputRef.current?.focus();
      urlInputRef.current?.select();
    } else {
      fileInputRef.current?.click();
    }
  }

  function handleClearImage() {
    setPickerError(null);
    setPreviewLoadError(false);
    setUploadMeta(null);
    onChange('');
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-800"
          >
            Ảnh bìa sự kiện (tùy chọn)
          </label>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tải ảnh từ máy (tự nén &lt; 250KB) hoặc dán link URL. Nếu bỏ trống sẽ dùng ảnh bìa gradient mặc định.
          </p>
        </div>

        {/* 2-Way Input Mode Switch */}
        <div
          role="tablist"
          aria-label="Cách thêm ảnh bìa"
          className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-full self-start sm:self-auto shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'upload'}
            onClick={() => {
              setPickerError(null);
              setMode('upload');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'upload'
                ? activeTabClass
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải ảnh từ máy</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'url'}
            onClick={() => {
              setPickerError(null);
              setMode('url');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'url'
                ? activeTabClass
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Dán link URL</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="sr-only"
      />

      {/* Mode 1: Device Upload Dropzone / Trigger */}
      {mode === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!compressing) fileInputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !compressing) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed transition-colors cursor-pointer ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/70'
              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              {compressing ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </span>
            <div className="min-w-0 text-left">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {compressing
                  ? 'Đang thu nhỏ và nén ảnh chuẩn Firestore...'
                  : 'Chọn tệp ảnh JPG, PNG hoặc WEBP từ thiết bị'}
              </div>
              <div className="text-[11px] text-slate-500">
                {uploadMeta || 'Tự động thu nhỏ bề ngang tối đa 1200px, nén nhẹ dưới 250KB'}
              </div>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0 whitespace-nowrap">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{trimmedValue ? 'Chọn ảnh khác' : 'Chọn từ thiết bị'}</span>
          </span>
        </div>
      ) : (
        /* Mode 2: Paste Direct Image URL */
        <div className="relative">
          <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={urlInputRef}
            type="url"
            value={isBase64Image ? '' : value}
            onChange={(e) => {
              setPickerError(null);
              setUploadMeta(null);
              onChange(e.target.value);
            }}
            placeholder="https://example.com/anh-bia-su-kien.jpg (để trống nếu dùng gradient mặc định)"
            className={`w-full pl-9 pr-20 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none ${activeFocusBorder}`}
          />
          {trimmedValue && !isBase64Image && (
            <button
              type="button"
              onClick={handleClearImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            >
              Xóa link
            </button>
          )}
        </div>
      )}

      {pickerError && (
        <div
          role="alert"
          className="flex items-start gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{pickerError}</span>
        </div>
      )}

      {/* 16:9 Live Image Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold text-slate-600">
            Xem trước ảnh bìa (tỷ lệ 16:9)
          </span>
          {trimmedValue && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleChangeImageAction}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Đổi ảnh</span>
              </button>
              <button
                type="button"
                onClick={handleClearImage}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa ảnh</span>
              </button>
            </div>
          )}
        </div>

        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
          {trimmedValue && !previewLoadError ? (
            <>
              <img
                src={trimmedValue}
                alt={eventTitle || 'Xem trước ảnh bìa sự kiện'}
                referrerPolicy="no-referrer"
                onError={() => setPreviewLoadError(true)}
                className="w-full h-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-transparent px-3.5 py-2.5 flex items-center justify-between text-[11px] text-white/90">
                <span className="truncate font-medium">
                  {isBase64Image
                    ? uploadMeta || 'Ảnh tải lên từ thiết bị'
                    : isPresetImage
                    ? 'Ảnh minh họa gợi ý'
                    : 'Ảnh từ đường dẫn URL'}
                </span>
              </div>
            </>
          ) : (
            <div className="w-full h-full relative">
              <EventBanner
                src=""
                alt={eventTitle?.trim() || 'Ảnh bìa gradient mặc định'}
                category={eventCategory}
                className="w-full h-full"
              />
              <div className="absolute inset-x-3 bottom-3 flex justify-center">
                <span className="px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-xs text-[11px] text-white/90 border border-white/15">
                  {previewLoadError
                    ? 'Không tải được ảnh từ URL này — đang hiển thị bìa gradient thay thế'
                    : 'Chưa chọn ảnh — hiển thị ảnh bìa gradient mặc định'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Optional Quick Sample Gallery Toggle */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setShowSamples((s) => !s)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {showSamples
              ? 'Ẩn thư viện ảnh mẫu gợi ý'
              : 'Hoặc chọn nhanh từ thư viện ảnh mẫu EventFlow'}
          </span>
        </button>

        {showSamples && (
          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {DEFAULT_EVENT_BANNERS.map((preset) => {
              const selected = trimmedValue === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setPickerError(null);
                    setUploadMeta(null);
                    onChange(preset.url);
                  }}
                  className={`relative rounded-lg overflow-hidden border text-left cursor-pointer transition-all ${
                    selected
                      ? 'border-slate-900 ring-2 ring-slate-900/15'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-12 object-cover"
                  />
                  <div className="px-1.5 py-1 text-[10px] font-medium text-slate-700 truncate bg-white">
                    {preset.label}
                  </div>
                  {selected && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
