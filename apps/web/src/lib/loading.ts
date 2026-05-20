export const MIN_LOADING_MS = 10000;

export async function withMinimumDelay<T>(work: Promise<T>, minimumMs = MIN_LOADING_MS) {
  const [result] = await Promise.all([
    work,
    new Promise((resolve) => setTimeout(resolve, minimumMs))
  ]);
  return result;
}
