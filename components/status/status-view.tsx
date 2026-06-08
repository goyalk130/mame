"use client";
import { useMemo, useState, useRef } from "react";
import type { Project, VirtualMember, IssueStatus } from "@/types";
import { STATUS_LABELS } from "@/types";
import { cn, getInitials } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { ExportPdfButton } from "@/components/export/export-pdf-button";

interface RawLabel { id: string; name: string; color: string; }
interface RawIssue {
  id: string; key: string; title: string;
  type: string; status: string;
  assignee_id: string | null; virtual_assignee_id: string | null;
  story_points: number | null; start_date: string | null; due_date: string | null;
  created_at: string;
  labels?: RawLabel[];
}

interface Props {
  project: Project;
  issues: RawIssue[];
  members: any[];
  virtualMembers: VirtualMember[];
  projectLabels?: RawLabel[];
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

const TYPE_ORDER = ["epic", "story", "task", "bug", "subtask"];

export function StatusView({ project, issues, members, virtualMembers, projectLabels = [] }: Props) {
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const userMap = useMemo(() => {
    const m: Record<string, { name: string; color?: string }> = {
      unassigned: { name: "Unassigned" },
    };
    members.forEach((mem: any) => {
      m[mem.user_id] = { name: mem.profile?.full_name || mem.profile?.email || "Unknown" };
    });
    virtualMembers.forEach((vm) => {
      m[`v:${vm.id}`] = { name: vm.name, color: vm.color };
    });
    return m;
  }, [members, virtualMembers]);

  const withAssignee = useMemo(() => issues.map((i) => ({
    ...i,
    assigneeKey: i.assignee_id ? i.assignee_id
      : i.virtual_assignee_id ? `v:${i.virtual_assignee_id}`
      : "unassigned",
  })), [issues]);

  const filtered = useMemo(() =>
    selectedUser === "all" ? withAssignee : withAssignee.filter((i) => i.assigneeKey === selectedUser),
  [withAssignee, selectedUser]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    TYPE_ORDER.forEach((t) => c[t] = 0);
    filtered.forEach((i) => { c[i.type] = (c[i.type] || 0) + 1; });
    return c;
  }, [filtered]);

  const total = filtered.length;

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach((i) => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [filtered]);

  const doneCount = (statusCounts["done"] || 0) + (statusCounts["completed"] || 0);
  const overallProgress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const labelCounts = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach((i) => i.labels?.forEach((l) => { c[l.id] = (c[l.id] || 0) + 1; }));
    return c;
  }, [filtered]);

  const labelChartData = useMemo(() =>
    projectLabels
      .filter((l) => labelCounts[l.id] > 0)
      .map((l) => ({ ...l, count: labelCounts[l.id] }))
      .sort((a, b) => b.count - a.count),
  [projectLabels, labelCounts]);

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
  const selectedInfo = selectedUser === "all" ? { name: "Everyone" } : (userMap[selectedUser] || { name: selectedUser });

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Status</h1>
            <p className="text-xs text-gray-400 mt-0.5">{total} issue{total !== 1 ? "s" : ""} · {project.name}</p>
          </div>

          <ExportPdfButton
            projectId={project.id}
            projectKey={project.key}
            projectName={project.name}
            projectType={project.type}
          />

          {/* Compact dropdown filter */}
          <div className="relative ml-auto" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 transition-colors"
            >
              {(selectedInfo as any).color && (
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: (selectedInfo as any).color }} />
              )}
              <span className="font-medium text-gray-700">{selectedInfo.name}</span>
              {selectedUser !== "all" && (
                <span className="text-xs text-gray-400">({perUser[selectedUser]?.total ?? 0})</span>
              )}
              <ChevronDown size={13} className="text-gray-400 ml-1" />
            </button>

            {filterOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-52 overflow-hidden">
                  <div className="max-h-72 overflow-y-auto">
                    {["all", ...allUserKeys].map((k) => {
                      const info = k === "all" ? { name: "Everyone" } : (userMap[k] || { name: k });
                      const isSelected = selectedUser === k;
                      return (
                        <button
                          key={k}
                          onClick={() => { setSelectedUser(k); setFilterOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors",
                            isSelected && "bg-blue-50 text-blue-700"
                          )}
                        >
                          {(info as any).color ? (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: (info as any).color }} />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                          )}
                          <span className="flex-1 truncate font-medium">{info.name}</span>
                          {k !== "all" && (
                            <span className="text-xs text-gray-400 shrink-0">{perUser[k]?.total ?? 0}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

        {/* ── Row 1: Overall progress + type + status ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Progress ring */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center justify-center gap-3">
            <h2 className="text-sm font-semibold text-gray-600 self-start">Overall Progress</h2>
            <ProgressRing percent={overallProgress} size={110} />
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{doneCount} / {total}</div>
              <div className="text-xs text-gray-400 mt-0.5">issues done or completed</div>
            </div>
          </div>

          {/* By Type donut */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">By Type</h2>
            <div className="flex items-center gap-4">
              <DonutChart
                segments={TYPE_ORDER.filter((t) => typeCounts[t] > 0).map((t) => ({
                  label: t, value: typeCounts[t], color: TYPE_COLORS[t],
                }))}
                size={88}
              />
              <div className="space-y-1.5 flex-1 min-w-0">
                {TYPE_ORDER.map((t) => typeCounts[t] > 0 && (
                  <div key={t} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: TYPE_COLORS[t] }} />
                      <span className="capitalize text-gray-700 truncate">{t}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-gray-900">{typeCounts[t]}</span>
                      <span className="text-gray-400 w-8 text-right">{total > 0 ? Math.round((typeCounts[t] / total) * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* By Status bars */}
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
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: STATUS_COLORS[s] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── By Label ─────────────────────────────────────────────────── */}
        {labelChartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">By Label</h2>
            <div className="space-y-2">
              {labelChartData.map((l) => {
                const pct = total > 0 ? (l.count / total) * 100 : 0;
                return (
                  <div key={l.id}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: l.color }} />
                        <span className="text-gray-600">{l.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{l.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: l.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Row 2: Issues per person (compact + scrollable) ─────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-600">Issues per person</h2>
            <div className="flex items-center gap-3">
              {/* Type legend */}
              <div className="hidden sm:flex items-center gap-3">
                {TYPE_ORDER.map((t) => (
                  <div key={t} className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-sm inline-block" style={{ background: TYPE_COLORS[t] }} />
                    <span className="capitalize">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">Breakdown by issue type</p>

          {allUserKeys.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet</p>
          ) : (
            /* Scrollable compact bar list */
            <div className="overflow-y-auto max-h-64 space-y-1.5 pr-1">
              {allUserKeys.map((k) => {
                const info = userMap[k] || { name: k };
                const data = perUser[k];
                const maxVal = Math.max(...allUserKeys.map((uk) => perUser[uk].total), 1);
                return (
                  <div key={k} className="flex items-center gap-2 group">
                    {/* Avatar */}
                    {(info as any).color ? (
                      <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[8px] font-bold"
                        style={{ background: (info as any).color }}>
                        {getInitials(info.name)}
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full shrink-0 bg-gray-200 flex items-center justify-center text-gray-600 text-[8px] font-bold">
                        {getInitials(info.name)}
                      </div>
                    )}
                    {/* Name */}
                    <span className="text-xs text-gray-600 w-24 shrink-0 truncate">{info.name}</span>
                    {/* Stacked bar */}
                    <div className="flex-1 flex h-5 rounded overflow-hidden bg-gray-100 min-w-0">
                      {TYPE_ORDER.map((t) => {
                        const count = data.byType[t] || 0;
                        if (count === 0) return null;
                        const pct = (count / maxVal) * 100;
                        return (
                          <div
                            key={t}
                            style={{ width: `${pct}%`, background: TYPE_COLORS[t] }}
                            className="flex items-center justify-center text-white text-[9px] font-bold overflow-hidden shrink-0"
                            title={`${count} ${t}`}
                          >
                            {pct > 8 ? count : ""}
                          </div>
                        );
                      })}
                    </div>
                    {/* Total */}
                    <span className="text-xs font-semibold text-gray-700 w-4 shrink-0 text-right">{data.total}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Row 3: Per-user cards ────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Team breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allUserKeys.map((k) => {
              const info = userMap[k] || { name: k };
              const data = perUser[k];
              const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
              return (
                <div key={k} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {(info as any).color ? (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: (info as any).color }}>
                        {getInitials(info.name)}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                        {getInitials(info.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{info.name}</div>
                      <div className="text-xs text-gray-400">{data.total} issues · {pct}% done</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {TYPE_ORDER.map((t) => data.byType[t] > 0 && (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white capitalize"
                        style={{ background: TYPE_COLORS[t] }}>
                        {data.byType[t]} {t}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {Object.entries(data.byStatus).sort(([, a], [, b]) => b - a).map(([s, count]) => {
                      const p = data.total > 0 ? (count / data.total) * 100 : 0;
                      return (
                        <div key={s} className="flex items-center gap-1.5 text-xs">
                          <span className="w-14 text-gray-400 shrink-0 truncate">{STATUS_LABELS[s as IssueStatus] || s}</span>
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p}%`, background: STATUS_COLORS[s] || "#9ca3af" }} />
                          </div>
                          <span className="text-gray-600 font-medium w-4 text-right shrink-0">{count}</span>
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

// ── SVG Charts ────────────────────────────────────────────────────────────

function ProgressRing({ percent, size = 110 }: { percent: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={percent === 100 ? "#059669" : "#3b82f6"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      {/* Text is counter-rotated so it stays horizontal */}
      <text
        x={cx} y={cy + 7}
        textAnchor="middle"
        style={{
          transform: `rotate(90deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          fontSize: 22,
          fontWeight: 700,
          fill: "#111827",
        }}
      >
        {percent}%
      </text>
    </svg>
  );
}

function DonutChart({ segments, size = 90 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div style={{ width: size, height: size }} className="rounded-full bg-gray-100 shrink-0" />;
  const r = size / 2 - 8;
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
      <circle cx={cx} cy={cy} r={r * 0.52} fill="white" />
      <text x={cx} y={cy + 5} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: "#111827" }}>{total}</text>
    </svg>
  );
}
