import api from './api';
import type { ApiResponse } from '../types/api.types';

interface UploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export const uploadService = {
  upload: (category: 'documents' | 'media' | 'avatars', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<UploadResponse>>(`/upload/${category}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  uploadMultiple: (category: 'documents' | 'media' | 'avatars', files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post<ApiResponse<UploadResponse[]>>(`/upload/${category}/multiple`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};
