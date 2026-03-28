import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Code2,
  ExternalLink,
  Flame,
  Heart,
  Loader2,
  Search,
  Target,
  UserRound,
  Zap,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/context/ThemeProvider";
import { activityAPI } from "@/services/api";
import type { UserProgress, UserSolution } from "@/types/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ActivityDay = { date: string; count: number };
type ProfileTab = "solved" | "saved" | "favorite";

const roleMeta: Record<string, { label: string; accent: string; blurb: string }> = {
  admin: { label: "Platform Admin", accent: "#f59e0b", blurb: "Driving moderation, quality controls, and platform operations." },
  recruiter: { label: "Recruiter", accent: "#38bdf8", blurb: "Building interview pipelines and reviewing candidate performance." },
  user: { label: "Candidate", accent: "#34d399", blurb: "Solving problems consistently and sharpening interview performance." },
};

const formatDate = (value?: string | Date | null, opts?: Intl.DateTimeFormatOptions) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
};

const toUtcDayKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

const ProfilePage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [tab, setTab] = useState<ProfileTab>("solved");
  const [difficulty, setDifficulty] = useState("all");
  const [search, setSearch] = useState("");

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const C = {
    text: isDark ? "#ffffff" : "#0f172a",
    textSoft: isDark ? "rgba(255,255,255,0.52)" : "rgba(15,23,42,0.68)",
    textMuted: isDark ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.46)",
    textFaint: isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.22)",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.88)",
    surfaceSoft: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.045)",
    surfaceStrong: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.96)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    divider: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.06)",
    hover: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.03)",
    heroBg: isDark
      ? "linear-gradient(145deg, rgba(52,211,153,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(99,102,241,0.04) 100%)"
      : "linear-gradient(145deg, rgba(52,211,153,0.10) 0%, rgba(255,255,255,0.95) 55%, rgba(99,102,241,0.10) 100%)",
  };

  const S = {
    card: {
      borderRadius: 20,
      border: `1px solid ${C.border}`,
      background: C.surface,
      padding: 20,
    } as React.CSSProperties,
    label: {
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.2em",
      textTransform: "uppercase" as const,
      color: C.textMuted,
    },
    mono: { fontFamily: "'DM Mono', 'Fira Code', monospace" },
    heading: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 900,
      letterSpacing: "-0.025em",
      color: C.text,
    },
  };

  const heatColor = (count: number): React.CSSProperties => {
    if (count >= 6) return { background: "#34d399", boxShadow: "0 0 5px rgba(52,211,153,0.5)" };
    if (count >= 4) return { background: "rgba(52,211,153,0.75)" };
    if (count >= 2) return { background: "rgba(52,211,153,0.45)" };
    if (count >= 1) return { background: "rgba(52,211,153,0.2)" };
    return { background: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.08)" };
  };

  const diffStyle = (d?: string | null): React.CSSProperties => {
    const n = (d || "").toLowerCase();
    if (n === "easy") return { color: "#34d399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" };
    if (n === "medium") return { color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" };
    if (n === "hard") return { color: "#fb7185", background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.2)" };
    return { color: C.textMuted, background: C.surfaceSoft, border: `1px solid ${C.border}` };
  };

  const Pill = ({
    icon: Icon,
    label,
    value,
    color = C.textSoft,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color?: string;
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        border: `1px solid ${C.border}`,
        borderRadius: 99,
        padding: "6px 14px",
        background: C.surface,
        fontSize: 11,
        color: C.textSoft,
        ...S.mono,
      }}
    >
      <Icon size={12} style={{ color }} />
      <span>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );

  const { data: progress, isLoading: progressLoading } = useQuery<UserProgress>({
    queryKey: ["/progress/"],
    enabled: !!user,
  });
  const { data: solutions, isLoading: solutionsLoading } = useQuery<UserSolution[]>({
    queryKey: ["/user/solutions"],
    enabled: !!user,
  });
  const { data: activityData, isLoading: activityLoading } = useQuery<ActivityDay[]>({
    queryKey: ["activity"],
    queryFn: () => activityAPI.getActivity(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(52,211,153,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <UserRound size={24} style={{ color: "#34d399" }} />
          </div>
          <h2 style={{ ...S.heading, fontSize: 20, marginBottom: 8 }}>Authentication Required</h2>
          <p style={{ fontSize: 13, color: C.textSoft, marginBottom: 16, ...S.mono }}>Please log in to view your profile.</p>
          <Button asChild><Link href="/auth">Sign In</Link></Button>
        </div>
      </div>
    );
  }

  const profileRole = roleMeta[user.role ?? "user"] ?? roleMeta.user;
  const displayName = user.name?.trim() || user.username?.trim() || "CodeMaster User";
  const handle = user.username?.trim() ? `@${user.username.trim()}` : null;
  const bio = user.bio?.trim() || profileRole.blurb;

  const allSolutions = solutions ?? [];
  const solvedCount = allSolutions.filter((s) => s.solved).length;
  const savedCount = allSolutions.filter((s) => !s.solved).length;
  const favoriteCount = allSolutions.filter((s) => s.favorite).length;
  const diffTotals = {
    easy: allSolutions.filter((s) => s.solved && (s.difficulty || "").toLowerCase() === "easy").length,
    medium: allSolutions.filter((s) => s.solved && (s.difficulty || "").toLowerCase() === "medium").length,
    hard: allSolutions.filter((s) => s.solved && (s.difficulty || "").toLowerCase() === "hard").length,
  };

  const activityEntries = activityData ?? [];
  const totalActivity = activityEntries.reduce((sum, e) => sum + e.count, 0);
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    activityEntries.forEach((e) => map.set(e.date, e.count));
    return map;
  }, [activityEntries]);

  const currentStreak = progress?.streak ?? 0;
  const articlesRead = progress?.articlesRead ?? 0;
  const problemsSolved = Math.max(progress?.problemsSolved ?? 0, solvedCount);
  const codePoints = problemsSolved * 120 + diffTotals.medium * 45 + diffTotals.hard * 80 + favoriteCount * 10;
  const rank = Math.max(1, 10000 - codePoints);
  const hardWeight = diffTotals.easy + diffTotals.medium * 2 + diffTotals.hard * 3;
  const totalWeight = Math.max(1, diffTotals.easy + diffTotals.medium + diffTotals.hard);
  const mastery = Math.round((hardWeight / (totalWeight * 3)) * 100);

  const filtered = allSolutions.filter((s) => {
    const matchesTab = (tab === "solved" && s.solved) || (tab === "saved" && !s.solved) || (tab === "favorite" && s.favorite);
    const matchesDiff = difficulty === "all" || (s.difficulty || "").toLowerCase() === difficulty;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || String(s.problemId).includes(q) || (s.language || "").toLowerCase().includes(q) || (s.difficulty || "").toLowerCase().includes(q);
    return matchesTab && matchesDiff && matchesSearch;
  });

  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const rollingStart = new Date(end);
  rollingStart.setUTCDate(rollingStart.getUTCDate() - 364);
  const alignedStart = new Date(rollingStart);
  alignedStart.setUTCDate(alignedStart.getUTCDate() - alignedStart.getUTCDay());
  const alignedEnd = new Date(end);
  alignedEnd.setUTCDate(alignedEnd.getUTCDate() + (6 - alignedEnd.getUTCDay()));
  const weekCount = Math.max(1, Math.floor((alignedEnd.getTime() - alignedStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);

  const weeks: Date[][] = [];
  for (let wi = 0; wi < weekCount; wi += 1) {
    const week: Date[] = [];
    for (let di = 0; di < 7; di += 1) {
      const d = new Date(alignedStart);
      d.setUTCDate(alignedStart.getUTCDate() + wi * 7 + di);
      week.push(d);
    }
    weeks.push(week);
  }

  const monthLabels = weeks.map((week) => {
    const firstDay = week.find((d) => d.getUTCDate() <= 7);
    return firstDay ? firstDay.toLocaleDateString("en-US", { month: "short" }) : "";
  });
  const monthMarkers = monthLabels
    .map((label, index) => ({ label, index }))
    .filter((item, index, list) => item.label && (index === 0 || item.label !== list[index - 1]?.label));

  const panelTitle = tab === "solved" ? "Solved Problems" : tab === "saved" ? "Saved Drafts" : "Favorite Problems";
  const panelCount = tab === "solved" ? solvedCount : tab === "saved" ? savedCount : favoriteCount;

  const diffRows = [
    { label: "Easy", value: diffTotals.easy, color: "#34d399", bar: "rgba(52,211,153,0.85)" },
    { label: "Medium", value: diffTotals.medium, color: "#fbbf24", bar: "rgba(251,191,36,0.85)" },
    { label: "Hard", value: diffTotals.hard, color: "#fb7185", bar: "rgba(251,113,133,0.85)" },
  ];
  const heatCell = 11;
  const heatGap = 4;

  return (
    <div style={{ ...S.mono, display: "flex", flexDirection: "column", gap: 16 }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          border: `1px solid ${C.border}`,
          background: C.heroBg,
          padding: 24,
        }}
      >
        <div style={{ position: "absolute", left: -80, top: -80, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: -60, bottom: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: -3, borderRadius: 22, background: "linear-gradient(135deg, rgba(52,211,153,0.5), rgba(99,102,241,0.3))" }} />
            <Avatar style={{ position: "relative", width: 88, height: 88, borderRadius: 18, border: `2px solid ${C.border}` }}>
              <AvatarFallback style={{ ...S.heading, borderRadius: 18, fontSize: 34, fontWeight: 900, background: "linear-gradient(135deg, #064e3b, #1e3a5f)", color: "#ffffff" }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
              <AvatarImage src={user.avatar ?? undefined} alt={displayName} style={{ borderRadius: 18 }} />
            </Avatar>
            <div
              style={{
                position: "absolute",
                bottom: -10,
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                background: isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.96)",
                border: "1px solid rgba(52,211,153,0.3)",
                borderRadius: 99,
                padding: "3px 10px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#34d399",
              }}
            >
              RANK #{rank.toLocaleString()}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ ...S.heading, fontSize: 38, lineHeight: 1, margin: 0 }}>{displayName}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12 }}>
              {handle && <span style={{ color: C.textSoft }}>{handle}</span>}
              <span style={{ color: C.textFaint }}>·</span>
              <span style={{ color: profileRole.accent, fontWeight: 600 }}>{profileRole.label}</span>
              <span style={{ color: C.textFaint }}>·</span>
              <span style={{ color: C.textMuted, fontSize: 11 }}>Joined {formatDate(user.createdAt, { month: "short", year: "numeric" })}</span>
            </div>
            <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.7, marginTop: 10, maxWidth: 520 }}>{bio}</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
              <Pill icon={Flame} label="Streak" value={`${currentStreak}d`} color="#fb923c" />
              <Pill icon={Code2} label="Solved" value={solvedCount} color="#34d399" />
              <Pill icon={BookOpen} label="Articles" value={articlesRead} color="#38bdf8" />
              <Pill icon={Heart} label="Favorites" value={favoriteCount} color="#f472b6" />
              <Pill icon={Target} label="Mastery" value={`${mastery}%`} color="#a78bfa" />
              <Pill icon={Calendar} label="Last Active" value={formatDate(progress?.lastActive, { month: "short", day: "numeric" })} />
            </div>
          </div>

          <div style={{ flexShrink: 0, border: `1px solid ${C.border}`, background: C.surfaceStrong, borderRadius: 16, padding: "12px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Zap size={13} style={{ color: "#fbbf24" }} />
              <span style={{ ...S.label }}>Code Points</span>
            </div>
            <div style={{ ...S.heading, fontSize: 28, lineHeight: 1 }}>{codePoints.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 16, alignItems: "start" }}>
        <div style={{ ...S.card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h2 style={{ ...S.heading, fontSize: 16, margin: 0 }}>Contribution Activity</h2>
              <p style={{ ...S.mono, fontSize: 11, color: C.textMuted, marginTop: 3 }}>
                Last 12 months · {totalActivity} tracked actions
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ ...S.label, fontSize: 9 }}>Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <div
                  key={l}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    ...heatColor(l === 0 ? 0 : l === 1 ? 1 : l === 2 ? 2 : l === 3 ? 4 : 6),
                  }}
                />
              ))}
              <span style={{ ...S.label, fontSize: 9 }}>More</span>
            </div>
          </div>

          {activityLoading ? (
            <div style={{ display: "flex", height: 120, alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={20} style={{ color: "#34d399", animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gap: heatGap, paddingLeft: 2, gridTemplateColumns: `repeat(${weeks.length}, ${heatCell}px)` }}>
                  {monthMarkers.map((m) => (
                    <div key={`${m.label}-${m.index}`} style={{ ...S.label, fontSize: 9, gridColumn: `${m.index + 1} / span 1`, whiteSpace: "nowrap" }}>
                      {m.label}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 5 }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: "flex", flexDirection: "column", gap: heatGap }}>
                      {week.map((date) => {
                        const key = toUtcDayKey(date);
                        const count = activityMap.get(key) || 0;
                        return (
                          <div
                            key={key}
                            title={`${key}: ${count}`}
                            style={{ width: heatCell, height: heatCell, borderRadius: 3, cursor: "default", transition: "transform 0.1s", ...heatColor(count) }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, fontSize: 10, color: C.textMuted }}>
                  <span>{totalActivity} submissions</span>
                  <span>{problemsSolved} solved</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 0 }}>
          <h2 style={{ ...S.heading, fontSize: 16, margin: "0 0 4px" }}>Solved Breakdown</h2>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 20, ...S.mono }}>Difficulty distribution</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {diffRows.map(({ label, value, color, bar }) => {
              const pct = Math.round((value / Math.max(1, solvedCount)) * 100);
              return (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 11, ...S.mono }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{value}</span>
                      <span style={{ color: C.textMuted }}> / {solvedCount}</span>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: C.surfaceSoft, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 99, background: bar, width: `${pct}%`, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 20,
              borderRadius: 16,
              padding: "16px 18px",
              background: isDark
                ? "linear-gradient(135deg, rgba(52,211,153,0.1), rgba(99,102,241,0.1))"
                : "linear-gradient(135deg, rgba(52,211,153,0.12), rgba(99,102,241,0.08))",
              border: "1px solid rgba(52,211,153,0.12)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", right: -16, top: -16, width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.35) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ ...S.label, marginBottom: 6 }}>Overall Mastery</div>
            <div style={{ ...S.heading, fontSize: 44, lineHeight: 1 }}>
              {mastery}<span style={{ fontSize: 24, color: "#34d399" }}>%</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: `1px solid ${C.divider}`,
            padding: "16px 20px",
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 3, background: isDark ? "rgba(0,0,0,0.2)" : "rgba(15,23,42,0.05)", border: `1px solid ${C.divider}`, borderRadius: 13, padding: 3, width: "fit-content", marginBottom: 12 }}>
              {(["solved", "saved", "favorite"] as ProfileTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "6px 14px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: tab === t ? "#34d399" : "transparent",
                    color: tab === t ? "#000" : C.textMuted,
                    ...S.mono,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <h2 style={{ ...S.heading, fontSize: 16, margin: "0 0 2px" }}>{panelTitle}</h2>
            <p style={{ fontSize: 11, color: C.textMuted, ...S.mono, margin: 0 }}>{panelCount} items in this view</p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger style={{ width: 150, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.textSoft, fontSize: 12, ...S.mono }}>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted, pointerEvents: "none" }} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by id or language"
                style={{ paddingLeft: 32, width: 210, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.textSoft, fontSize: 12, ...S.mono }}
              />
            </div>
          </div>
        </div>

        {solutionsLoading ? (
          <div style={{ display: "flex", height: 200, alignItems: "center", justifyContent: "center" }}>
            <Loader2 size={24} style={{ color: "#34d399", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12, textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: C.surfaceSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Code2 size={20} style={{ color: C.textMuted }} />
            </div>
            <p style={{ fontSize: 12, color: C.textSoft, maxWidth: 280, ...S.mono, margin: 0 }}>
              Nothing matches. Try a different tab or solve more problems.
            </p>
            <Button asChild variant="outline" style={{ borderRadius: 99, fontSize: 12, borderColor: C.border, color: C.textSoft }}>
              <Link href="/problems">Browse Problems</Link>
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 700 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 110px 100px",
                  padding: "8px 20px",
                  borderBottom: `1px solid ${C.divider}`,
                  ...S.label,
                  fontSize: 9,
                }}
              >
                <span>Status</span><span>Problem</span><span>Difficulty</span>
                <span style={{ textAlign: "right" }}>Action</span>
              </div>

              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {filtered.map((solution) => (
                  <div
                    key={solution.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "90px 1fr 110px 100px",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 20px",
                      borderBottom: `1px solid ${C.divider}`,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      {solution.solved ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 99, padding: "4px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
                          Solved
                        </span>
                      ) : solution.favorite ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 99, padding: "4px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.2)", color: "#fb7185" }}>
                          <Heart size={9} />Fav
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 99, padding: "4px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", background: C.surfaceSoft, border: `1px solid ${C.border}`, color: C.textMuted }}>
                          Saved
                        </span>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Problem #{solution.problemId}
                      </p>
                      <p style={{ fontSize: 10, color: C.textMuted, margin: "2px 0 0", ...S.mono }}>
                        {solution.language} · {formatDate(solution.updatedAt, { month: "short", day: "numeric" })}
                      </p>
                    </div>

                    <div>
                      <span style={{ borderRadius: 99, padding: "4px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", ...diffStyle(solution.difficulty) }}>
                        {solution.difficulty || "N/A"}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <Link
                        href={`/problems/${solution.problemId}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.textMuted, textDecoration: "none", transition: "color 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#34d399")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.textMuted)}
                      >
                        Open <ExternalLink size={11} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: `1px solid ${C.divider}`, fontSize: 10, color: C.textMuted, ...S.mono }}>
                <span>{filtered.length} results</span>
                <Link
                  href="/problems"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: C.textSoft, textDecoration: "none" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#34d399")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.textSoft)}
                >
                  Explore more <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ProfilePage;
