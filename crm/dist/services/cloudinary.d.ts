import { v2 as cloudinary } from 'cloudinary';
export interface UploadResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
}
/**
 * Upload an image buffer to Cloudinary
 */
export declare function uploadImage(buffer: Buffer, options?: {
    folder?: string;
    publicId?: string;
    transformation?: object;
}): Promise<UploadResult>;
/**
 * Delete an image from Cloudinary by public ID
 */
export declare function deleteImage(publicId: string): Promise<boolean>;
/**
 * Extract public ID from Cloudinary URL
 */
export declare function extractPublicId(url: string): string | null;
export { cloudinary };
//# sourceMappingURL=cloudinary.d.ts.map