// hooks/useImageUpload.ts
import { useState } from "react";

interface UseImageUploadReturn {
  uploading: boolean;
  upload: (file: File) => Promise<string>;
}

export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File): Promise<string> {
    setUploading(true);
    try {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Error al leer la imagen"));
        reader.readAsDataURL(file);
      });
    } finally {
      setUploading(false);
    }
  }

  return { uploading, upload };
}