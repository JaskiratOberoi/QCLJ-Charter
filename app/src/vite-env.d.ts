/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the lab server (api-qclj). Empty in dev, where the vite server stands in. */
  readonly VITE_API_BASE?: string
}
