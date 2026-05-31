import { useMemo, useState } from "react";
import { Trophy, LineChart } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import TrophyChart from "../../components/TrophyChart";
import TrophyDeltaCard from "../../components/TrophyDeltaCard";
import EmptyState from "../../components/EmptyState";
import BrawlerIllustration from "../../components/illustrations/BrawlerIllustration";
import {
  getSnapshots,
  rangeSinceMs,
  type TrophyRange,
} from "../../utils/trophyHistory";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TrophyProgressSection() {
  const { playerData, lastUpdated } = usePlayer();
  const [range, setRange] = useState<TrophyRange>("7d");

  const allSnapshots = useMemo(
    () => (playerData?.tag ? getSnapshots(playerData.tag) : []),
    // lastUpdated changes whenever a fresh fetch lands, so refresh memo
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerData?.tag, lastUpdated]
  );

  const rangedSnapshots = useMemo(() => {
    const since = rangeSinceMs(range);
    if (!since) return allSnapshots;
    return allSnapshots.filter((s) => s.timestamp >= since);
  }, [allSnapshots, range]);

  const peak = useMemo(() => {
    if (allSnapshots.length === 0) return null;
    return allSnapshots.reduce((best, s) =>
      s.trophies > best.trophies ? s : best
    );
  }, [allSnapshots]);

  if (!playerData) return null;

  if (allSnapshots.length === 0) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-1.5">
          <LineChart className="h-3.5 w-3.5 text-slate-500" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Прогрес кубків
          </p>
        </div>
        <EmptyState
          illustration={<BrawlerIllustration variant="empty" />}
          title="Графік ще порожній"
          description="Графік з'явиться після кількох оновлень профілю. Тягни вниз на головній — і дані почнуть накопичуватись."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-1.5">
        <LineChart className="h-3.5 w-3.5 text-slate-500" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Прогрес кубків
        </p>
      </div>

      <TrophyDeltaCard
        snapshots={allSnapshots}
        range={range}
        onRangeChange={setRange}
      />

      <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        {rangedSnapshots.length >= 2 ? (
          <TrophyChart
            snapshots={rangedSnapshots}
            height={180}
            color="#facc15"
            fillGradient
          />
        ) : (
          <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
            <p className="text-xs font-bold text-slate-500">
              Замало даних для цього періоду
            </p>
            <p className="text-[10px] text-slate-600">
              Переключи період або оновлюй частіше
            </p>
          </div>
        )}
      </div>

      {peak && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#2a1a4a] px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#facc15]/10 ring-1 ring-[#facc15]/30">
            <Trophy className="h-4 w-4 text-[#facc15]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Максимум за історію
            </p>
            <p className="text-sm font-black text-white">
              {peak.trophies.toLocaleString("uk-UA")}
            </p>
          </div>
          <p className="shrink-0 text-[10px] font-bold text-slate-500">
            {formatDate(peak.timestamp)}
          </p>
        </div>
      )}
    </section>
  );
}
