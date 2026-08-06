import { unwrapData } from './unwrap'

/** Normalize axios response bodies from Laravel `{ data: T }` or bare `T`. */
export function unwrapLms<T>(payload: unknown): T {
  return unwrapData<T>(payload)
}

export function asList<T>(payload: unknown): T[] {
  const inner = unwrapData<unknown>(payload)
  if (Array.isArray(inner)) return inner as T[]
  if (inner && typeof inner === 'object' && 'data' in inner && Array.isArray((inner as { data: unknown }).data)) {
    return (inner as { data: T[] }).data
  }
  return []
}
