import { useRef, useState } from 'react';
import domtoimage from 'dom-to-image-more';
import { analyticsService } from '../services/analyticsService';
import { LEADERSHIP_TYPE_INFO, type LeadershipType } from '../src/types/database';

interface ShareCardProps {
  radarChart: { trust: number; motivation: number; conflict: number; decision: number; strategy: number };
  leadershipType: LeadershipType | null;
  finalScore: number;
  userId?: string;
}

const RADAR_LABELS = [
  { key: 'trust', label: '신뢰', angle: -90 },
  { key: 'motivation', label: '동기부여', angle: -18 },
  { key: 'conflict', label: '갈등해결', angle: 54 },
  { key: 'decision', label: '의사결정', angle: 126 },
  { key: 'strategy', label: '전략', angle: 198 },
];

function MiniRadar({ data }: { data: Record<string, number> }) {
  const cx = 60, cy = 60, r = 45;
  const points = RADAR_LABELS.map(({ key, angle }) => {
    const val = (data[key] || 50) / 100;
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * val * Math.cos(rad), y: cy + r * val * Math.sin(rad) };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
  const gridPoints = (scale: number) =>
    RADAR_LABELS.map(({ angle }) => {
      const rad = (angle * Math.PI) / 180;
      return `${cx + r * scale * Math.cos(rad)},${cy + r * scale * Math.sin(rad)}`;
    }).join(' ');

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon key={s} points={gridPoints(s)} fill="none" stroke="#334155" strokeWidth="0.5" />
      ))}
      {RADAR_LABELS.map(({ label, angle }) => {
        const rad = (angle * Math.PI) / 180;
        const lx = cx + (r + 14) * Math.cos(rad);
        const ly = cy + (r + 14) * Math.sin(rad);
        return (
          <text key={label} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fill="#94a3b8" fontSize="7" fontWeight="600">{label}</text>
        );
      })}
      <polygon points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="#f59e0b" />
      ))}
    </svg>
  );
}

export default function ShareCard({ radarChart, leadershipType, finalScore, userId }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const typeInfo = leadershipType ? LEADERSHIP_TYPE_INFO[leadershipType] : null;
  const avgScore = Math.round(
    (radarChart.trust + radarChart.motivation + radarChart.conflict + radarChart.decision + radarChart.strategy) / 5
  );

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const blob = await domtoimage.toBlob(cardRef.current, {
        width: 400,
        height: 400,
        style: { transform: 'scale(1)', transformOrigin: 'top left' },
        bgcolor: '#020617',
      });

      analyticsService.track('share_card', { leadership_type: leadershipType, score: avgScore }, userId);

      // 모바일 Web Share API
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'leadership-score.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "나의 리더십 분석 - Leader's High",
            files: [file],
          });
          setIsGenerating(false);
          return;
        }
      }

      // 폴백: 다운로드
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leadership-score.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('공유 카드 생성 실패:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      {/* 공유 카드 (캡처 대상) */}
      <div
        ref={cardRef}
        style={{ width: 400, height: 400 }}
        className="bg-slate-950 p-8 flex flex-col items-center justify-between"
      >
        {/* 상단: 리더십 유형 */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
            <span className="text-sm">{typeInfo?.emoji || '🎯'}</span>
            <span className="text-amber-400 text-xs font-bold">{typeInfo?.name || '분석형'} 리더</span>
          </div>
        </div>

        {/* 중앙: 레이더 차트 */}
        <div className="flex-1 flex items-center justify-center">
          <MiniRadar data={radarChart} />
        </div>

        {/* 하단: 점수 + 브랜드 */}
        <div className="text-center">
          <div className="text-4xl font-black text-white mb-1">{avgScore}<span className="text-lg text-slate-400">/100</span></div>
          <p className="text-slate-500 text-[10px] tracking-wider uppercase">Leadership Score</p>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="text-amber-500 text-xs">★</span>
            <span className="text-slate-600 text-[9px] font-semibold tracking-widest uppercase">Leader's High</span>
          </div>
        </div>
      </div>

      {/* 공유 버튼 (캡처 영역 밖) */}
      <button
        onClick={handleShare}
        disabled={isGenerating}
        className="mt-4 w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/20 active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
      >
        {isGenerating ? '이미지 생성 중...' : '📤 리더십 카드 공유하기'}
      </button>
    </div>
  );
}
