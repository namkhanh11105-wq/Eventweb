export const MAX_BANNER_IMAGE_BYTES = 245 * 1024;
export const MAX_GALLERY_IMAGE_BYTES = 110 * 1024; // Keeps up to 8 images well within Firestore 1MB limit
export const MAX_GALLERY_HARD_CAP_BYTES = 195 * 1024;
export const MAX_INPUT_FILE_BYTES = 20 * 1024 * 1024;

export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const base64 = dataUrl.slice(commaIdx + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export interface CompressImageOptions {
  maxWidth?: number;
  targetBytes?: number;
  hardCapBytes?: number;
}

export async function compressImageFileToBase64(
  file: File,
  options: CompressImageOptions = {}
): Promise<{ dataUrl: string; byteSize: number; width: number; height: number }> {
  const maxWidth = options.maxWidth ?? 1200;
  const targetBytes = options.targetBytes ?? MAX_BANNER_IMAGE_BYTES;
  const hardCapBytes = options.hardCapBytes ?? 250 * 1024;

  const isSupportedType =
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
      file.type.toLowerCase()
    ) || /\.(jpe?g|png|webp)$/i.test(file.name);

  if (!isSupportedType) {
    throw new Error('Vui lòng chọn tệp ảnh định dạng JPG, PNG hoặc WEBP.');
  }

  if (file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error('Tệp ảnh gốc quá lớn (tối đa 20MB). Vui lòng chọn ảnh nhẹ hơn.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(new Error('Không thể đọc tệp ảnh này. Vui lòng thử ảnh khác.'));
      el.src = objectUrl;
    });

    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;
    if (!origWidth || !origHeight) {
      throw new Error('Kích thước ảnh không hợp lệ.');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Trình duyệt không hỗ trợ xử lý ảnh HTML5 Canvas.');
    }

    const widthAttempts = Array.from(
      new Set([
        Math.min(maxWidth, origWidth),
        Math.min(Math.round(maxWidth * 0.8), origWidth),
        Math.min(Math.round(maxWidth * 0.62), origWidth),
        Math.min(480, origWidth),
      ])
    ).sort((a, b) => b - a);

    const qualityAttempts = [0.75, 0.64, 0.54, 0.44];

    let bestDataUrl = '';
    let bestBytes = Infinity;
    let finalWidth = widthAttempts[0];
    let finalHeight = Math.max(1, Math.round((origHeight * finalWidth) / origWidth));

    for (const targetW of widthAttempts) {
      const targetH = Math.max(1, Math.round((origHeight * targetW) / origWidth));
      canvas.width = targetW;
      canvas.height = targetH;

      // White backdrop ensures transparent PNG/WEBP convert cleanly to JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      for (const quality of qualityAttempts) {
        const candidate = canvas.toDataURL('image/jpeg', quality);
        const bytes = estimateDataUrlBytes(candidate);
        if (bytes < bestBytes) {
          bestDataUrl = candidate;
          bestBytes = bytes;
          finalWidth = targetW;
          finalHeight = targetH;
        }
        if (bytes <= targetBytes) {
          return {
            dataUrl: candidate,
            byteSize: bytes,
            width: targetW,
            height: targetH,
          };
        }
      }
    }

    if (bestBytes > hardCapBytes) {
      const capKb = Math.round(hardCapBytes / 1024);
      throw new Error(
        `Ảnh sau khi nén vẫn vượt quá ${capKb}KB. Vui lòng chọn ảnh có độ phân giải nhỏ hơn.`
      );
    }

    return {
      dataUrl: bestDataUrl,
      byteSize: bestBytes,
      width: finalWidth,
      height: finalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
