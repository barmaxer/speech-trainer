// src/components/Sparkline.tsx
export default function Sparkline({ values }: { values: number[] }) {
  const w = 140, h = 32, pad = 2;
  if (!values.length) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const norm = (v: number) => max === min ? h/2 : h - pad - ((v - min) / (max - min)) * (h - 2*pad);
  const step = (w - 2*pad) / (values.length - 1 || 1);
  const d = values.map((v, i) => `${i===0?'M':'L'} ${pad + i*step} ${norm(v)}`).join(' ');
  return (
    <svg width={w} height={h} className="opacity-80">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
