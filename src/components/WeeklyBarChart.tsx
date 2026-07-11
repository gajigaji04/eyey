'use client';

import { useState } from 'react';
import { DailyStat } from '@/types';

/**
 * 최근 N일의 완료율(%)을 보여주는 단일 계열 막대 차트.
 * 계열이 하나뿐이므로 범례 대신 제목으로 의미를 밝히고, 색상 대신 항상 보이는 값 레이블을 함께 쓴다.
 */
export default function WeeklyBarChart({ stats }: { stats: DailyStat[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const max = 100;
  const barColor = '#256abf'; // sequential blue 500 - references/palette.md
  const trackColor = '#e1e0d9'; // gridline/track - muted, not competing with the bar

  return (
    <div>
      <div className="flex h-36 items-end gap-2" role="img" aria-label="최근 완료율 막대 그래프">
        {stats.map((s) => {
          const pct = Math.min(100, Math.max(0, s.rate));
          const isHover = hover === s.date;
          return (
            <div key={s.date} className="relative flex flex-1 flex-col items-center gap-1">
              {isHover && (
                <div className="absolute -top-7 whitespace-nowrap rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-white">
                  {s.date.slice(5)} · {pct}%
                </div>
              )}
              <div
                className="relative flex h-28 w-full max-w-[22px] items-end overflow-hidden rounded-t-[4px]"
                style={{ backgroundColor: trackColor }}
                onMouseEnter={() => setHover(s.date)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(s.date)}
              >
                <div
                  className="w-full rounded-t-[4px] transition-[height]"
                  style={{ height: `${(pct / max) * 100}%`, backgroundColor: barColor }}
                />
              </div>
              <span className="text-[10px] text-slate-400">
                {['일', '월', '화', '수', '목', '금', '토'][new Date(s.date).getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      {/* 시각 정보를 텍스트로도 동일하게 제공한다 (표로 보기) */}
      <details className="mt-2 text-xs text-slate-400">
        <summary className="cursor-pointer select-none">표로 보기</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-slate-400">
              <th className="font-normal">날짜</th>
              <th className="font-normal">완료율</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.date}>
                <td className="py-0.5 text-slate-600">{s.date}</td>
                <td className="py-0.5 text-slate-600">{s.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
