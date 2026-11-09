/**
 * Client-side Image Optimizer for Avatars & Media
 * แปลงไฟล์รูปภาพทุกฟอร์แมต (PNG, JPEG, HEIC, etc.) ให้เป็น .webp คุณภาพสูง
 * พร้อมปรับขนาด Max dimensions เพื่อลดขนาดไฟล์และประหยัด Bandwidth
 */

export interface OptimizedImageResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  originalSizeKB: number;
  optimizedSizeKB: number;
  reductionPercentage: number;
  width: number;
  height: number;
}

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 - 1.0 (default 0.85)
  fileNamePrefix?: string;
}

export async function optimizeImageToWebP(
  inputFile: File,
  options: OptimizeOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 512,
    maxHeight = 512,
    quality = 0.85,
    fileNamePrefix = "avatar",
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // คำนวณอัตราส่วนและขนาดใหม่
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // สร้าง Canvas สำหรับเรนเดอร์และแปลงเป็น WebP
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("ไม่สามารถสร้าง Canvas Context ได้"));
          return;
        }

        // เปิด Smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // วาดภาพลง Canvas
        ctx.drawImage(img, 0, 0, width, height);

        // ส่งออกเป็น blob แบบ image/webp
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("การแปลงรูปภาพเป็น WebP ล้มเหลว"));
              return;
            }

            const cleanFileName = `${fileNamePrefix}-${Date.now()}.webp`;
            const webpFile = new File([blob], cleanFileName, {
              type: "image/webp",
              lastModified: Date.now(),
            });

            const originalSizeKB = Math.round(inputFile.size / 1024);
            const optimizedSizeKB = Math.round(blob.size / 1024);
            const reduction =
              originalSizeKB > 0
                ? Math.round(((inputFile.size - blob.size) / inputFile.size) * 100)
                : 0;

            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: webpFile,
              blob,
              previewUrl,
              originalSizeKB,
              optimizedSizeKB,
              reductionPercentage: Math.max(0, reduction),
              width,
              height,
            });
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("ไม่สามารถอ่านข้อมูลรูปภาพได้"));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("การเปิดไฟล์ล้มเหลว"));
    };

    reader.readAsDataURL(inputFile);
  });
}
