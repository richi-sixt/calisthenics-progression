"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

export interface UploadedImage {
  id: number;
  filename: string;
  /** Path relative to the API origin, e.g. /static/exercise_images/<hex>.webp */
  url: string;
}

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return api.upload<ApiResponse<UploadedImage>>("/uploads/images", formData, "POST");
    },
  });
}
