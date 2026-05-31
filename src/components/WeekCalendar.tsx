import { Check, Flame } from "lucide-react";
import { useDailyCheckin } from "../hooks/useDailyCheckin";
import {
  WEEKDAY_LABELS_UK,
  formatDate,
  formatShortDate,
  getWeekDates,
} from "../utils/dateUtils";

export default function WeekCalendar() {
  const { state, status } = useDailyCheckin();
  const weekDates = getWeekDates(new Date());
  const today = formatDate(new Date());
  const checkedSet = new Set(state.history);
  const allChecked = weekDates.every((d) => checkedSet.has(d));
  const todayInWeek = weekDates.includes(today);

  return (
    <div
      className={`rounded-2xl border p-4 ${
        allChecked
          ? "border-[#fb923c]/40 bg-[#fb923c]/5 shadow-[0_0_24px_rgba(251,146,60,0.15)]"
          : "border-white/10 bg-[#2a1a4a]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Цей тиждень
        </p>
        {allChecked && todayInWeek && (
          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-[#fb923c]">
            <Flame className="h-3 w-3" fill="currentColor" />
            Повний
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date, i) => {
          const isToday = date === today;
          const isFuture = date > today;
          const isChecked = checkedSet.has(date);
          const isActiveToday = isToday && status === "active";

          let inner = (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
            </span>
          );
          if (isFuture && !isToday) {
            inner = (
              <span className="flex h-8 w-8 items-center justify-center rounded-full opacity-30">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              </span>
            );
          } else if (isActiveToday) {
            inner = (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fb923c] text-white shadow-[0_0_12px_rgba(251,146,60,0.5)]">
                <Flame className="h-4 w-4" fill="currentColor" />
              </span>
            );
          } else if (isChecked) {
            inner = (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e]/20 ring-1 ring-[#22c55e]/40">
                <Check className="h-3.5 w-3.5 text-[#22c55e]" />
              </span>
            );
          }

          return (
            <div
              key={date}
              className="flex flex-col items-center gap-1"
              title={formatShortDate(date)}
            >
              <span
                className={`text-[10px] font-bold uppercase ${
                  isToday ? "text-[#facc15]" : "text-slate-500"
                }`}
              >
                {WEEKDAY_LABELS_UK[i]}
              </span>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
