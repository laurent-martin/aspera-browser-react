import { create } from 'zustand';
import type { FileItem, ViewMode } from '../types';

interface FileState {
    currentPath: string;
    files: FileItem[];
    selectedFiles: FileItem[];
    viewMode: ViewMode;
    // For Access Key: track file IDs that lead to current folder
    fileIdPath: string[];
    // For Access Key: track directory names for breadcrumb construction
    breadcrumbNames: string[];
    setCurrentPath: (path: string) => void;
    setFiles: (files: FileItem[]) => void;
    setSelectedFiles: (files: FileItem[]) => void;
    toggleFileSelection: (file: FileItem) => void;
    clearSelection: () => void;
    setViewMode: (mode: ViewMode) => void;
    setFileIdPath: (fileIds: string[]) => void;
    pushFileId: (fileId: string) => void;
    popFileId: () => void;
    clearFileIdPath: () => void;
    setBreadcrumbNames: (names: string[]) => void;
    pushBreadcrumbName: (name: string) => void;
    popBreadcrumbName: () => void;
    clearBreadcrumbNames: () => void;
}

export const useFileStore = create<FileState>((set) => ({
    currentPath: '/',
    files: [],
    selectedFiles: [],
    viewMode: 'list',
    fileIdPath: [],
    breadcrumbNames: [],
    setCurrentPath: (path) => set({ currentPath: path }),
    setFiles: (files) => set({ files }),
    setSelectedFiles: (files) => set({ selectedFiles: files }),
    toggleFileSelection: (file) =>
        set((state) => {
            const isSelected = state.selectedFiles.some((f) => f.path === file.path);
            return {
                selectedFiles: isSelected
                    ? state.selectedFiles.filter((f) => f.path !== file.path)
                    : [...state.selectedFiles, file],
            };
        }),
    clearSelection: () => set({ selectedFiles: [] }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setFileIdPath: (fileIds) => set({ fileIdPath: fileIds }),
    pushFileId: (fileId) => set((state) => ({ fileIdPath: [...state.fileIdPath, fileId] })),
    popFileId: () => set((state) => ({ fileIdPath: state.fileIdPath.slice(0, -1) })),
    clearFileIdPath: () => set({ fileIdPath: [] }),
    setBreadcrumbNames: (names) => set({ breadcrumbNames: names }),
    pushBreadcrumbName: (name) => set((state) => ({ breadcrumbNames: [...state.breadcrumbNames, name] })),
    popBreadcrumbName: () => set((state) => ({ breadcrumbNames: state.breadcrumbNames.slice(0, -1) })),
    clearBreadcrumbNames: () => set({ breadcrumbNames: [] }),
}));

