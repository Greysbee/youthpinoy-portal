"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type LibraryItem = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  eventCode: string;
  eventTitle: string;
  eventStartAt: string | null;
  eventType: "course" | "event";
  badge: "Free" | "Unlocked" | "Locked";
};

function Badge({ badge }: { badge: LibraryItem["badge"] }) {
  const styles =
    badge === "Free"
      ? "bg-blue-100 text-blue-700"
      : badge === "Unlocked"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-gray-200 text-gray-600";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}
    >
      {badge === "Locked" && (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {badge}
    </span>
  );
}

export default function LibraryBrowser({ items }: { items: LibraryItem[] }) {
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const courseCount = useMemo(() => items.filter((i) => i.eventType === "course").length, [items]);
  const eventCount = items.length - courseCount;
  const [tab, setTab] = useState<"course" | "event">(eventCount === 0 && courseCount > 0 ? "course" : "event");

  // Only the items in the active tab.
  const tabItems = useMemo(() => items.filter((it) => it.eventType === tab), [items, tab]);

  // Distinct event codes, newest first (by event start date desc).
  const eventCodes = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const it of tabItems) if (!map.has(it.eventCode)) map.set(it.eventCode, it.eventStartAt);
    return [...map.entries()]
      .sort((a, b) => (b[1] ?? "").localeCompare(a[1] ?? ""))
      .map(([code]) => code);
  }, [tabItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tabItems.filter((it) => {
      if (eventFilter !== "all" && it.eventCode !== eventFilter) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        (it.description ?? "").toLowerCase().includes(q) ||
        it.eventCode.toLowerCase().includes(q)
      );
    });
  }, [tabItems, query, eventFilter]);

  // Group filtered items by event, preserving the newest-first order.
  const groups = useMemo(() => {
    return eventCodes
      .map((code) => ({
        code,
        title: filtered.find((it) => it.eventCode === code)?.eventTitle ?? code,
        videos: filtered
          .filter((it) => it.eventCode === code)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .filter((g) => g.videos.length > 0);
  }, [eventCodes, filtered]);

  const tabBtn = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-brand-blue text-white" : "bg-gray-100 text-brand-dark hover:bg-gray-200"
    }`;

  return (
    <div>
      <div className="mb-5 flex gap-2 border-b border-gray-200 pb-4">
        <button onClick={() => { setTab("course"); setEventFilter("all"); }} className={tabBtn(tab === "course")}>
          Courses <span className="opacity-70">({courseCount})</span>
        </button>
        <button onClick={() => { setTab("event"); setEventFilter("all"); }} className={tabBtn(tab === "event")}>
          Events <span className="opacity-70">({eventCount})</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent sm:max-w-xs"
        />
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent sm:w-auto"
        >
          <option value="all">All events</option>
          {eventCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      {groups.length === 0 ? (
        <p className="mt-12 text-center text-brand-muted">No sessions match your search.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((group) => (
            <div key={group.code}>
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-bold text-brand-dark">{group.code}</h2>
                <span className="text-sm text-brand-muted">{group.title}</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.videos.map((v) => (
                  <Link
                    key={v.id}
                    href={`/watch/${v.id}`}
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-video bg-gray-100">
                      {v.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.thumbnailUrl}
                          alt={v.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute left-2 top-2">
                        <Badge badge={v.badge} />
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-brand-dark line-clamp-2 group-hover:text-brand-blue">
                        {v.title}
                      </p>
                      {v.description && (
                        <p className="mt-1 text-sm text-brand-muted line-clamp-2">
                          {v.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
