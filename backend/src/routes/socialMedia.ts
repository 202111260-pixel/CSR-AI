import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { getLastNMonths } from '../utils/dateHelpers.js';

const router = Router();
router.use(authenticate);

// --- GET / - Comprehensive social media analytics dashboard ---

router.get('/', async (_req: Request, res: Response) => {
  try {
    const months = getLastNMonths(6);
    const sixMonthsAgo = months[0].start;

    // Run all independent queries in parallel
    const [
      totalActivities,
      recentActivities,
      totalReviews,
      recentReviews,
      allReviews,
      totalIdeas,
      recentIdeas,
      totalIdeaVotes,
      recentIdeaVotes,
      totalDonations,
      recentDonations,
      totalProjects,
      projectsWithTags,
      categoriesWithProjects,
      last10Activities,
      // ESG queries
      esgProjects,
      esgBeneficiariesSum,
      esgDonationsSum,
      esgActiveEmployees,
      esgTotalEmployees,
      esgResolvedAlerts,
      esgTotalAlerts,
      esgCompletedProjects,
      esgNonArchivedProjects,
      esgProjectsWithReviews,
    ] = await Promise.all([
      // Activity log total count
      prisma.activityLog.count(),
      // Activity logs from last 6 months
      prisma.activityLog.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, projectId: true },
      }),
      // Review total count
      prisma.review.count(),
      // Reviews from last 6 months (for trend)
      prisma.review.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, rating: true },
      }),
      // All reviews for sentiment analysis (full dataset)
      prisma.review.findMany({
        select: { rating: true },
      }),
      // Idea total count
      prisma.idea.count(),
      // Ideas from last 6 months
      prisma.idea.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      // Idea vote total count
      prisma.ideaVote.count(),
      // Idea votes from last 6 months (via idea creation date)
      prisma.ideaVote.findMany({
        where: { idea: { createdAt: { gte: sixMonthsAgo } } },
        select: { id: true },
      }),
      // Donation total count
      prisma.donation.count(),
      // Donations from last 6 months
      prisma.donation.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      // Total project count for engagement rate
      prisma.project.count(),
      // All projects with tags for hashtag extraction
      prisma.project.findMany({
        where: { tags: { not: undefined } },
        select: { tags: true },
      }),
      // Categories with nested project data for campaign performance
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          projects: {
            select: {
              id: true,
              budget: true,
              activities: { select: { id: true } },
              reviews: { select: { rating: true } },
            },
          },
        },
      }),
      // Last 10 activity logs with user and project info
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      // For ESG Environmental
      prisma.project.findMany({
        where: { status: { not: 'archived' } },
        select: { id: true, budget: true, sdgGoals: true },
      }),
      // For ESG Social - beneficiaries
      prisma.beneficiary.aggregate({ _sum: { count: true } }),
      // For ESG Social - donations total
      prisma.donation.aggregate({ _sum: { amount: true } }),
      // For ESG Social - employees
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count(),
      // For ESG Governance
      prisma.alert.count({ where: { resolvedAt: { not: null } } }),
      prisma.alert.count(),
      prisma.project.count({ where: { status: 'completed' } }),
      prisma.project.count({ where: { status: { not: 'archived' } } }),
      prisma.project.count({ where: { reviews: { some: {} } } }),
    ]);
    // ---- 1. Engagement Metrics ----
    const recentActivityCount = recentActivities.length;
    const recentReviewCount = recentReviews.length;
    const recentIdeaCount = recentIdeas.length;
    const recentDonationCount = recentDonations.length;
    const totalEngagements =
      recentActivityCount + recentReviewCount + recentIdeaCount + recentDonationCount;

    // Engagement rate: unique projects with activity / total projects (last 6 months)
    const uniqueProjectsEngaged = new Set(
      recentActivities.filter((a) => a.projectId).map((a) => a.projectId)
    ).size;
    const engagementRate =
      totalProjects > 0
        ? Math.round((uniqueProjectsEngaged / totalProjects) * 10000) / 100
        : 0;

    const engagementMetrics = {
      totalEngagements,
      activities: recentActivityCount,
      reviews: recentReviewCount,
      ideas: recentIdeaCount,
      donations: recentDonationCount,
      engagementRate,
      projectsEngaged: uniqueProjectsEngaged,
      totalProjects,
    };

    // ---- 2. Platform Breakdown ----
    const platformRaw = [
      { platform: 'Internal Portal', count: totalActivities },
      { platform: 'Reviews', count: totalReviews },
      { platform: 'Ideas Hub', count: totalIdeas + totalIdeaVotes },
      { platform: 'Donations', count: totalDonations },
    ];
    const platformTotal = platformRaw.reduce((sum, p) => sum + p.count, 0);
    const platformBreakdown = platformRaw.map((p) => ({
      ...p,
      percentage:
        platformTotal > 0
          ? Math.round((p.count / platformTotal) * 10000) / 100
          : 0,
    }));

    // ---- 3. Sentiment Analysis ----
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let ratingSum = 0;

    for (const review of allReviews) {
      ratingSum += review.rating;
      if (review.rating >= 4) positiveCount++;
      else if (review.rating >= 3) neutralCount++;
      else negativeCount++;
    }

    const sentimentTotal = allReviews.length;
    const avgRating = sentimentTotal > 0 ? ratingSum / sentimentTotal : 0;
    // Scale 0-5 rating to 0-100 score
    const overallScore = Math.round(avgRating * 20 * 100) / 100;

    const sentimentAnalysis = {
      positive: {
        count: positiveCount,
        percentage:
          sentimentTotal > 0
            ? Math.round((positiveCount / sentimentTotal) * 10000) / 100
            : 0,
      },
      neutral: {
        count: neutralCount,
        percentage:
          sentimentTotal > 0
            ? Math.round((neutralCount / sentimentTotal) * 10000) / 100
            : 0,
      },
      negative: {
        count: negativeCount,
        percentage:
          sentimentTotal > 0
            ? Math.round((negativeCount / sentimentTotal) * 10000) / 100
            : 0,
      },
      totalReviews: sentimentTotal,
      averageRating: Math.round(avgRating * 100) / 100,
      overallScore,
    };

    // ---- 4. Engagement Trend (last 6 months) ----
    const engagementTrend = months.map(({ start, end, label }) => {
      const monthActivities = recentActivities.filter(
        (a) => a.createdAt >= start && a.createdAt <= end
      ).length;
      const monthReviews = recentReviews.filter(
        (r) => r.createdAt >= start && r.createdAt <= end
      ).length;
      const monthIdeas = recentIdeas.filter(
        (i) => i.createdAt >= start && i.createdAt <= end
      ).length;
      const monthDonations = recentDonations.filter(
        (d) => d.createdAt >= start && d.createdAt <= end
      ).length;

      return {
        month: label,
        activities: monthActivities,
        reviews: monthReviews,
        ideas: monthIdeas,
        donations: monthDonations,
        total: monthActivities + monthReviews + monthIdeas + monthDonations,
      };
    });
    // ---- 5. Top Hashtags (from project tags) ----
    const tagCounts: Record<string, number> = {};
    for (const project of projectsWithTags) {
      const tags = Array.isArray(project.tags) ? project.tags : [];
      for (const tag of tags) {
        const normalized = String(tag).trim().toLowerCase();
        if (normalized) {
          tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
        }
      }
    }
    const topHashtags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // ---- 6. Campaign Performance (category-based) ----
    const campaignPerformance = categoriesWithProjects
      .map((cat) => {
        const projectCount = cat.projects.length;
        const totalBudget = cat.projects.reduce((sum, p) => sum + p.budget, 0);
        const totalCampaignActivities = cat.projects.reduce(
          (sum, p) => sum + p.activities.length,
          0
        );
        const allCampaignRatings = cat.projects.flatMap((p) =>
          p.reviews.map((r) => r.rating)
        );
        const avgCampaignRating =
          allCampaignRatings.length > 0
            ? allCampaignRatings.reduce((sum, r) => sum + r, 0) /
              allCampaignRatings.length
            : 0;
        const campaignSentiment =
          Math.round(avgCampaignRating * 20 * 100) / 100;

        return {
          name: cat.name,
          categoryId: cat.id,
          projects: projectCount,
          budget: Math.round(totalBudget * 100) / 100,
          engagement: totalCampaignActivities,
          sentiment: campaignSentiment,
          reviewCount: allCampaignRatings.length,
        };
      })
      .sort((a, b) => b.engagement - a.engagement);

    // ---- 7. Recent Activity ----
    const recentActivity = last10Activities.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      details: log.details,
      type: log.type,
      createdAt: log.createdAt,
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            avatarUrl: log.user.avatarUrl,
          }
        : null,
      project: log.project
        ? { id: log.project.id, name: log.project.name }
        : null,
    }));

    // ---- 8. ESG Metrics ----

    const ENV_SDG_IDS = [6, 7, 13, 14, 15];

    const SDG_NAMES = [
      'No Poverty',
      'Zero Hunger',
      'Good Health',
      'Quality Education',
      'Gender Equality',
      'Clean Water',
      'Clean Energy',
      'Decent Work',
      'Industry & Innovation',
      'Reduced Inequalities',
      'Sustainable Cities',
      'Responsible Consumption',
      'Climate Action',
      'Life Below Water',
      'Life on Land',
      'Peace & Justice',
      'Partnerships',
    ];

    // -- Environmental Score --
    const allProjectBudget = esgProjects.reduce((sum, p) => sum + p.budget, 0);

    const envProjects = esgProjects.filter((p) => {
      const sdgs = Array.isArray(p.sdgGoals) ? (p.sdgGoals as number[]) : [];
      return sdgs.some((id) => ENV_SDG_IDS.includes(id));
    });

    const envBudget = envProjects.reduce((sum, p) => sum + p.budget, 0);
    const budgetShare = allProjectBudget > 0 ? (envBudget / allProjectBudget) * 100 : 0;

    const coveredEnvSdgs = new Set<number>();
    for (const p of esgProjects) {
      const sdgs = Array.isArray(p.sdgGoals) ? (p.sdgGoals as number[]) : [];
      for (const id of sdgs) {
        if (ENV_SDG_IDS.includes(id)) coveredEnvSdgs.add(id);
      }
    }
    const sdgsCovered = Array.from(coveredEnvSdgs);

    const eScore = Math.min(
      100,
      budgetShare * 0.4 +
        (sdgsCovered.length / 5) * 100 * 0.3 +
        (esgProjects.length > 0 ? (envProjects.length / esgProjects.length) * 100 * 0.3 : 0)
    );

    // -- Social Score --
    const totalBeneficiaries = esgBeneficiariesSum._sum.count ?? 0;
    const donationsTotal = esgDonationsSum._sum.amount ?? 0;
    const communityIdeas = totalIdeas;

    const benScore = Math.min(100, (totalBeneficiaries / 10000) * 100);
    const donScore = Math.min(100, (donationsTotal / 100000) * 100);
    const ideaScore = Math.min(100, (communityIdeas / 50) * 100);
    const sScore = Math.min(100, benScore * 0.4 + donScore * 0.3 + ideaScore * 0.3);

    // -- Governance Score --
    const alertResolutionRate =
      esgTotalAlerts > 0 ? (esgResolvedAlerts / esgTotalAlerts) * 100 : 100;
    const projectCompletionRate =
      esgNonArchivedProjects > 0
        ? (esgCompletedProjects / esgNonArchivedProjects) * 100
        : 0;
    const reviewCoverage =
      totalProjects > 0 ? (esgProjectsWithReviews / totalProjects) * 100 : 0;
    const transparencyScore = Math.min(
      100,
      totalProjects > 0 ? (totalActivities / (totalProjects * 5)) * 100 : 0
    );
    const gScore =
      alertResolutionRate * 0.25 +
      projectCompletionRate * 0.25 +
      reviewCoverage * 0.25 +
      transparencyScore * 0.25;

    // -- Overall ESG --
    const esgOverall = eScore * 0.33 + sScore * 0.33 + gScore * 0.34;

    const getGrade = (score: number): string => {
      if (score >= 85) return 'A+';
      if (score >= 75) return 'A';
      if (score >= 65) return 'B+';
      if (score >= 55) return 'B';
      if (score >= 45) return 'C+';
      if (score >= 35) return 'C';
      return 'D';
    };

    // -- SDG Coverage (all 17 SDGs) --
    const sdgCoverage = SDG_NAMES.map((name, idx) => {
      const sdgId = idx + 1;
      const matchingProjects = esgProjects.filter((p) => {
        const sdgs = Array.isArray(p.sdgGoals) ? (p.sdgGoals as number[]) : [];
        return sdgs.includes(sdgId);
      });
      return {
        id: sdgId,
        name,
        projectCount: matchingProjects.length,
        budget: matchingProjects.reduce((sum, p) => sum + p.budget, 0),
      };
    });

    // -- ESG Trend (last 6 months) --
    const esgTrend = months.map(({ start, end, label }) => {
      const monthActivityCount = recentActivities.filter(
        (a) => a.createdAt >= start && a.createdAt <= end
      ).length;
      const activityFactor = Math.min(
        1,
        monthActivityCount / Math.max(totalActivities / 6, 1)
      );
      const envMonth = Math.round(Math.max(10, eScore * (0.75 + activityFactor * 0.25)));
      const socialMonth = Math.round(Math.max(10, sScore * (0.75 + activityFactor * 0.25)));
      const govMonth = Math.round(Math.max(10, gScore * (0.75 + activityFactor * 0.25)));
      const overallMonth = Math.round((envMonth + socialMonth + govMonth) / 3);
      return {
        month: label,
        environmental: envMonth,
        social: socialMonth,
        governance: govMonth,
        overall: overallMonth,
      };
    });

    const esgData = {
      overallScore: Math.round(esgOverall * 100) / 100,
      grade: getGrade(esgOverall),
      scores: {
        environmental: Math.round(eScore * 100) / 100,
        social: Math.round(sScore * 100) / 100,
        governance: Math.round(gScore * 100) / 100,
      },
      environmental: {
        projectCount: envProjects.length,
        budgetShare: Math.round(budgetShare * 100) / 100,
        sdgsCovered,
        totalBudget: Math.round(envBudget * 100) / 100,
      },
      social: {
        totalBeneficiaries,
        donationsTotal: Math.round(donationsTotal * 100) / 100,
        communityIdeas,
        activeEmployees: esgActiveEmployees,
        totalEmployees: esgTotalEmployees,
      },
      governance: {
        alertResolutionRate: Math.round(alertResolutionRate * 100) / 100,
        projectCompletionRate: Math.round(projectCompletionRate * 100) / 100,
        reviewCoverage: Math.round(reviewCoverage * 100) / 100,
        transparencyScore: Math.round(transparencyScore * 100) / 100,
      },
      sdgCoverage,
      esgTrend,
    };

    // ---- Assemble Response ----
    res.json({
      success: true,
      data: {
        engagementMetrics,
        platformBreakdown,
        sentimentAnalysis,
        engagementTrend,
        topHashtags,
        campaignPerformance,
        recentActivity,
        esgData,
      },
    });
  } catch (error) {
    console.error('GET /social-media error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch social media analytics',
      },
    });
  }
});

export default router;
