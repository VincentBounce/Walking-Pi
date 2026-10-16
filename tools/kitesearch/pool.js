export function pool(N = 9) {
  const workers = Array.from({ length: N }, () => new Worker(new URL('./worker.js', import.meta.url).href, { type: 'module' }));
  let next = 0;
  const call = (w, msg) => new Promise((res) => { const id = next++; const on = ({ data }) => { if (data.id === id) { w.removeEventListener('message', on); res(data.out); } }; w.addEventListener('message', on); w.postMessage({ id, ...msg }); });
  return { workers, call, close: () => workers.forEach((w) => w.terminate()) };
}
