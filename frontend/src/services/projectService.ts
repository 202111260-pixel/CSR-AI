import api from './api';
import type { Project } from '../types/project.types';
import type { ApiResponse, Paginated } from '../types/api.types';

export const projectService = {
  getProjects: (filters?: Record<string, unknown>) =>
    api.get<ApiResponse<Paginated<Project>>>('/projects', { params: filters }).then(r => r.data),
  getArchivedProjects: (filters?: Record<string, unknown>) =>
    api.get<ApiResponse<Paginated<Project>>>('/projects/archived', { params: filters }).then(r => r.data),
  getProjectsMap: (filters?: Record<string, unknown>) =>
    api.get<ApiResponse<Project[]>>('/projects/map', { params: filters }).then(r => r.data),
  getProject: (id: string) =>
    api.get<ApiResponse<Project>>(`/projects/${id}`).then(r => r.data),
  createProject: (data: Partial<Project>) =>
    api.post<ApiResponse<Project>>('/projects', data).then(r => r.data),
  updateProject: (id: string, data: Partial<Project>) =>
    api.patch<ApiResponse<Project>>(`/projects/${id}`, data).then(r => r.data),
  createProjectMedia: (projectId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<unknown>>(`/projects/${projectId}/media`, data).then(r => r.data),
  createProjectDocument: (projectId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<unknown>>(`/projects/${projectId}/documents`, data).then(r => r.data),
  deleteProjectMedia: (projectId: string, mediaId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/projects/${projectId}/media/${mediaId}`).then(r => r.data),
  deleteProjectDocument: (projectId: string, docId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/projects/${projectId}/documents/${docId}`).then(r => r.data),
  deleteProject: (id: string) =>
    api.delete(`/projects/${id}`).then(r => r.data),
  restoreProject: (id: string) =>
    api.patch<ApiResponse<Project>>(`/projects/${id}/restore`).then(r => r.data),

  // Milestone CRUD
  addMilestone: (projectId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<unknown>>(`/projects/${projectId}/milestones`, data).then(r => r.data),
  updateMilestone: (projectId: string, milestoneId: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<unknown>>(`/projects/${projectId}/milestones/${milestoneId}`, data).then(r => r.data),
  deleteMilestone: (projectId: string, milestoneId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/projects/${projectId}/milestones/${milestoneId}`).then(r => r.data),
};
