export interface TaskStatus { task_id: string; status: string; message: string; error_code?: string; }
export async function waitForTask(fetchStatus: () => Promise<TaskStatus>, signal: AbortSignal, progress: (message: string) => void) {
  const deadline = Date.now() + 180000;
  while (!signal.aborted && Date.now() < deadline) {
    const result = await fetchStatus();
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    progress(result.message);
    if (['completed', 'partial_failure'].includes(result.status)) return result;
    if (['failed', 'interrupted'].includes(result.status)) throw new Error(result.message);
    await new Promise<void>((resolve, reject) => {
      const cancelled = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', cancelled); resolve(); }, 1500);
      signal.addEventListener('abort', cancelled, { once: true });
    });
  }
  throw new Error(signal.aborted ? 'Processing cancelled.' : 'Processing is taking too long. Please check again or retry.');
}
