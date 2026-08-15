export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// The awaited value is typed PromiseLike rather than Promise so that thenables
// can be passed directly. Supabase query builders are thenables, and callers
// were handing them straight to this helper; Promise.race already accepts any
// iterable of PromiseLike, so this widens the signature to match what the
// implementation has always supported.
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
