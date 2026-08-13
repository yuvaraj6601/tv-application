import { prisma } from '../db';
import { piAnalyticsPrisma } from '../db-pi-analytics';
import {
  PiAnalyticsAgeBucket,
  PiAnalyticsResponse,
  PiAnalyticsVisitor
} from '../interfaces/pi-analytics.interface';

const AGE_BUCKET_SIZE = 10;
const AGE_BUCKET_MAX_LABEL_START = 70;

const ageBucketLabel = (age: number): string => {
  if (age > AGE_BUCKET_MAX_LABEL_START + AGE_BUCKET_SIZE - 1) {
    return `${AGE_BUCKET_MAX_LABEL_START + AGE_BUCKET_SIZE}+`;
  }
  const start = Math.floor(age / AGE_BUCKET_SIZE) * AGE_BUCKET_SIZE;
  return `${start}-${start + AGE_BUCKET_SIZE - 1}`;
};

const buildAgeBuckets = (ages: number[]): PiAnalyticsAgeBucket[] => {
  const counts = new Map<string, number>();
  for (const age of ages) {
    const label = ageBucketLabel(age);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      const startA = Number.parseInt(a.label, 10);
      const startB = Number.parseInt(b.label, 10);
      return startA - startB;
    });
};

export const piAnalyticsService = {
  getAnalytics: async (deviceId: string): Promise<PiAnalyticsResponse | null> => {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { piId: true }
    });

    if (!device?.piId) {
      return null;
    }

    const piId = device.piId;

    const [uniqueVisitors, totalWatchTime, watchTimePerVisitor, allVisitors] = await Promise.all([
      piAnalyticsPrisma.visitor.count({ where: { piId } }),
      piAnalyticsPrisma.session.aggregate({
        where: { piId },
        _sum: { durationSeconds: true }
      }),
      piAnalyticsPrisma.session.groupBy({
        by: ['visitorId'],
        where: { piId },
        _sum: { durationSeconds: true },
        _count: { id: true }
      }),
      piAnalyticsPrisma.visitor.findMany({
        where: { piId },
        select: { id: true, firstSeenAt: true, age: true, gender: true }
      })
    ]);

    const visitorDetailsById = new Map(allVisitors.map(visitor => [visitor.id, visitor]));

    const visitors = watchTimePerVisitor
      .map(row => {
        const details = visitorDetailsById.get(row.visitorId);
        if (!details) {
          return null;
        }

        return {
          visitorId: row.visitorId,
          watchTimeSeconds: row._sum.durationSeconds ?? 0,
          firstSeenAt: details.firstSeenAt,
          visitCount: row._count.id
        };
      })
      .filter((visitor): visitor is PiAnalyticsVisitor => visitor !== null);

    const totalWatchTimeSeconds = totalWatchTime._sum.durationSeconds ?? 0;
    const returningVisitors = visitors.filter(visitor => visitor.visitCount > 1).length;
    const oneTimeVisitors = visitors.filter(visitor => visitor.visitCount === 1).length;

    const genderBreakdown = allVisitors.reduce(
      (acc, visitor) => {
        if (visitor.gender === 'male') {
          acc.male += 1;
        } else if (visitor.gender === 'female') {
          acc.female += 1;
        } else {
          acc.unknown += 1;
        }
        return acc;
      },
      { male: 0, female: 0, unknown: 0 }
    );

    const ageBuckets = buildAgeBuckets(
      allVisitors.filter((visitor): visitor is typeof visitor & { age: number } => visitor.age !== null).map(visitor => visitor.age)
    );

    return {
      piId,
      uniqueVisitors,
      totalWatchTimeSeconds,
      averageWatchTimeSeconds: uniqueVisitors > 0 ? Math.round(totalWatchTimeSeconds / uniqueVisitors) : 0,
      returningVisitors,
      oneTimeVisitors,
      genderBreakdown,
      ageBuckets,
      visitors
    };
  }
};
