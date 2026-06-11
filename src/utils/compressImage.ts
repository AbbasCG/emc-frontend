import imageCompression from 'browser-image-compression'

export type CompressionResult = {
  file: File
  originalSize: number
  compressedSize: number
  savedPercent: number
}

/**
 * Upload context — drives automatic compression profile selection.
 * Avatar/profile/instructor/student → 512px WebP ≤150KB
 * Course/workshop/certificate        → 1200px WebP ≤500KB
 * Banner/hero                        → 1920px WebP ≤1MB
 */
export type ImageContext =
  | 'avatar'
  | 'profile'
  | 'team'
  | 'instructor'
  | 'student'
  | 'course'
  | 'workshop'
  | 'banner'
  | 'hero'
  | 'certificate'

type Profile = {
  maxWidthOrHeight: number
  maxSizeMB: number
  quality: number
}

const PROFILES: Record<ImageContext, Profile> = {
  avatar:      { maxWidthOrHeight: 512,  maxSizeMB: 0.15, quality: 0.85 },
  profile:     { maxWidthOrHeight: 512,  maxSizeMB: 0.15, quality: 0.85 },
  team:        { maxWidthOrHeight: 512,  maxSizeMB: 0.15, quality: 0.85 },
  instructor:  { maxWidthOrHeight: 512,  maxSizeMB: 0.15, quality: 0.85 },
  student:     { maxWidthOrHeight: 512,  maxSizeMB: 0.15, quality: 0.85 },
  course:      { maxWidthOrHeight: 1200, maxSizeMB: 0.5,  quality: 0.85 },
  workshop:    { maxWidthOrHeight: 1200, maxSizeMB: 0.5,  quality: 0.85 },
  certificate: { maxWidthOrHeight: 1200, maxSizeMB: 0.5,  quality: 0.85 },
  banner:      { maxWidthOrHeight: 1920, maxSizeMB: 1.0,  quality: 0.88 },
  hero:        { maxWidthOrHeight: 1920, maxSizeMB: 1.0,  quality: 0.88 },
}

const DEFAULT_PROFILE: Profile = {
  maxWidthOrHeight: 1920,
  maxSizeMB: 5,
  quality: 0.82,
}

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

export const IMAGE_MAX_INPUT_BYTES = 20 * 1024 * 1024

export function isCompressibleImage(file: File): boolean {
  return SUPPORTED_TYPES.has(file.type.toLowerCase())
}

export function getImageContextProfile(context: ImageContext): Profile {
  return PROFILES[context]
}

/**
 * Compress an image client-side.
 * - Always outputs WebP for best compression ratio.
 * - If context is provided, dimensions and quality are auto-selected.
 * - If the image is already optimal (WebP + within target size), returns original.
 * - If compression yields a larger file, returns original (no silent bloat).
 */
export async function compressImage(
  file: File,
  onProgress?: (pct: number) => void,
  context?: ImageContext,
): Promise<CompressionResult> {
  if (!isCompressibleImage(file)) {
    throw new Error('نوع الصورة غير مدعوم. الأنواع المدعومة: JPG، PNG، WebP')
  }
  if (file.size > IMAGE_MAX_INPUT_BYTES) {
    throw new Error(
      `حجم الصورة يتجاوز الحد المسموح به (${IMAGE_MAX_INPUT_BYTES / 1024 / 1024} ميجابايت).` +
      ' الرجاء اختيار صورة أصغر.',
    )
  }

  const profile = context ? PROFILES[context] : DEFAULT_PROFILE
  const targetBytes = profile.maxSizeMB * 1024 * 1024

  // Already optimal: WebP and within target — skip expensive re-encoding
  if (file.type === 'image/webp' && file.size <= targetBytes) {
    onProgress?.(100)
    return { file, originalSize: file.size, compressedSize: file.size, savedPercent: 0 }
  }

  let compressed: File
  try {
    const blob = await imageCompression(file, {
      maxSizeMB: profile.maxSizeMB,
      maxWidthOrHeight: profile.maxWidthOrHeight,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: profile.quality,
      onProgress,
      preserveExif: false,
    })
    const outName = file.name.replace(/\.(jpe?g|png|webp|gif|bmp|tiff?)$/i, '.webp')
    compressed = new File([blob], outName, { type: 'image/webp' })
  } catch {
    throw new Error('فشل ضغط الصورة. تأكد أن الملف صورة صحيحة وأعد المحاولة.')
  }

  // Safety: if compression somehow made it larger, return original
  if (compressed.size >= file.size) {
    onProgress?.(100)
    return { file, originalSize: file.size, compressedSize: file.size, savedPercent: 0 }
  }

  return {
    file: compressed,
    originalSize: file.size,
    compressedSize: compressed.size,
    savedPercent: Math.round((1 - compressed.size / file.size) * 100),
  }
}
