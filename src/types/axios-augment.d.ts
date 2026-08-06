import 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Skip global toast for this request (forms handle errors locally). */
    skipErrorToast?: boolean
  }

  export interface AxiosError {
    /** Normalized Arabic-friendly message (set by interceptor). */
    apiMessage?: string
  }
}
