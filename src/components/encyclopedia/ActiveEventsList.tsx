import EventCard from "./EventCard";
import type { BrawlifyEvent } from "../../types/brawlify";
import { useTranslation } from "../../hooks/useTranslation";

interface ActiveEventsListProps {
  active: BrawlifyEvent[];
  upcoming: BrawlifyEvent[];
  onSelectMap: (mapId: number) => void;
}

export default function ActiveEventsList({
  active,
  upcoming,
  onSelectMap,
}: ActiveEventsListProps) {
  const { t } = useTranslation();

  if (active.length === 0 && upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
        {t("encyclopedia.events.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <Section
          title={t("encyclopedia.events.active")}
          events={active}
          onSelectMap={onSelectMap}
        />
      )}
      {upcoming.length > 0 && (
        <Section
          title={t("encyclopedia.events.upcoming")}
          events={upcoming}
          onSelectMap={onSelectMap}
        />
      )}
    </div>
  );
}

function Section({
  title,
  events,
  onSelectMap,
}: {
  title: string;
  events: BrawlifyEvent[];
  onSelectMap: (mapId: number) => void;
}) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {title} · {events.length}
      </p>
      <ul className="space-y-2">
        {events.map((ev, idx) => (
          <li key={`${ev.slot.id}-${ev.startTime}-${idx}`}>
            <EventCard event={ev} onSelectMap={onSelectMap} />
          </li>
        ))}
      </ul>
    </section>
  );
}
