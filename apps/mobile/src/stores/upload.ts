import { create } from "zustand";

// Holds the in-flight photo upload state across the post screens
// (camera → cat-picker → caption → submit). This avoids prop-drilling
// big payloads through expo-router params.

export interface PendingUpload {
  localUri: string;
  remoteUrl?: string;
  uploading: boolean;
  lat?: number;
  lng?: number;
  accuracy?: number | null;
}

interface UploadState {
  pending: PendingUpload | null;
  setPending: (p: PendingUpload | null) => void;
  patch: (p: Partial<PendingUpload>) => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
  patch: (patch) =>
    set((s) => ({ pending: s.pending ? { ...s.pending, ...patch } : s.pending })),
}));
