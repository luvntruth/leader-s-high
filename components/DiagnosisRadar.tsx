// ─────────────────────────────────────────────────────────────
// DiagnosisRadar — 5차원 신뢰 점수 레이더 (의존성 없는 순수 SVG)
// 급소(최저 축)는 앰버로 강조, 강점(최고 축)은 틸로 표시.
// CompetencyRadar(evaluation.radarChart용)와 별개 — 이쪽은
// trustLevelService의 실측 5차원을 그린다.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { DIM_LABEL, type TrustDimensions, type DimensionKey } from '../services/diagnosisService';

const ORDER: DimensionKey[] = [
  'psychological_safety',
  'understanding_alignment',
  'autonomy_fairness',
  'integrity_consistency',
  'competence_support',
];

interface Props {
  dims: TrustDimensions;
  gapKey: DimensionKey;      // 급소 축 (앰버 강조)
  strengthKey: DimensionKey; // 강점 축 (틸 점)
  size?: number;             // px, 기본 240
}

export default function DiagnosisRadar({ dims, gapKey, strengthKey, size = 240 }: Props) {
  const cx = size / 2;
  const cy = size / 2 + 6; // 라벨 여백 고려해 살짝 아래
  const R = size / 2 - 34; // 라벨 공간 확보

  // 5축: 12시 방향부터 시계방향
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  const pt = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });
  const poly = (r: number) =>
    ORDER.map((_, i) => { const p = pt(i, r); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');

  const dataPoly = ORDER
    .map((k, i) => { const p = pt(i, (Math.max(0, Math.min(100, dims[k])) / 100) * R); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; })
    .join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="신뢰 5차원 진단 레이더">
      {/* grid */}
      {[1, 0.72, 0.44].map((f) => (
        <polygon key={f} points={poly(R * f)} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
      ))}
      {/* axes */}
      {ORDER.map((_, i) => {
        const p = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />;
      })}
      {/* data */}
      <polygon points={dataPoly} fill="rgba(245,158,11,0.18)" stroke="#F59E0B" strokeWidth={2} />
      {ORDER.map((k, i) => {
        const p = pt(i, (Math.max(0, Math.min(100, dims[k])) / 100) * R);
        const isGap = k === gapKey;
        const isStr = k === strengthKey;
        return (
          <circle
            key={k}
            cx={p.x} cy={p.y}
            r={isGap ? 4 : 3}
            fill={isGap ? '#FBBF24' : isStr ? '#5EEAD4' : '#F59E0B'}
            stroke={isGap ? '#fff' : 'none'}
            strokeWidth={isGap ? 1 : 0}
          />
        );
      })}
      {/* labels */}
      {ORDER.map((k, i) => {
        const p = pt(i, R + 18);
        const isGap = k === gapKey;
        return (
          <text
            key={k}
            x={p.x} y={p.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10}
            fill={isGap ? '#FBBF24' : '#94A3B8'}
            fontWeight={isGap ? 700 : 400}
          >
            {DIM_LABEL[k]}{isGap ? ' ⚑' : ''}
          </text>
        );
      })}
    </svg>
  );
}
