// Type definitions for our application

// Define progress callback types
declare module '@/lib/utils' {
  export type ProgressCallback = (step: string, progress: number) => void;
}