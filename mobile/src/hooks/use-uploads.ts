import { useMutation } from "@tanstack/react-query";
import type { ImagePickerAsset } from "expo-image-picker";
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
    mutationFn: async (asset: ImagePickerAsset) => {
      // Same approach as the profile picture upload.
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("image", blob, asset.fileName ?? "photo.jpg");
      return api.upload<ApiResponse<UploadedImage>>("/uploads/images", formData, "POST");
    },
  });
}
