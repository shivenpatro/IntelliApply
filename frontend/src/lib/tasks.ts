export interface TaskStatus { task_id: string; status: string; message: string; error_code?: string; }

export async function waitForTask(fetchStatus: (signal: AbortSignal) => Promise<TaskStatus>, signal: AbortSignal, progress: (message: string) => void) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 180000);
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) controller.abort();
  try {
    while (!controller.signal.aborted) {
      const result = await fetchStatus(controller.signal);
      if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      progress(result.message);
      if (['completed', 'partial_failure'].includes(result.status)) return result;
      if (['failed', 'interrupted'].includes(result.status)) throw new Error(result.message);
      await new Promise<void>((resolve, reject) => {
        const cancelled = () => { clearTimeout(delay); reject(new DOMException('Cancelled', 'AbortError')); };
        const delay = setTimeout(() => { controller.signal.removeEventListener('abort', cancelled); resolve(); }, 1500);
        controller.signal.addEventListener('abort', cancelled, { once: true });
      });
    }
    throw new DOMException('Cancelled', 'AbortError');
  } catch (error) {
    if (timedOut) throw new Error('Processing is taking too long. Please check again or retry.', { cause: error });
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}
