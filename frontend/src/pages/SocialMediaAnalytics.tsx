// @ts-nocheck
import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, PieChart, Pie, Cell,
} from 'recharts';
import {
  Share2, Activity, MessageSquare, Lightbulb, TrendingUp,
  Hash, Users, Eye, Heart, Star, Clock, Calendar,
  ChevronDown, ArrowUpRight, Zap, Target, BarChart3,
  ThumbsUp, ThumbsDown, Minus,
  type LucideIcon,
} from 'lucide-react';
import CountUp from 'react-countup';
import { cn } from '../utils/cn';
import { useTheme } from '../hooks/useTheme';
import { useQuery } from '@tanstack/react-query';
import { socialMediaService } from '../services/socialMediaService';
import type { SocialMediaData, SocialMediaEngagementMetrics, SocialMediaSentimentAnalysis } from '../services/socialMediaService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { exportToExcel, printTable } from '../utils/exportUtils';
import type { ExportColumn } from '../utils/exportUtils';
import { ActionBar } from '../components/common/ActionBar';

/* ═══════════════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
═══════════════════════════════════════════════════════════════════════ */

const EASE: any = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = (d = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } },
});
const scaleIn = (d = 0) => ({
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE, delay: d } },
});
const VP = { once: true, margin: '-60px' as const };

/* ═══════════════════════════════════════════════════════════════════════
   CHART COLORS
═══════════════════════════════════════════════════════════════════════ */

const CHART_COLORS = ['#C9C036', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#fb923c'];

const tooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: 12,
  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
};

/* ═══════════════════════════════════════════════════════════════════════
   SENTIMENT CONFIG
═══════════════════════════════════════════════════════════════════════ */

const sentimentCfg = {
  positive: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: ThumbsUp, label: 'Positive' },
  neutral:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  icon: Minus,     label: 'Neutral' },
  negative: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: ThumbsDown, label: 'Negative' },
};

/* ═══════════════════════════════════════════════════════════════════════
   HELPER: GlassCard
═══════════════════════════════════════════════════════════════════════ */

function GlassCard({ children, className, style }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { colors: P } = useTheme();
  return (
    <div
      className={cn('relative rounded-[20px]', className)}
      style={{
        background: `linear-gradient(168deg, ${P.card} 0%, ${P.bg} 100%)`,
        border: `1px solid ${P.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 40px rgba(0,0,0,0.3)',
        ...style,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${P.borderHi}90, transparent)` }}
      />
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HELPER: Section Heading
═══════════════════════════════════════════════════════════════════════ */

function SectionHeading({ icon: Icon, title, sub }: {
  icon: LucideIcon;
  title: string;
  sub?: string;
}) {
  const { colors: P } = useTheme();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -12 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.45, ease: EASE }}
      className="mb-5 flex items-center gap-3"
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: 'rgba(201,192,54,0.1)', border: '1px solid rgba(201,192,54,0.15)' }}
      >
        <Icon size={16} style={{ color: P.accent }} />
      </div>
      <div>
        <h2 className="text-lg font-semibold" style={{ color: P.textHi }}>{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: P.textLo }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HELPER: Activity Type Config
═══════════════════════════════════════════════════════════════════════ */

const activityTypeCfg: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
  review:     { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',    icon: Star },
  idea:       { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',   icon: Lightbulb },
  donation:   { color: '#34d399', bg: 'rgba(52,211,153,0.1)',    icon: Heart },
  engagement: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',    icon: ThumbsUp },
  milestone:  { color: '#C9C036', bg: 'rgba(201,192,54,0.1)',    icon: Target },
};

/* ═══════════════════════════════════════════════════════════════════════
   KPI CARD (inline for this page)
═══════════════════════════════════════════════════════════════════════ */

function KpiCard({ title, value, icon: Icon, iconBg, suffix, trend }: {
  title: string;
  value: number;
  icon: LucideIcon;
  iconBg: string;
  suffix?: string;
  trend?: { value: number; isPositive: boolean };
}) {
  const { colors: P } = useTheme();
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative overflow-hidden rounded-[20px] p-6"
      style={{
        background: `linear-gradient(168deg, ${P.card} 0%, ${P.bg} 100%)`,
        border: `1px solid ${P.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 40px rgba(0,0,0,0.3)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: P.textMd }}>{title}</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight" style={{ color: P.textHi }}>
              <CountUp end={value} duration={2} separator="," decimals={suffix === '%' ? 1 : 0} preserveValue />
            </span>
            {suffix && (
              <span className="text-lg font-semibold" style={{ color: P.textMd }}>{suffix}</span>
            )}
          </div>
          {trend && (
            <div className="mt-3 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" style={{ color: trend.isPositive ? '#34d399' : '#f87171' }} />
              <span
                className="text-sm font-medium"
                style={{ color: trend.isPositive ? '#34d399' : '#f87171' }}
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
              <span className="text-xs" style={{ color: P.textLo }}>vs last month</span>
            </div>
          )}
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: iconBg }}
        >
          <Icon size={20} style={{ color: '#fff' }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CUSTOM PIE LABEL
═══════════════════════════════════════════════════════════════════════ */

function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number;
  percent: number; name: string;
}) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.08) return null;
  return (
    <text x={x} y={y} fill="#A8A48A" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
      {name} ({(percent * 100).toFixed(1)}%)
    </text>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SENTIMENT GAUGE
═══════════════════════════════════════════════════════════════════════ */

function SentimentGauge({ score }: { score: number }) {
  const { colors: P } = useTheme();
  const percentage = (score / 10) * 100;
  const gaugeColor = score >= 7 ? '#34d399' : score >= 5 ? '#fbbf24' : '#f87171';
  const circumference = 2 * Math.PI * 60;
  const dashOffset = circumference - (percentage / 100) * circumference * 0.75;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="160" height="130" viewBox="0 0 160 130">
        {/* Background arc */}
        <path
          d="M 20 110 A 60 60 0 1 1 140 110"
          fill="none"
          stroke={P.border}
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 20 110 A 60 60 0 1 1 140 110"
          fill="none"
          stroke={gaugeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75}`}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
        />
        {/* Score text */}
        <text x="80" y="80" textAnchor="middle" fill={P.textHi} fontSize="28" fontWeight="bold">
          {score.toFixed(1)}
        </text>
        <text x="80" y="100" textAnchor="middle" fill={P.textLo} fontSize="11">
          out of 10
        </text>
      </svg>
      <p className="text-sm font-medium mt-1" style={{ color: gaugeColor }}>
        {score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Fair' : 'Needs Attention'}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */

export default function SocialMediaAnalytics() {
  const { colors: P } = useTheme();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  /* ─── Data Fetching ──────────────────────────────────────────────── */

  const { data: apiData, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['social-media-analytics', period],
    queryFn: () => socialMediaService.getAnalytics(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  /* ─── Resolve API data with sensible defaults ───────────────────── */

  const data: SocialMediaData = useMemo(() => {
    if (apiData?.data) return apiData.data;
    return {
      engagementMetrics: {
        totalEngagements: 0,
        activities: 0,
        reviews: 0,
        ideas: 0,
        donations: 0,
        engagementRate: 0,
        projectsEngaged: 0,
        totalProjects: 0,
      } satisfies SocialMediaEngagementMetrics,
      platformBreakdown: [],
      sentimentAnalysis: {
        positive: { count: 0, percentage: 0 },
        neutral:  { count: 0, percentage: 0 },
        negative: { count: 0, percentage: 0 },
        totalReviews: 0,
        averageRating: 0,
        overallScore: 0,
      } satisfies SocialMediaSentimentAnalysis,
      engagementTrend: [],
      topHashtags: [],
      campaignPerformance: [],
      recentActivity: [],
    };
  }, [apiData]);

  const {
    engagementMetrics,
    platformBreakdown,
    sentimentAnalysis,
    engagementTrend,
    topHashtags,
    campaignPerformance,
    recentActivity,
  } = data;

  /* ─── Derived values ─────────────────────────────────────────────── */

  const sentimentData = useMemo(() => [
    { name: 'Positive', value: sentimentAnalysis.positive.percentage, color: sentimentCfg.positive.color },
    { name: 'Neutral',  value: sentimentAnalysis.neutral.percentage,  color: sentimentCfg.neutral.color },
    { name: 'Negative', value: sentimentAnalysis.negative.percentage, color: sentimentCfg.negative.color },
  ], [sentimentAnalysis]);

  const maxHashtagCount = useMemo(() => topHashtags.length > 0 ? Math.max(...topHashtags.map(h => h.count)) : 1, [topHashtags]);

  const periodLabels: Record<string, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
  };

  /* ─── Export Handlers ───────────────────────────────────────────── */
  const exportCols: ExportColumn[] = [
    { header: 'Metric', key: 'Metric' },
    { header: 'Value', key: 'Value' },
  ];

  const handleExportExcel = useCallback(() => {
    const rows = [
      { Metric: 'Total Engagements', Value: engagementMetrics.totalEngagements ?? 0 },
      { Metric: 'Activities', Value: engagementMetrics.activities ?? 0 },
      { Metric: 'Reviews', Value: engagementMetrics.reviews ?? 0 },
      { Metric: 'Ideas', Value: engagementMetrics.ideas ?? 0 },
      { Metric: 'Donations', Value: engagementMetrics.donations ?? 0 },
      { Metric: 'Positive Sentiment', Value: `${sentimentAnalysis.positive.percentage ?? 0}%` },
      { Metric: 'Neutral Sentiment', Value: `${sentimentAnalysis.neutral.percentage ?? 0}%` },
      { Metric: 'Negative Sentiment', Value: `${sentimentAnalysis.negative.percentage ?? 0}%` },
      { Metric: 'Avg Rating', Value: sentimentAnalysis.averageRating ?? 0 },
    ];
    exportToExcel(rows, { filename: 'social_media_analytics', title: 'Social Media Analytics', columns: exportCols });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementMetrics, sentimentAnalysis]);

  const handlePrint = useCallback(() => {
    const rows = [
      { Metric: 'Total Engagements', Value: String(engagementMetrics.totalEngagements ?? 0) },
      { Metric: 'Activities', Value: String(engagementMetrics.activities ?? 0) },
      { Metric: 'Reviews', Value: String(engagementMetrics.reviews ?? 0) },
      { Metric: 'Ideas', Value: String(engagementMetrics.ideas ?? 0) },
      { Metric: 'Donations', Value: String(engagementMetrics.donations ?? 0) },
      { Metric: 'Avg Rating', Value: String(sentimentAnalysis.averageRating ?? 0) },
    ];
    printTable(rows, exportCols, 'Social Media Analytics');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementMetrics, sentimentAnalysis]);

  /* ─── Loading State ──────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: P.bg }}>
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-medium" style={{ color: P.textMd }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  /* ─── Error State ────────────────────────────────────────────────── */

  if (isError && !apiData) {
    return (
      <div className="min-h-screen p-6" style={{ background: P.bg }}>
        <EmptyState
          variant="error"
          title="Failed to load analytics"
          message="We couldn't fetch the social media data. Please check your connection and try again."
        />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */

  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="min-h-screen p-6 pb-12"
      style={{ background: P.bg }}
    >
      {/* ─── Page Header ──────────────────────────────────────────── */}
      <motion.div variants={fadeUp as any} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'rgba(201,192,54,0.1)', border: '1px solid rgba(201,192,54,0.15)' }}
            >
              <Share2 size={18} style={{ color: P.accent }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: P.textHi }}>Social Media Analytics</h1>
          </div>
          <p className="text-sm ml-[52px]" style={{ color: P.textMd }}>
            Track engagement, sentiment, and campaign performance across all CSR channels
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ActionBar
            onRefresh={refetch}
            onExcel={handleExportExcel}
            onPrint={handlePrint}
            isRefreshing={isRefetching}
          />
          {/* Period Selector */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium"
            style={{
              background: P.card,
              border: `1px solid ${P.border}`,
              color: P.textHi,
            }}
          >
            <Calendar size={14} style={{ color: P.accent }} />
            {periodLabels[period]}
            <ChevronDown size={14} style={{ color: P.textLo }} />
          </motion.button>

          <AnimatePresence>
            {showPeriodMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden min-w-[180px]"
                style={{
                  background: P.card,
                  border: `1px solid ${P.border}`,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}
              >
                {(['7d', '30d', '90d', '1y'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setShowPeriodMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color: period === p ? P.accent : P.textMd,
                      background: period === p ? 'rgba(201,192,54,0.08)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (period !== p) (e.currentTarget as HTMLButtonElement).style.background = P.hover;
                    }}
                    onMouseLeave={(e) => {
                      if (period !== p) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </motion.div>

      {/* ─── KPI Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'Total Engagement',  value: engagementMetrics.totalEngagements, icon: Activity,       iconBg: 'rgba(201,192,54,0.15)', trend: { value: 12.3, isPositive: true } },
          { title: 'Total Reviews',     value: engagementMetrics.reviews,          icon: MessageSquare,  iconBg: 'rgba(56,189,248,0.15)',  trend: { value: 8.5, isPositive: true } },
          { title: 'Ideas Submitted',   value: engagementMetrics.ideas,            icon: Lightbulb,      iconBg: 'rgba(167,139,250,0.15)', trend: { value: 15.2, isPositive: true } },
          { title: 'Engagement Rate',   value: engagementMetrics.engagementRate,   icon: Zap,            iconBg: 'rgba(52,211,153,0.15)',  trend: { value: 3.1, isPositive: true }, suffix: '%' },
        ].map((kpi, i) => (
          <motion.div key={kpi.title} variants={stagger(i * 0.08) as any}>
            <KpiCard {...kpi} />
          </motion.div>
        ))}
      </div>

      {/* ─── Row 1: Engagement Trend + Platform Breakdown ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Engagement Trend (2/3 width) */}
        <motion.div variants={stagger(0.35) as any} className="lg:col-span-2">
          <GlassCard className="p-6">
            <SectionHeading icon={BarChart3} title="Engagement Trend" sub="Monthly activity across all channels" />
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="gradActivities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9C036" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C9C036" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradIdeas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                  <XAxis dataKey="month" tick={{ fill: P.textLo, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: P.textLo, fontSize: 12 }} axisLine={false} tickLine={false}
                    tickFormatter={(val: number) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`} />
                  <RTooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#F0EFE2', fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: '#A8A48A', fontSize: 13 }}
                    formatter={(value: number, name: string) => [value.toLocaleString(), name.charAt(0).toUpperCase() + name.slice(1)]}
                  />
                  <Area type="monotone" dataKey="activities" stroke="#C9C036" strokeWidth={2.5} fill="url(#gradActivities)" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#C9C036' }} />
                  <Area type="monotone" dataKey="reviews" stroke="#38bdf8" strokeWidth={2} fill="url(#gradReviews)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#38bdf8' }} />
                  <Area type="monotone" dataKey="ideas" stroke="#a78bfa" strokeWidth={2} fill="url(#gradIdeas)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#a78bfa' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
              {[
                { label: 'Activities', color: '#C9C036' },
                { label: 'Reviews',    color: '#38bdf8' },
                { label: 'Ideas',      color: '#a78bfa' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs font-medium" style={{ color: P.textMd }}>{item.label}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Platform Breakdown (1/3 width) */}
        <motion.div variants={stagger(0.42) as any}>
          <GlassCard className="p-6 h-full flex flex-col">
            <SectionHeading icon={Eye} title="Platform Breakdown" sub="Engagement by channel" />
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="platform"
                      strokeWidth={0}
                      label={renderPieLabel}
                    >
                      {platformBreakdown.map((_entry, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: '#F0EFE2', fontWeight: 600 }}
                      formatter={(value: number) => [value.toLocaleString(), 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Platform legend list */}
              <div className="w-full mt-4 space-y-2.5">
                {platformBreakdown.map((plat, i) => (
                  <div key={plat.platform} className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                      <span className="text-sm" style={{ color: P.textMd }}>{plat.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: P.textHi }}>{plat.count.toLocaleString()}</span>
                      <span className="text-xs" style={{ color: P.textLo }}>({plat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ─── Row 2: Sentiment Analysis + Top Hashtags ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Sentiment Analysis */}
        <motion.div variants={stagger(0.5) as any}>
          <GlassCard className="p-6">
            <SectionHeading icon={Heart} title="Sentiment Analysis" sub="Community feedback sentiment distribution" />
            <div className="grid grid-cols-2 gap-6 mt-4">

              {/* Donut Chart */}
              <div className="flex flex-col items-center">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: '#F0EFE2', fontWeight: 600 }}
                        formatter={(value: number) => [`${value}%`, 'Share']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Sentiment labels */}
                <div className="flex flex-col gap-2 w-full mt-2">
                  {Object.entries(sentimentCfg).map(([key, cfg]) => {
                    const sentimentEntry = sentimentAnalysis[key as keyof typeof sentimentCfg];
                    const pct = typeof sentimentEntry === 'object' && sentimentEntry !== null
                      ? sentimentEntry.percentage
                      : 0;
                    const IconComp = cfg.icon;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-md"
                            style={{ background: cfg.bg }}
                          >
                            <IconComp size={12} style={{ color: cfg.color }} />
                          </div>
                          <span className="text-sm" style={{ color: P.textMd }}>{cfg.label}</span>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: cfg.color }}>{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gauge */}
              <div className="flex flex-col items-center justify-center">
                <p className="text-sm font-medium mb-2" style={{ color: P.textMd }}>Overall Score</p>
                <SentimentGauge score={sentimentAnalysis.overallScore / 10} />
                <div
                  className="mt-4 px-4 py-2 rounded-full text-center"
                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}
                >
                  <p className="text-xs" style={{ color: P.textLo }}>Community feedback is</p>
                  <p className="text-sm font-semibold" style={{ color: '#34d399' }}>
                    {sentimentAnalysis.overallScore >= 70 ? 'Overwhelmingly Positive' :
                     sentimentAnalysis.overallScore >= 50 ? 'Generally Positive' : 'Mixed Sentiment'}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Top Hashtags */}
        <motion.div variants={stagger(0.56) as any}>
          <GlassCard className="p-6">
            <SectionHeading icon={Hash} title="Top Hashtags" sub="Most used tags across all CSR content" />
            <div className="mt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {topHashtags.map((hashtag, i) => {
                const barWidth = (hashtag.count / maxHashtagCount) * 100;
                const color = CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <motion.div
                    key={hashtag.tag}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="group flex items-center gap-3"
                  >
                    <span className="text-xs font-mono w-5 text-right shrink-0" style={{ color: P.textLo }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate" style={{ color: P.textHi }}>
                          #{hashtag.tag}
                        </span>
                        <span className="text-xs font-semibold ml-2 shrink-0" style={{ color }}>
                          {hashtag.count.toLocaleString()}
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: P.border }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.8, delay: i * 0.04, ease: EASE }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ─── Row 3: Campaign Performance Table ────────────────────── */}
      <motion.div variants={stagger(0.62) as any} className="mb-6">
        <GlassCard className="p-6">
          <SectionHeading icon={Target} title="Campaign Performance" sub="Category-level engagement and sentiment metrics" />

          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                  {['Category', 'Projects', 'Budget (OMR)', 'Engagement', 'Sentiment', 'Performance'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3"
                      style={{ color: P.textLo }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaignPerformance.map((campaign, i) => {
                  const color = CHART_COLORS[i % CHART_COLORS.length];
                  const sentimentColor = campaign.sentiment >= 8 ? '#34d399' :
                    campaign.sentiment >= 6 ? '#fbbf24' : '#f87171';
                  const maxEngagement = Math.max(...campaignPerformance.map(c => c.engagement));
                  const performanceBar = (campaign.engagement / maxEngagement) * 100;

                  return (
                    <motion.tr
                      key={campaign.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                      className="group transition-colors"
                      style={{ borderBottom: `1px solid ${P.border}` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = P.hover; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: color, boxShadow: `0 0 8px ${color}40` }}
                          />
                          <span className="text-sm font-semibold" style={{ color: P.textHi }}>
                            {campaign.name}
                          </span>
                        </div>
                      </td>

                      {/* Projects */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium" style={{ color: P.textMd }}>
                          {campaign.projects}
                        </span>
                      </td>

                      {/* Budget */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium" style={{ color: P.textMd }}>
                          {campaign.budget.toLocaleString()}
                        </span>
                      </td>

                      {/* Engagement */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: P.textHi }}>
                            {campaign.engagement.toLocaleString()}
                          </span>
                          <ArrowUpRight size={12} style={{ color: '#34d399' }} />
                        </div>
                      </td>

                      {/* Sentiment */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{
                              background: `${sentimentColor}15`,
                              color: sentimentColor,
                              border: `1px solid ${sentimentColor}30`,
                            }}
                          >
                            {campaign.sentiment.toFixed(1)}/10
                          </div>
                        </div>
                      </td>

                      {/* Performance Bar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: P.border }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${performanceBar}%`,
                                background: `linear-gradient(90deg, ${color}, ${color}80)`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium shrink-0" style={{ color: P.textLo }}>
                            {performanceBar.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Campaign Summary Row */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-5" style={{ borderTop: `1px solid ${P.border}` }}>
            {[
              { label: 'Total Projects', value: campaignPerformance.reduce((s, c) => s + c.projects, 0), color: '#C9C036' },
              { label: 'Total Budget', value: `OMR ${(campaignPerformance.reduce((s, c) => s + c.budget, 0) / 1000).toFixed(0)}k`, color: '#38bdf8' },
              { label: 'Avg Engagement', value: campaignPerformance.length > 0 ? Math.round(campaignPerformance.reduce((s, c) => s + c.engagement, 0) / campaignPerformance.length).toLocaleString() : '0', color: '#34d399' },
              { label: 'Avg Sentiment', value: campaignPerformance.length > 0 ? (campaignPerformance.reduce((s, c) => s + c.sentiment, 0) / campaignPerformance.length).toFixed(1) : '0.0', color: '#a78bfa' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xs font-medium" style={{ color: P.textLo }}>{stat.label}</p>
                <p className="text-lg font-bold mt-1" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* ─── Row 4: Recent Activity Feed ──────────────────────────── */}
      <motion.div variants={stagger(0.68) as any}>
        <GlassCard className="p-6">
          <SectionHeading icon={Activity} title="Recent Activity" sub="Latest actions from across the CSR platform" />

          {recentActivity.length === 0 ? (
            <EmptyState
              variant="default"
              title="No recent activity"
              message="There are no recent activities to display at this time."
            />
          ) : (
            <div className="mt-4 space-y-1">
              {recentActivity.map((item, i) => {
                const typeCfg = activityTypeCfg[item.type] || activityTypeCfg.engagement;
                const TypeIcon = typeCfg.icon;

                // Derive display values from the real API shape
                const userName = item.user?.name ?? 'Unknown';
                const avatarInitials = userName
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? '')
                  .join('');
                const targetLabel = item.project?.name ?? item.entity;
                const timeLabel = new Date(item.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex items-center gap-4 px-4 py-3 rounded-full transition-colors"
                    style={{ cursor: 'default' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = P.hover; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {/* Avatar */}
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${typeCfg.color}20, ${typeCfg.color}08)`,
                        border: `1px solid ${typeCfg.color}30`,
                        color: typeCfg.color,
                      }}
                    >
                      {avatarInitials || <Users size={14} />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: P.textHi }}>
                          {userName}
                        </span>
                        <span className="text-sm" style={{ color: P.textMd }}>
                          {item.action}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-0.5 truncate" style={{ color: P.accent }}>
                        {targetLabel}
                      </p>
                    </div>

                    {/* Type Badge + Time */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background: typeCfg.bg, border: `1px solid ${typeCfg.color}20` }}
                      >
                        <TypeIcon size={12} style={{ color: typeCfg.color }} />
                        <span className="text-xs font-medium capitalize" style={{ color: typeCfg.color }}>
                          {item.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} style={{ color: P.textLo }} />
                        <span className="text-xs whitespace-nowrap" style={{ color: P.textLo }}>
                          {timeLabel}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          <div
            className="mt-4 pt-4 flex items-center justify-between"
            style={{ borderTop: `1px solid ${P.border}` }}
          >
            <p className="text-xs" style={{ color: P.textLo }}>
              Showing latest {Math.min(recentActivity.length, 10)} activities
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} />
              <span className="text-xs font-medium" style={{ color: '#34d399' }}>Live</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ─── Bottom Spacing ───────────────────────────────────────── */}
      <div className="h-8" />
    </motion.div>
  );
}
