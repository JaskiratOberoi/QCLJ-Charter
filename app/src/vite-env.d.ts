/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute URL of the lab record JSON; defaults to /data/noble.json when unset. */
  readonly VITE_DATA_URL?: string
}
