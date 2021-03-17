export function createQueue<Args extends Array<unknown>, Result>(
  fn: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  let lastResultPromise: Promise<Result> | null = null

  return async (...args) => {
    await lastResultPromise
    const nextResultPromise = fn(...args)
    lastResultPromise = nextResultPromise
    return nextResultPromise
  }
}
