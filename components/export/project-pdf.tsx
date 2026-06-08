"use client";
/**
 * Project PDF Export — hierarchy-aware
 * Structure:
 *   1. Cover page
 *   2. Overview (progress ring + charts + sprint summary + team summary)
 *   3. Hierarchy section (Epics → Stories → Tasks/Bugs → Subtasks, with orphans at end)
 *   4. One page per Sprint (hierarchy view scoped to that sprint)
 *   5. Backlog (hierarchy view of unsprinted issues)
 *   6. One page per team member (their issues as hierarchy)
 */

import { Document, Page, Text, View, StyleSheet, Svg, Circle, Path } from "@react-pdf/renderer";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  blue: "#3b82f6", green: "#22c55e", red: "#ef4444", yellow: "#f59e0b",
  purple: "#8b5cf6", orange: "#f97316", teal: "#14b8a6", gray: "#9ca3af",
  darkGray: "#374151", lightBg: "#f9fafb", border: "#e5e7eb",
  white: "#ffffff", emerald: "#059669", navy: "#1e3a5f",
};

const TYPE_COLOR: Record<string, string> = {
  epic: C.purple, story: C.blue, task: C.teal, bug: C.red, subtask: C.yellow,
};
const TYPE_ICON: Record<string, string> = {
  epic: "E", story: "S", task: "T", bug: "B", subtask: "·",
};
const STATUS_COLOR: Record<string, string> = {
  triage: C.purple, todo: C.gray, in_progress: C.blue, in_review: C.yellow,
  blocked: C.red, done: C.green, not_done: C.orange, completed: C.emerald,
};
const STATUS_LABEL: Record<string, string> = {
  triage: "Triage", todo: "To Do", in_progress: "In Progress", in_review: "In Review",
  blocked: "Blocked", done: "Done", not_done: "Not Done", completed: "Completed",
};
const PRIORITY_COLOR: Record<string, string> = {
  highest: C.red, high: C.orange, medium: C.yellow, low: C.blue, lowest: C.gray,
};
const PRIORITY_LABEL: Record<string, string> = {
  highest: "Highest", high: "High", medium: "Medium", low: "Low", lowest: "Lowest",
};
const TYPE_ORDER = ["epic", "story", "task", "bug", "subtask"];

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Pages
  page:        { fontFamily: "Helvetica", fontSize: 9, color: C.darkGray, backgroundColor: C.white, padding: 0 },
  contentPage: { padding: 36, paddingBottom: 50, fontFamily: "Helvetica", fontSize: 9, color: C.darkGray, backgroundColor: C.white },

  // Cover
  coverTop:       { backgroundColor: C.navy, padding: 48, flex: 1 },
  coverBadge:     { backgroundColor: C.blue, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 20 },
  coverBadgeTxt:  { color: C.white, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 },
  coverTitle:     { color: C.white, fontSize: 28, fontFamily: "Helvetica-Bold", marginBottom: 6, lineHeight: 1.25 },
  coverSub:       { color: "#93c5fd", fontSize: 11, marginBottom: 28 },
  coverDivider:   { height: 1, backgroundColor: "#2d5a8e", marginVertical: 20 },
  coverMetaRow:   { flexDirection: "row", gap: 36 },
  coverMetaLabel: { color: "#93c5fd", fontSize: 7, marginBottom: 3, letterSpacing: 0.5 },
  coverMetaVal:   { color: C.white, fontSize: 12, fontFamily: "Helvetica-Bold" },
  statsStrip:     { backgroundColor: "#162d4a", padding: 20, flexDirection: "row", justifyContent: "space-around" },
  statBox:        { alignItems: "center" },
  statNum:        { color: C.white, fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  statLabel:      { color: "#93c5fd", fontSize: 7 },

  // Section
  sectionHeader:   { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 2 },
  sectionBar:      { width: 3, height: 13, borderRadius: 2, marginRight: 7 },
  sectionTitle:    { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#111827" },
  sectionSubtitle: { fontSize: 7.5, color: C.gray, marginLeft: 6 },

  // Cards
  card:  { backgroundColor: C.lightBg, borderRadius: 5, padding: 10, borderWidth: 1, borderColor: C.border },
  row3:  { flexDirection: "row", gap: 8, marginBottom: 10 },

  // Badges
  badge:    { borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, alignSelf: "flex-start" },
  badgeTxt: { fontSize: 6, fontFamily: "Helvetica-Bold" },

  // Footer
  footer:    { position: "absolute", bottom: 14, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between" },
  footerTxt: { fontSize: 6.5, color: "#9ca3af" },

  // Chart
  chartRow:    { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  chartName:   { width: 68, fontSize: 7, color: C.darkGray },
  chartBarWrap:{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: 2, height: 7 },

  // Hierarchy
  epicBlock:    { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: C.purple, paddingLeft: 8 },
  storyBlock:   { marginBottom: 6, marginLeft: 12, borderLeftWidth: 2, borderLeftColor: C.blue, paddingLeft: 7 },
  taskBlock:    { marginBottom: 4, marginLeft: 12, borderLeftWidth: 2, borderLeftColor: C.teal, paddingLeft: 6 },
  subtaskBlock: { marginBottom: 3, marginLeft: 12, borderLeftWidth: 1, borderLeftColor: C.yellow, paddingLeft: 5 },
  orphanBlock:  { marginBottom: 4, borderLeftWidth: 2, borderLeftColor: C.gray, paddingLeft: 8 },

  issueIconBox: { width: 14, height: 14, borderRadius: 3, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  issueIconTxt: { color: C.white, fontSize: 6.5, fontFamily: "Helvetica-Bold" },

  // Sprint header box
  sprintBox: { backgroundColor: "#eff6ff", borderRadius: 5, padding: 9, marginBottom: 8, borderWidth: 1, borderColor: "#bfdbfe", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },

  // Person header
  personBox: { borderRadius: 5, padding: 9, marginBottom: 8, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
});

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PdfLabel { id: string; name: string; color: string; }
export interface PdfIssue {
  id: string; key: string; title: string; type: string; status: string;
  priority: string; assignee_id: string | null; virtual_assignee_id: string | null;
  sprint_id: string | null; parent_id: string | null;
  story_points: number | null; created_at: string; updated_at: string;
  description?: string | null;
  assignee?: { full_name?: string; email?: string } | null;
  virtual_assignee?: { name: string; color: string } | null;
  labels?: PdfLabel[];
}
export interface PdfSprint { id: string; name: string; status: string; start_date?: string | null; end_date?: string | null; goal?: string | null; }
export interface PdfMember { user_id: string; profile?: { full_name?: string; email?: string } | null; }
export interface PdfVirtualMember { id: string; name: string; color: string; }

export interface ProjectPdfData {
  project: { name: string; key: string; type: string; id: string };
  issues: PdfIssue[];
  sprints: PdfSprint[];
  members: PdfMember[];
  virtualMembers: PdfVirtualMember[];
  labels?: PdfLabel[];
  exportedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}
function assigneeName(i: PdfIssue) {
  if (i.assignee) return i.assignee.full_name || i.assignee.email || "?";
  if (i.virtual_assignee) return i.virtual_assignee.name;
  return "Unassigned";
}
function assigneeKey(i: PdfIssue) {
  if (i.assignee_id) return i.assignee_id;
  if (i.virtual_assignee_id) return `v:${i.virtual_assignee_id}`;
  return "unassigned";
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}
/** Extract a usable solid hex from a color string (gradient → first hex found, else fallback) */
function solidColor(color: string): string {
  if (!color) return C.gray;
  if (color.startsWith("linear-gradient") || color.startsWith("radial-gradient")) {
    const match = color.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    return match ? match[0] : C.purple;
  }
  return color;
}

function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
}

// ─── Build issue tree ─────────────────────────────────────────────────────────
interface IssueNode { issue: PdfIssue; children: IssueNode[]; }

function buildTree(issues: PdfIssue[]): { epics: IssueNode[]; orphans: IssueNode[] } {
  const byId = new Map<string, IssueNode>();
  issues.forEach((i) => byId.set(i.id, { issue: i, children: [] }));

  const roots: IssueNode[] = [];
  issues.forEach((i) => {
    const node = byId.get(i.id)!;
    if (i.parent_id && byId.has(i.parent_id)) {
      byId.get(i.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children: epics first, then by type order
  function sortChildren(nodes: IssueNode[]) {
    nodes.sort((a, b) => TYPE_ORDER.indexOf(a.issue.type) - TYPE_ORDER.indexOf(b.issue.type));
    nodes.forEach((n) => sortChildren(n.children));
  }
  sortChildren(roots);

  const epics = roots.filter((n) => n.issue.type === "epic");
  const orphans = roots.filter((n) => n.issue.type !== "epic");
  return { epics, orphans };
}

// ─── Shared components ────────────────────────────────────────────────────────
function Footer({ projectKey, exportedAt }: { projectKey: string; exportedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>{projectKey} · Project Export · {exportedAt}</Text>
      <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.badge, { backgroundColor: color + "25" }]}>
      <Text style={[s.badgeTxt, { color }]}>{label}</Text>
    </View>
  );
}

function HBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View>
      {data.map((d) => (
        <View key={d.label} style={s.chartRow}>
          <Text style={s.chartName}>{d.label}</Text>
          <View style={s.chartBarWrap}>
            <View style={{ width: `${Math.round((d.value / max) * 100)}%`, backgroundColor: d.color, height: 7, borderRadius: 2 }} />
          </View>
          <Text style={{ fontSize: 7, color: C.darkGray, width: 18 }}>{d.value}</Text>
        </View>
      ))}
    </View>
  );
}

function PdfRing({ pct, size = 76, color = C.blue }: { pct: number; size?: number; color?: string }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const sa = -Math.PI / 2;
  const ea = sa + (pct / 100) * 2 * Math.PI;
  const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
  const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
  const large = pct > 50 ? 1 : 0;
  const arcPath = pct >= 100
    ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`
    : `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke="#f3f4f6" strokeWidth={stroke} fill="none" />
      <Path d={arcPath} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
      <Text x={cx} y={cy + 4} style={{ fontSize: 13, fontWeight: "bold", fill: "#111827", textAnchor: "middle" } as any}>{pct}%</Text>
    </Svg>
  );
}

// ─── Single issue row (two-line layout — avoids @react-pdf flex overlap bug) ──
// Line 1: [icon] [key]  [title ...]
// Line 2:              [badges ...]
// Line 3:              [description ...]  (optional)
const INDENT = 22; // icon width (14) + gap (4) + a bit of breathing room

function IssueRowPdf({ issue }: { issue: PdfIssue }) {
  const tc = TYPE_COLOR[issue.type] || C.gray;
  const sc = STATUS_COLOR[issue.status] || C.gray;
  const pc = PRIORITY_COLOR[issue.priority] || C.gray;
  const desc = stripHtml(issue.description);

  return (
    <View wrap={false} style={{ marginBottom: 5 }}>
      {/* ── Row 1: icon  key  title ── */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Type icon */}
        <View style={[s.issueIconBox, { backgroundColor: tc, marginRight: 5 }]}>
          <Text style={s.issueIconTxt}>{TYPE_ICON[issue.type] || "?"}</Text>
        </View>
        {/* Key — fixed width so title always starts at the same x */}
        <Text style={{ fontSize: 7, color: "#9ca3af", fontFamily: "Helvetica-Oblique", width: 48, paddingTop: 1.5 }}>
          {issue.key}
        </Text>
        {/* Title — takes remaining width, does NOT share the row with badges */}
        <Text style={{ fontSize: 8.5, color: "#111827", lineHeight: 1.35, flex: 1 }}>
          {issue.title}
        </Text>
      </View>

      {/* ── Row 2: badges (indented to align with title) ── */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: 3, marginLeft: INDENT + 48 }}>
        <Badge label={STATUS_LABEL[issue.status] || issue.status} color={sc} />
        <Badge label={PRIORITY_LABEL[issue.priority] || issue.priority} color={pc} />
        <Badge label={assigneeName(issue)} color={C.teal} />
        {issue.story_points != null && (
          <Badge label={`${issue.story_points} pts`} color={C.gray} />
        )}
        {issue.labels?.map((l) => {
          const lc = solidColor(l.color);
          return (
            <View key={l.id} style={[s.badge, { backgroundColor: lc + "30", borderWidth: 1, borderColor: lc + "80" }]}>
              <Text style={[s.badgeTxt, { color: lc }]}>{l.name}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Row 3: description (optional) ── */}
      {desc ? (
        <Text style={{ fontSize: 6.5, color: "#9ca3af", marginTop: 2, marginLeft: INDENT + 48, lineHeight: 1.4 }}>
          {desc}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Recursive tree renderer ──────────────────────────────────────────────────
function RenderNode({ node, depth = 0 }: { node: IssueNode; depth?: number }) {
  const blockStyle =
    depth === 0 && node.issue.type === "epic" ? s.epicBlock :
    node.issue.type === "story"   ? s.storyBlock :
    node.issue.type === "subtask" ? s.subtaskBlock :
    node.issue.type === "task" || node.issue.type === "bug" ? s.taskBlock :
    s.orphanBlock;

  return (
    <View style={blockStyle}>
      <IssueRowPdf issue={node.issue} depth={depth} />
      {node.children.length > 0 && (
        <View style={{ marginTop: 2 }}>
          {node.children.map((child) => (
            <RenderNode key={child.issue.id} node={child} depth={depth + 1} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Hierarchy section for a set of issues ───────────────────────────────────
function HierarchySection({ issues }: { issues: PdfIssue[] }) {
  if (issues.length === 0) {
    return <Text style={{ fontSize: 8, color: C.gray, marginBottom: 6 }}>No issues.</Text>;
  }
  const { epics, orphans } = buildTree(issues);
  return (
    <View>
      {epics.map((node) => <RenderNode key={node.issue.id} node={node} depth={0} />)}
      {orphans.length > 0 && (
        <View>
          {epics.length > 0 && (
            <Text style={{ fontSize: 7.5, color: C.gray, fontFamily: "Helvetica-Bold", marginBottom: 4, marginTop: 4 }}>
              UNLINKED ISSUES
            </Text>
          )}
          {orphans.map((node) => <RenderNode key={node.issue.id} node={node} depth={0} />)}
        </View>
      )}
    </View>
  );
}

// ─── Main PDF Document ────────────────────────────────────────────────────────
export function ProjectPdfDocument({ data }: { data: ProjectPdfData }) {
  const { project, issues, sprints, members, virtualMembers, exportedAt } = data;

  const total = issues.length;
  const doneCount = issues.filter((i) => i.status === "done" || i.status === "completed").length;
  const overallPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const inProgressCount = issues.filter((i) => i.status === "in_progress").length;
  const blockedCount = issues.filter((i) => i.status === "blocked").length;

  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  issues.forEach((i) => {
    typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
    statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
  });

  // User map
  interface UD { name: string; color?: string; issues: PdfIssue[] }
  const userMap: Record<string, UD> = { unassigned: { name: "Unassigned", issues: [] } };
  members.forEach((m) => {
    userMap[m.user_id] = { name: m.profile?.full_name || m.profile?.email || "Unknown", issues: [] };
  });
  virtualMembers.forEach((vm) => {
    userMap[`v:${vm.id}`] = { name: vm.name, color: vm.color, issues: [] };
  });
  issues.forEach((i) => {
    const k = assigneeKey(i);
    if (!userMap[k]) userMap[k] = { name: assigneeName(i), issues: [] };
    userMap[k].issues.push(i);
  });
  const userEntries = Object.entries(userMap).filter(([, v]) => v.issues.length > 0).sort((a, b) => b[1].issues.length - a[1].issues.length);

  const backlogIssues = issues.filter((i) => !i.sprint_id);

  // Label breakdown
  const projectLabels = data.labels || [];
  const labelCounts: Record<string, number> = {};
  issues.forEach((i) => i.labels?.forEach((l) => { labelCounts[l.id] = (labelCounts[l.id] || 0) + 1; }));
  const labelChartData = projectLabels
    .filter((l) => labelCounts[l.id] > 0)
    .map((l) => ({ label: l.name, value: labelCounts[l.id], color: solidColor(l.color) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return (
    <Document title={`${project.name} — Export`} author="Mame">

      {/* ══ COVER ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={[s.page, { display: "flex", flexDirection: "column", backgroundColor: C.navy }]}>
        <View style={s.coverTop}>
          <View style={s.coverBadge}><Text style={s.coverBadgeTxt}>PROJECT REPORT</Text></View>
          <Text style={s.coverTitle}>{project.name}</Text>
          <Text style={s.coverSub}>{project.key} · {project.type === "scrum" ? "Scrum" : "Kanban"}</Text>
          <View style={s.coverDivider} />
          <View style={s.coverMetaRow}>
            {[
              { label: "EXPORTED ON",     val: exportedAt },
              { label: "TOTAL ISSUES",    val: String(total) },
              { label: "OVERALL PROGRESS",val: `${overallPct}% done` },
              { label: "TEAM SIZE",       val: `${members.length + virtualMembers.length} people` },
            ].map((m) => (
              <View key={m.label}>
                <Text style={s.coverMetaLabel}>{m.label}</Text>
                <Text style={s.coverMetaVal}>{m.val}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={s.statsStrip}>
          {[
            { num: typeCounts["epic"] || 0,    label: "Epics" },
            { num: typeCounts["story"] || 0,   label: "Stories" },
            { num: typeCounts["task"] || 0,    label: "Tasks" },
            { num: typeCounts["bug"] || 0,     label: "Bugs" },
            { num: typeCounts["subtask"] || 0, label: "Subtasks" },
            { num: doneCount,                  label: "Done" },
            { num: inProgressCount,            label: "In Progress" },
            { num: blockedCount,               label: "Blocked" },
          ].map((s2) => (
            <View key={s2.label} style={s.statBox}>
              <Text style={s.statNum}>{s2.num}</Text>
              <Text style={s.statLabel}>{s2.label}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* ══ OVERVIEW ════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.contentPage}>
        <Footer projectKey={project.key} exportedAt={exportedAt} />
        <View style={s.sectionHeader}>
          <View style={[s.sectionBar, { backgroundColor: C.blue }]} />
          <Text style={s.sectionTitle}>Project Overview</Text>
        </View>

        {/* Ring + by type + by status */}
        <View style={s.row3}>
          <View style={[s.card, { width: 130, alignItems: "center" }]}>
            <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "#6b7280", marginBottom: 6 }}>OVERALL PROGRESS</Text>
            <PdfRing pct={overallPct} color={overallPct === 100 ? C.green : C.blue} />
            <Text style={{ fontSize: 7, color: C.gray, marginTop: 5 }}>{doneCount} of {total} done</Text>
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "#6b7280", marginBottom: 6 }}>BY TYPE</Text>
            <HBarChart data={TYPE_ORDER.filter((t) => typeCounts[t] > 0).map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: typeCounts[t], color: TYPE_COLOR[t] }))} />
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "#6b7280", marginBottom: 6 }}>BY STATUS</Text>
            <HBarChart data={Object.entries(STATUS_LABEL).filter(([k]) => statusCounts[k] > 0).map(([k, l]) => ({ label: l, value: statusCounts[k], color: STATUS_COLOR[k] }))} />
          </View>
        </View>

        {/* Sprints summary */}
        {sprints.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <View style={[s.sectionBar, { backgroundColor: C.purple }]} />
              <Text style={s.sectionTitle}>Sprints Summary</Text>
            </View>
            {sprints.map((sprint, idx) => {
              const si = issues.filter((i) => i.sprint_id === sprint.id);
              const sd = si.filter((i) => i.status === "done" || i.status === "completed").length;
              const pct = si.length > 0 ? Math.round((sd / si.length) * 100) : 0;
              const sc = sprint.status === "active" ? C.green : sprint.status === "completed" ? C.gray : C.blue;
              return (
                <View key={sprint.id} style={{ flexDirection: "row", padding: 7, backgroundColor: idx % 2 === 0 ? C.lightBg : C.white, borderRadius: 3, marginBottom: 2, borderWidth: 1, borderColor: C.border }} wrap={false}>
                  <View style={{ width: 130 }}><Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111827" }}>{sprint.name}</Text></View>
                  <View style={{ width: 55 }}><Badge label={sprint.status} color={sc} /></View>
                  <View style={{ width: 90 }}><Text style={{ fontSize: 7, color: "#6b7280" }}>{fmtDate(sprint.start_date)} → {fmtDate(sprint.end_date)}</Text></View>
                  <View style={{ flex: 1 }}><Text style={{ fontSize: 7, color: "#6b7280" }}>{sprint.goal || "—"}</Text></View>
                  <Text style={{ width: 28, fontSize: 7.5, textAlign: "center" }}>{si.length}</Text>
                  <Text style={{ width: 32, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: pct === 100 ? C.green : C.blue, textAlign: "center" }}>{pct}%</Text>
                </View>
              );
            })}
          </>
        )}

        {/* Team summary cards */}
        <View style={[s.sectionHeader, { marginTop: 12 }]}>
          <View style={[s.sectionBar, { backgroundColor: C.teal }]} />
          <Text style={s.sectionTitle}>Team at a Glance</Text>
        </View>
        {/* By Label chart */}
        {labelChartData.length > 0 && (
          <>
            <View style={[s.sectionHeader, { marginTop: 12 }]}>
              <View style={[s.sectionBar, { backgroundColor: C.orange }]} />
              <Text style={s.sectionTitle}>By Label</Text>
              <Text style={s.sectionSubtitle}>· issues tagged with each label</Text>
            </View>
            <View style={[s.card, { marginBottom: 10 }]}>
              <HBarChart data={labelChartData} />
            </View>
          </>
        )}

        <View style={s.row3}>
          {userEntries.slice(0, 6).map(([key, ud]) => {
            const done = ud.issues.filter((i) => i.status === "done" || i.status === "completed").length;
            const pct = ud.issues.length > 0 ? Math.round((done / ud.issues.length) * 100) : 0;
            const bg = ud.color || (key === "unassigned" ? C.gray : C.blue);
            return (
              <View key={key} style={[s.card, { flex: 1, minWidth: 75 }]}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 5 }}>
                  <Text style={{ color: C.white, fontSize: 7, fontFamily: "Helvetica-Bold" }}>{initials(ud.name)}</Text>
                </View>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#111827" }}>{ud.name}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: bg, marginTop: 3 }}>{ud.issues.length}</Text>
                <Text style={{ fontSize: 6.5, color: C.gray }}>issues · {pct}% done</Text>
              </View>
            );
          })}
        </View>
      </Page>

      {/* ══ FULL HIERARCHY ══════════════════════════════════════════════════ */}
      <Page size="A4" style={s.contentPage}>
        <Footer projectKey={project.key} exportedAt={exportedAt} />
        <View style={s.sectionHeader}>
          <View style={[s.sectionBar, { backgroundColor: C.purple }]} />
          <Text style={s.sectionTitle}>All Issues — Hierarchy View</Text>
          <Text style={s.sectionSubtitle}>· {total} total · epics → stories → tasks/bugs → subtasks</Text>
        </View>
        <HierarchySection issues={issues} />
      </Page>

      {/* ══ SPRINT PAGES ════════════════════════════════════════════════════ */}
      {sprints.map((sprint) => {
        const si = issues.filter((i) => i.sprint_id === sprint.id);
        const sd = si.filter((i) => i.status === "done" || i.status === "completed").length;
        const pct = si.length > 0 ? Math.round((sd / si.length) * 100) : 0;
        const sc = sprint.status === "active" ? C.green : sprint.status === "completed" ? C.gray : C.blue;
        return (
          <Page key={sprint.id} size="A4" style={s.contentPage}>
            <Footer projectKey={project.key} exportedAt={exportedAt} />
            <View style={s.sectionHeader}>
              <View style={[s.sectionBar, { backgroundColor: sc }]} />
              <Text style={s.sectionTitle}>{sprint.name}</Text>
              <Badge label={sprint.status} color={sc} />
            </View>
            <View style={s.sprintBox}>
              <View style={{ flex: 1 }}>
                {sprint.goal && <Text style={{ fontSize: 8.5, color: "#1e40af", fontFamily: "Helvetica-Oblique", marginBottom: 6 }}>"{sprint.goal}"</Text>}
                <View style={{ flexDirection: "row", gap: 18 }}>
                  {[
                    { label: "Start", val: fmtDate(sprint.start_date) },
                    { label: "End", val: fmtDate(sprint.end_date) },
                    { label: "Total issues", val: String(si.length) },
                    { label: "Done", val: String(sd) },
                  ].map((m) => (
                    <View key={m.label}>
                      <Text style={{ fontSize: 6.5, color: "#6b7280" }}>{m.label}</Text>
                      <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#1e40af" }}>{m.val}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: pct === 100 ? C.green : C.blue }}>{pct}%</Text>
                <Text style={{ fontSize: 6.5, color: "#6b7280" }}>complete</Text>
              </View>
            </View>
            {/* Status pill row */}
            <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {Object.entries(STATUS_LABEL).map(([st, label]) => {
                const cnt = si.filter((i) => i.status === st).length;
                if (!cnt) return null;
                return (
                  <View key={st} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: STATUS_COLOR[st] }} />
                    <Text style={{ fontSize: 7, color: C.darkGray }}>{label}: <Text style={{ fontFamily: "Helvetica-Bold" }}>{cnt}</Text></Text>
                  </View>
                );
              })}
            </View>
            <HierarchySection issues={si} />
          </Page>
        );
      })}

      {/* ══ BACKLOG ══════════════════════════════════════════════════════════ */}
      {backlogIssues.length > 0 && (
        <Page size="A4" style={s.contentPage}>
          <Footer projectKey={project.key} exportedAt={exportedAt} />
          <View style={s.sectionHeader}>
            <View style={[s.sectionBar, { backgroundColor: C.gray }]} />
            <Text style={s.sectionTitle}>Backlog</Text>
            <Text style={s.sectionSubtitle}>· {backlogIssues.length} issues not in any sprint</Text>
          </View>
          <HierarchySection issues={backlogIssues} />
        </Page>
      )}

      {/* ══ PER-PERSON PAGES ════════════════════════════════════════════════ */}
      {userEntries.map(([key, ud]) => {
        const done = ud.issues.filter((i) => i.status === "done" || i.status === "completed").length;
        const inProg = ud.issues.filter((i) => i.status === "in_progress").length;
        const blocked = ud.issues.filter((i) => i.status === "blocked").length;
        const pct = ud.issues.length > 0 ? Math.round((done / ud.issues.length) * 100) : 0;
        const bg = ud.color || (key === "unassigned" ? C.gray : C.blue);
        return (
          <Page key={key} size="A4" style={s.contentPage}>
            <Footer projectKey={project.key} exportedAt={exportedAt} />
            <View style={s.sectionHeader}>
              <View style={[s.sectionBar, { backgroundColor: bg }]} />
              <Text style={s.sectionTitle}>Team Member</Text>
            </View>
            {/* Person box */}
            <View style={[s.personBox, { backgroundColor: bg + "10", borderColor: bg + "40" }]}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.white, fontSize: 10, fontFamily: "Helvetica-Bold" }}>{initials(ud.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: bg }}>{ud.name}</Text>
                <Text style={{ fontSize: 7.5, color: "#6b7280", marginTop: 1 }}>{ud.issues.length} issues · {pct}% done</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 16 }}>
                {[{ label: "Done", val: done, color: C.green }, { label: "In Progress", val: inProg, color: C.blue }, { label: "Blocked", val: blocked, color: C.red }].map((m) => (
                  <View key={m.label} style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: m.color }}>{m.val}</Text>
                    <Text style={{ fontSize: 6, color: C.gray }}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            {/* Progress bar */}
            <View style={{ marginBottom: 10 }}>
              <View style={{ backgroundColor: "#f3f4f6", height: 5, borderRadius: 3, marginBottom: 3 }}>
                <View style={{ backgroundColor: pct === 100 ? C.green : bg, height: 5, borderRadius: 3, width: `${pct}%` }} />
              </View>
              <Text style={{ fontSize: 6.5, color: C.gray }}>{pct}% complete — {done} of {ud.issues.length} issues done</Text>
            </View>
            {/* Type pills */}
            <View style={{ flexDirection: "row", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
              {TYPE_ORDER.map((t) => {
                const cnt = ud.issues.filter((i) => i.type === t).length;
                if (!cnt) return null;
                return <Badge key={t} label={`${cnt} ${t}`} color={TYPE_COLOR[t]} />;
              })}
            </View>
            <HierarchySection issues={ud.issues} />
          </Page>
        );
      })}

    </Document>
  );
}
