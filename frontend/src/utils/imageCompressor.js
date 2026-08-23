/**
 * 📦 Image Compressor Utility (비용 제로 스토리지 최적화)
 * 
 * 브라우저 Canvas API를 활용하여 고해상도 이미지를 최대 1920px 해상도 및
 * 고품질 WebP(0.85) 포맷으로 무손실 수준으로 자동 압축합니다.
 * (5~10MB 스마트폰 사진 -> 150~300KB로 95% 용량 절감)
 */

export const compressImageToWebP = async (file, maxWidth = 1920, maxHeight = 1920, quality = 0.85) => {
    // 1. 이미지가 아니거나 이미 150KB 이하의 소형 파일인 경우 원본 유지
    if (!file || !file.type || !file.type.startsWith('image/')) {
        return file;
    }
    if (file.size <= 150 * 1024) {
        return file;
    }
    // SVG나 GIF 애니메이션은 원본 유지
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return file;
    }

    return new Promise((resolve) => {
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    // 비율 유지하며 최대 해상도 제한
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                resolve(file); // 실패 시 원본 반환
                                return;
                            }
                            // 원본 파일명에서 확장자를 .webp로 변환
                            const origName = file.name || 'image.webp';
                            const baseName = origName.substring(0, origName.lastIndexOf('.')) || origName;
                            const newFileName = `${baseName}.webp`;

                            const compressedFile = new File([blob], newFileName, {
                                type: 'image/webp',
                                lastModified: Date.now()
                            });

                            // 압축 후 파일이 원본보다 작은 경우에만 압축본 채택
                            if (compressedFile.size < file.size) {
                                resolve(compressedFile);
                            } else {
                                resolve(file);
                            }
                        },
                        'image/webp',
                        quality
                    );
                };
                img.onerror = () => resolve(file); // 이미지 로드 실패 시 원본 반환
            };
            reader.onerror = () => resolve(file);
        } catch (e) {
            console.warn('[ImageCompressor] Fallback to original file:', e);
            resolve(file);
        }
    });
};
