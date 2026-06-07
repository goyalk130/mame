"use client";
import { useMemo, useState } from "react";
import type { Project, VirtualMember } from "@/types";
import { cn } from "@/lib/utils";

interface RawIssue {
  id: string; key: string; title: string;
  type: string; status: string;
  assignee_id: string | null; virtual_assignee_id: string | null;
  story_points: number | null; start_date: string | null; due_date: string | null;
  created_at: string;
}

interface Props {
  project: Project;
  issues: RawIssue[];
  members: any[];
  virtualMembers: VirtualMember[];
}

const TYPE_COLORS: Record<string, string> = {
  epic:    "#8b5cf6",
  story:   "#3b82f6",
  task:    "#10b981",
  bug:     "#ef4444",
  subtask: "#f59e0b",
};

const STATUS_COLORS: Record<string, string> = {
  triage:      "#8b5cf6",
  todo:        "#9ca3af",
  in_progress: "#3b82f6",
  in_review:   "#f59e0b",
  blocked:     "#ef4444",
  done:        "#22c55e",
  not_done:    "#f97316",
  completed:   "#059669",
};

const STATUS_LABELS: Record<string, string> = {
  triage: "Triage", todo: "To Do", in_progress: "In Progress",
  in_review: "In Review", blocked: "Blocked", done: "Done",
  not_done: "Not Done", completed: "Completed",
};

const TYPE_ORDER = ["epic", "story", "task", "bug", "subtask"];

export function StatusView({ project, issues, members, virtualMembers }: Props) {
  const [selectedUser, setSelectedUser] = useState<string>("all");

  // Build user map
  const userMap = useMemo(() => {
    const m: Record<string, { name: string; color?: string; isVirtual?: boolean }> = {
      unassigned: { name: "Unassigned" },
    };
    members.forEach((mem: any) => {
      m[mem.user_id] = { name: mem.profile?.full_name || mem.profile?.email || "Unknown" };
    });
    virtualMembers.forEach((vm) => {
      m[`v:${vm.id}`] = { name: vm.name, color: vm.color, isVirtual: true };
    });
    return m;
  }, [members, virtualMembers]);

  // Resolve each issue's assignee key
  const withAssignee = useMemo(() => issues.map((i) => ({
    ...i,
    assigneeKey: i.assignee_id ? i.assignee_id : i.virtual_assignee_id ? `v:${i.virtual_assignee_id}` : "unassigned",
  })), [issues]);

  // Filter by selected user
  const filtered = useMemo(() =>
    selectedUser === "all" ? withAssignee : withAssignee.filter((i) => i.assigneeKey === selectedUser),
  [withAssignee, selectedUser]);

  // ── Summary counts by type ──────────────────────────────────────────────
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    TYPE_ORDER.forEach((t) => c[t] = 0);
    filtered.forEach((i) => { c[i.type] = (c[i.type] || 0) + 1; });
    return c;
  }, [filtered]);

  const total = filtered.length;

  // ── Status breakdown ────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach((i) => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [filtered]);

  const doneCount = (statusCounts["done"] || 0) + (statusCounts["completed"] || 0);
  const overallProgress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // ── Per-user breakdown ─────────────────────────────────────────────────
  const perUser = useMemo(() => {
    const map: Record<string, { total: number; done: number; byType: Record<string, number>; byStatus: Record<string, number> }> = {};
    withAssignee.forEach((i) => {
      const k = i.assigneeKey;
      if (!map[k]) map[k] = { total: 0, done: 0, byType: {}, byStatus: {} };
      map[k].total++;
      if (i.status === "done" || i.status === "completed") map[k].done++;
      map[k].byType[i.type] = (map[k].byType[i.type] || 0) + 1;
      map[k].byStatus[i.status] = (map[k].byStatus[i.status] || 0) + 1;
    });
    return map;
  }, [withAssignee]);

  const allUserKeys = Object.keys(perUser).sort((a, b) => perUser[b].total - perUser[a].total);

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Status</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} issue{total !== 1 ? "s" : ""} · {project.name}</p>
          </div>
          {/* User filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Filter by:</span>
            {["all", ...allUserKeys].map((k) => {
              const info = k === "all" ? { name: "Everyone" } : userMap[k] || { name: k };
              return (
                <button
                  key={k}
                  onClick={() => setSelectedUser(k)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium",
                    selectedUser === k
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                >
                  {(info as any).color && (
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: (info as any).color }} />
                  )}
                  {info.name}
                  {k !== "all" && <span className="opacity-70">({perUser[k]?.total ?? 0})</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Row 1: Overall progress + type breakdown ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Overall progress ring */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center justify-center gap-3">
            <h2 className="text-sm font-semibold text-gray-600 self-start">Overall Progress</h2>
            <ProgressRing percent={overallProgress} size={120} />
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{doneCount} / {total}</div>
              <div className="text-xs text-gray-400 mt-0.5">issues done or completed</div>
            </div>
          </div>

          {/* Type breakdown — donut */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">By Type</h2>
            <div className="flex items-center gap-4">
              <DonutChart
                segments={TYPE_ORDER.filter((t) => typeCounts[t] > 0).map((t) => ({
                  label: t, value: typeCounts[t], color: TYPE_COLORS[t],
                }))}
                size={90}
              />
              <div className="space-y-1.5 flex-1">
                {TYPE_ORDER.map((t) => typeCounts[t] > 0 && (
                  <div key={t} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm inline-block" style={{ background: TYPE_COLORS[t] }} />
                      <span className="capitalize text-gray-700">{t}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{typeCounts[t]}</span>
                      <span className="text-gray-400">{total > 0 ? Math.round((typeCounts[t] / total) * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status breakdown — horizontal bars */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">By Status</h2>
            <div className="space-y-2">
              {Object.entries(STATUS_LABELS).map(([s, label]) => {
                const count = statusCounts[s] || 0;
                if (count === 0) return null;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: STATUS_COLORS[s] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Row 2: Stacked bar — issues per user by type ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-600 mb-1">Issues per person</h2>
          <p className="text-xs text-gray-400 mb-5">Breakdown by issue type</p>
          {allUserKeys.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet</p>
          ) : (
            <StackedBarChart
              users={allUserKeys.map((k) => ({
                key: k,
                name: (userMap[k] || { name: k }).name,
                color: (userMap[k] as any)?.color,
                byType: perUser[k].byType,
                total: perUser[k].total,
              }))}
            />
          )}
        </div>

        {/* ── Row 3: Per-user cards ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Team breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUserKeys.map((k) => {
              const info = userMap[k] || { name: k };
              const data = perUser[k];
              const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
              return (
                <div key={k} className="bg-white rounded-xl border border-gray-200 p-4">
                  {/* User header */}
                  <div className="flex items-center gap-2 mb-3">
                    {(info as any).color ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: (info as any).color }}>
                        {info.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                        {info.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{info.name}</div>
                      <div className="text-xs text-gray-400">{data.total} issues · {pct}% done</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>

                  {/* Type pills */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {TYPE_ORDER.map((t) => data.byType[t] > 0 && (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ background: TYPE_COLORS[t] }}>
                        {data.byType[t]} {t}
                      </span>
                    ))}
                  </div>

                  {/* Status mini bars */}
                  <div className="space-y-1">
                    {Object.entries(data.byStatus).sort(([,a],[,b]) => b - a).map(([s, count]) => {
                      const pct = data.total > 0 ? (count / data.total) * 100 : 0;
                      return (
                        <div key={s} className="flex items-center gap-2 text-xs">
                          <span className="w-16 text-gray-500 shrink-0 truncate">{STATUS_LABELS[s] || s}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: STATUS_COLORS[s] || "#9ca3af" }} />
                          </div>
                          <span className="text-gray-700 font-medium w-4 text-right shrink-0">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── SVG Chart Components ──────────────────────────────────────────────────

function ProgressRing({ percent, size = 120 }: { percent: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={percent === 100 ? "#059669" : "#3b82f6"}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x={size / 2} y={size / 2 + 6}
        textAnchor="middle"
        className="rotate-90"
        style={{ transform: `rotate(90deg) translate(0px, -${size / 2 - size / 2}px)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontSize: 20, fontWeight: 700, fill: "#111827" }}
      >
        {percent}%
      </text>
    </svg>
  );
}

function DonutChart({ segments, size = 100 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className="w-24 h-24 rounded-full bg-gray-100" />;
  const r = size / 2 - 10;
  const cx = size / 2, cy = size / 2;
  let angle = -Math.PI / 2;
  const paths = segments.map((seg) => {
    const sweep = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep);
    const y2 = cy + r * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    angle += sweep;
    return { d, color: seg.color };
  });
  return (
    <svg width={size} height={size} className="shrink-0">
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.85} />)}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
      <text x={cx} y={cy + 5} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: "#111827" }}>{total}</text>
    </svg>
  );
}

function StackedBarChart({ users }: { users: { key: string; name: string; color?: string; byType: Record<string, number>; total: number }[] }) {
  const maxVal = Math.max(...users.map((u) => u.total), 1);
  const BAR_HEIGHT = 28;
  const GAP = 10;
  const LABEL_W = 120;
  const BAR_W = 400;
  const svgH = users.length * (BAR_HEIGHT + GAP) + 10;

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${LABEL_W + BAR_W + 50} ${svgH}`} style={{ minWidth: 400 }}>
        {users.map((u, i) => {
          const y = i * (BAR_HEIGHT + GAP);
          let xOff = LABEL_W;
          return (
            <g key={u.key}>
              <text x={LABEL_W - 8} y={y + BAR_HEIGHT / 2 + 5} textAnchor="end"
                style={{ fontSize: 11, fill: "#6b7280", fontWeight: 500 }}>
                {u.name.length > 14 ? u.name.slice(0, 14) + "…" : u.name}
              </text>
              {TYPE_ORDER.map((t) => {
                const count = u.byType[t] || 0;
                if (count === 0) return null;
                const w = (count / maxVal) * BAR_W;
                const rect = (
                  <g key={t}>
                    <rect x={xOff} y={y} width={w} height={BAR_HEIGHT} fill={TYPE_COLORS[t]} opacity={0.85} rx={i === 0 ? 3 : 0} />
                    {w > 22 && (
                      <text x={xOff + w / 2} y={y + BAR_HEIGHT / 2 + 4} textAnchor="middle"
                        style={{ fontSize: 10, fill: "white", fontWeight: 600 }}>
                        {count}
                      </text>
                    )}
                  </g>
                );
                xOff += w;
                return rect;
              })}
              <text x={xOff + 6} y={y + BAR_HEIGHT / 2 + 4}
                style={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}>
                {u.total}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {TYPE_ORDER.map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: TYPE_COLORS[t] }} />
            <span className="capitalize">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
