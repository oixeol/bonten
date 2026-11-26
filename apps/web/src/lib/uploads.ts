import { apiFetch } from './api';

export interface UploadResponse {
  url: string;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<UploadResponse>('/uploads', {
    method: 'POST',
    body: formData,
  });
}