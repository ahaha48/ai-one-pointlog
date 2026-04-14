/**
 * useImageUpload: 画像アップロードフック
 *
 * S3 presigned URLを使ったダイレクトアップロード。
 * AWS/S3の知識は不要。
 *
 * 使い方:
 * ```
 * const { upload, uploading, error } = useImageUpload();
 *
 * async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
 *   const file = e.target.files?.[0];
 *   if (file) {
 *     const result = await upload(file);
 *     console.log(result.publicUrl); // CDN URL
 *   }
 * }
 * ```
 */
"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { config } from "@/lib/config";

interface UploadResult {
  publicUrl: string;
  key: string;
}

interface UseImageUploadResult {
  upload: (file: File, category?: string) => Promise<UploadResult>;
  uploading: boolean;
  progress: number;
  error: string | null;
}

export function useImageUpload(): UseImageUploadResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, category: string = "images"): Promise<UploadResult> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const toolId = config.api.toolId;

        const presignResult = await api.post<{
          success: boolean;
          data: { uploadUrl: string; publicUrl: string; key: string };
        }>(`/tools/${toolId}/upload`, {
          fileName: file.name,
          contentType: file.type,
          category,
        });

        const { uploadUrl, publicUrl, key } = presignResult.data;

        setProgress(10);

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(
            `ファイルのアップロードに失敗しました (${uploadResponse.status})`,
          );
        }

        setProgress(100);
        return { publicUrl, key };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "アップロードに失敗しました";
        setError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  return { upload, uploading, progress, error };
}
