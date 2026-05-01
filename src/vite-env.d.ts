/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Optional. Production site URL for generated share links (e.g. https://gost.example.com). */
  readonly VITE_PUBLIC_APP_URL?: string;
  /**
   * Optional. Base URL of Merv CLG Snapshot (e.g. https://snapshot.mervmarketing.com).
   * Enables “Run live Snapshot” in the audit panel (same rubric as positioning-scoring-rubric-v1).
   */
  readonly VITE_CLG_SNAPSHOT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
