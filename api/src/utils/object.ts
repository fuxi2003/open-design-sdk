export function keys<T extends object>(obj: T): Array<keyof T> {
  // @ts-ignore
  return Object.keys(obj)
}
