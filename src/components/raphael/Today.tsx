import React, { useEffect, useRef, useState } from 'react';
import type { TodayOverview } from '../../lib/raphael/monitors';
import TodayAlertsCard from './TodayAlertsCard';
import TodayVitalsCard from './TodayVitalsCard';
import TodayTrendsCard from './TodayTrendsCard';
import TodayReportsCard from './TodayReportsCard';
import TodayTasksCard from './TodayTasksCard';

interface TodayProps {
  data: TodayOverview;
}

export default function Today({ data }: TodayProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    section.addEventListener('mousemove', handleMouseMove);
    return () => section.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;

    const cards = sectionRef.current.querySelectorAll('.neon-border');

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const sectionRect = sectionRef.current!.getBoundingClientRect();

      const cardCenterX = rect.left - sectionRect.left + rect.width / 2;
      const cardCenterY = rect.top - sectionRect.top + rect.height / 2;

      const distance = Math.sqrt(
        Math.pow(cursorPos.x - cardCenterX, 2) + Math.pow(cursorPos.y - cardCenterY, 2)
      );

      const proximity = Math.max(0, 1 - distance / 300);

      (card as HTMLElement).style.setProperty('--neon-intensity', proximity.toString());
    });
  }, [cursorPos]);

  return (
    <section
      ref={sectionRef}
      aria-label="Today's Overview"
      className="space-y-6 relative"
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Today</h2>
          <p className="text-sm text-slate-400 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <TodayAlertsCard alerts={data.alerts} />
        <TodayVitalsCard summary={data.vitalsSummary} />
        <TodayTrendsCard trends={data.trends} />
        <TodayReportsCard reports={data.recentReports} />
      </div>

      <TodayTasksCard tasks={data.tasks} />
    </section>
  );
}
