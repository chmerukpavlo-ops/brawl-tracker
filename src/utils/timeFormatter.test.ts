import { describe, expect, it } from "vitest";
import {
  decomposeDuration,
  describeEventWindow,
  formatCountdown,
  msUntil,
} from "./timeFormatter";
import type { TranslateFunction } from "../context/I18nContext";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * A minimal `t` implementation that rebuilds expected output without
 * relying on the real translation tables (keeps the test isolated).
 */
const t: TranslateFunction = ((key: string, vars?: Record<string, string | number>) => {
  const v = vars ?? {};
  switch (key) {
    case "encyclopedia.time.seconds":
      return `${v.count}s`;
    case "encyclopedia.time.minutes":
      return `${v.count}m`;
    case "encyclopedia.time.hours":
      return `${v.count}h`;
    case "encyclopedia.time.days":
      return `${v.count}d`;
    case "encyclopedia.time.hoursMinutes":
      return `${v.hours}h ${v.minutes}m`;
    case "encyclopedia.time.daysHours":
      return `${v.days}d ${v.hours}h`;
    case "encyclopedia.events.endsIn":
      return `ends in ${v.time}`;
    case "encyclopedia.events.startsIn":
      return `starts in ${v.time}`;
    case "encyclopedia.events.ended":
      return "ended";
    default:
      return key;
  }
}) as unknown as TranslateFunction;

describe("decomposeDuration", () => {
  it("splits ms into d/h/m/s", () => {
    expect(decomposeDuration(0)).toEqual({
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
    expect(decomposeDuration(2 * DAY + 3 * HOUR + 4 * MINUTE + 5 * SECOND)).toEqual({
      totalMs: 2 * DAY + 3 * HOUR + 4 * MINUTE + 5 * SECOND,
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it("clamps negative durations to zero", () => {
    expect(decomposeDuration(-1234)).toEqual({
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});

describe("formatCountdown", () => {
  it("formats sub-minute as seconds", () => {
    expect(formatCountdown(45 * SECOND, t)).toBe("45s");
  });

  it("formats sub-hour as minutes", () => {
    expect(formatCountdown(7 * MINUTE, t)).toBe("7m");
  });

  it("formats sub-day with hours+minutes", () => {
    expect(formatCountdown(3 * HOUR + 14 * MINUTE, t)).toBe("3h 14m");
  });

  it("formats whole-hour intervals as hours only", () => {
    expect(formatCountdown(5 * HOUR, t)).toBe("5h");
  });

  it("formats multi-day intervals as days+hours", () => {
    expect(formatCountdown(2 * DAY + 7 * HOUR, t)).toBe("2d 7h");
  });

  it("returns 0 for zero or negative durations", () => {
    expect(formatCountdown(0, t)).toBe("0");
    expect(formatCountdown(-5 * SECOND, t)).toBe("0");
  });
});

describe("msUntil", () => {
  it("returns positive ms for a future ISO date", () => {
    const now = Date.parse("2026-05-30T00:00:00Z");
    const future = "2026-05-30T01:00:00Z";
    expect(msUntil(future, now)).toBe(HOUR);
  });

  it("returns negative ms for a past ISO date", () => {
    const now = Date.parse("2026-05-30T01:00:00Z");
    const past = "2026-05-30T00:00:00Z";
    expect(msUntil(past, now)).toBe(-HOUR);
  });

  it("returns NaN for invalid input", () => {
    expect(Number.isNaN(msUntil("not-a-date"))).toBe(true);
  });
});

describe("describeEventWindow", () => {
  const start = "2026-05-30T10:00:00Z";
  const end = "2026-05-30T12:00:00Z";

  it("returns 'starts' before window opens", () => {
    const status = describeEventWindow(
      start,
      end,
      t,
      Date.parse("2026-05-30T09:30:00Z")
    );
    expect(status.state).toBe("starts");
    expect(status.label).toBe("starts in 30m");
  });

  it("returns 'ends' inside the window", () => {
    const status = describeEventWindow(
      start,
      end,
      t,
      Date.parse("2026-05-30T11:00:00Z")
    );
    expect(status.state).toBe("ends");
    expect(status.label).toBe("ends in 1h");
  });

  it("returns 'ended' once past the window", () => {
    const status = describeEventWindow(
      start,
      end,
      t,
      Date.parse("2026-05-30T13:00:00Z")
    );
    expect(status.state).toBe("ended");
    expect(status.remainingMs).toBe(0);
  });

  it("returns 'ended' for an unparseable end date", () => {
    const status = describeEventWindow(start, "not-a-date", t);
    expect(status.state).toBe("ended");
  });
});
