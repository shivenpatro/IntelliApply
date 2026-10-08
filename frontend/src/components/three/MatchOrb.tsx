import { useEffect, useRef } from 'react';

type Vertex = [number, number, number];
type Face = [number, number, number];

function geometry(subdivide: boolean) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const normalize = ([x, y, z]: Vertex): Vertex => {
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
  };
  const vertices: Vertex[] = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ].map(vertex => normalize(vertex as Vertex));
  let faces: Face[] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  if (subdivide) {
    const midpoints = new Map<string, number>();
    const midpoint = (a: number, b: number) => {
      const key = [Math.min(a, b), Math.max(a, b)].join(',');
      const cached = midpoints.get(key);
      if (cached !== undefined) return cached;
      const vertex = normalize(vertices[a].map((value, i) => (value + vertices[b][i]) / 2) as Vertex);
      const index = vertices.push(vertex) - 1;
      midpoints.set(key, index);
      return index;
    };
    faces = faces.flatMap(([a, b, c]): Face[] => {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
    });
  }
  const edges = new Map<string, [number, number]>();
  faces.forEach(([a, b, c]) => {
    [[a, b], [b, c], [c, a]].forEach(([from, to]) => {
      edges.set([Math.min(from, to), Math.max(from, to)].join(','), [from, to]);
    });
  });
  return { vertices, edges: [...edges.values()] };
}
const outer = geometry(true);
const inner = geometry(false);

/** The same projected wireframe geometry, drawn without a WebGL runtime. */
export default function MatchOrb() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let context: CanvasRenderingContext2D | null;
    try { context = element.getContext('2d'); } catch { return; }
    if (!context) return;
    const ctx = context;
    let width = 0, height = 0, frame = 0, last = 0;
    let visible = true;
    const start = performance.now();
    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const focal = height / (2 * Math.tan(Math.PI / 8));
      const render = (shape: typeof outer, radius: number, ry: number, rx: number, rz: number, opacity: number) => {
        const points = shape.vertices.map(([vx, vy, vz]) => {
          const x = radius * (vx * Math.cos(ry) + vz * Math.sin(ry));
          const z = radius * (-vx * Math.sin(ry) + vz * Math.cos(ry));
          const y = radius * vy;
          const yy = y * Math.cos(rx) - z * Math.sin(rx);
          const zz = y * Math.sin(rx) + z * Math.cos(rx);
          const xx = x * Math.cos(rz) - yy * Math.sin(rz);
          const yyy = x * Math.sin(rz) + yy * Math.cos(rz);
          const scale = focal / (4.2 - zz);
          return [width / 2 + (xx + 0.9) * scale, height / 2 - (yyy + 0.2) * scale];
        });
        ctx.beginPath();
        shape.edges.forEach(([a, b]) => {
          ctx.moveTo(points[a][0], points[a][1]);
          ctx.lineTo(points[b][0], points[b][1]);
        });
        ctx.strokeStyle = `rgba(27,94,66,${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      };
      render(outer, 1.3 * (1 + Math.sin(time * .8) * .02), time * .18, Math.sin(time * .25) * .18, 0, .35);
      render(inner, .7, -time * .3, 0, time * .12, .5);
    };
    const tick = (timestamp: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      if (timestamp - last >= 1000 / 30) {
        draw((timestamp - start) / 1000);
        last = timestamp;
      }
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (!visible || document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else if (!frame) frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      ({ width, height } = element.getBoundingClientRect());
      // One decoration, at most 2 million backing pixels (~8 MB).
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / Math.max(1, width * height)));
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw((performance.now() - start) / 1000);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    intersection.observe(element);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('resize', resize);
    resize(); resume();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas ref={canvas} aria-hidden="true" data-testid="wireframe-orb" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}
