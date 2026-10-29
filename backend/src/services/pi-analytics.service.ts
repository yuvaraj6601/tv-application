import { Prisma } from '.prisma/pi-analytics-client';
import { prisma } from '../db';
import { piAnalyticsPrisma } from '../db-pi-analytics';
import {
  PiAnalyticsAgeBucket,
  PiAnalyticsResponse,
  PiAnalyticsVisitor,
  PiAnalyticsVisitorPage,
  PiAnalyticsVisitorQuery,
  PiAnalyticsVisitorRow
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

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const SORT_COLUMNS = {
  watchTime: Prisma.raw('SUM(s.duration_seconds)'),
  visits: Prisma.raw('COUNT(s.id)'),
  firstSeen: Prisma.raw('v.first_seen_at')
} as const;

interface VisitorRawRow {
  visitorId: string;
  firstSeenAt: Date;
  gender: string | null;
  age: number | null;
  watchTimeSeconds: bigint | number;
  visitCount: bigint | number;
}

const buildAgeCondition = (ageBucket: string): Prisma.Sql => {
  if (ageBucket.endsWith('+')) {
    return Prisma.sql`v.age >= ${Number.parseInt(ageBucket, 10)}`;
  }
  const [start, end] = ageBucket.split('-').map(value => Number.parseInt(value, 10));
  return Prisma.sql`v.age BETWEEN ${start} AND ${end}`;
};

const buildVisitorConditions = (piId: string, query: PiAnalyticsVisitorQuery): Prisma.Sql[] => {
  const conditions: Prisma.Sql[] = [Prisma.sql`v.pi_id = ${piId}`];

  if (query.gender === 'unknown') {
    conditions.push(Prisma.sql`(v.gender IS NULL OR v.gender NOT IN ('male', 'female'))`);
  } else if (query.gender) {
    conditions.push(Prisma.sql`v.gender = ${query.gender}`);
  }
  if (query.ageBucket) {
    conditions.push(buildAgeCondition(query.ageBucket));
  }
  if (query.from) {
    conditions.push(Prisma.sql`v.first_seen_at >= ${query.from}`);
  }
  if (query.to) {
    conditions.push(Prisma.sql`v.first_seen_at < ${new Date(query.to.getTime() + ONE_DAY_MS)}`);
  }

  return conditions;
};

const buildVisitorQuery = (piId: string, query: PiAnalyticsVisitorQuery): Prisma.Sql => {
  const having =
    query.visits === 'returning'
      ? Prisma.sql`HAVING COUNT(s.id) > 1`
      : query.visits === 'oneTime'
        ? Prisma.sql`HAVING COUNT(s.id) = 1`
        : Prisma.empty;

  return Prisma.sql`
    SELECT v.id AS visitorId, v.first_seen_at AS firstSeenAt, v.gender AS gender, v.age AS age,
      CAST(SUM(s.duration_seconds) AS SIGNED) AS watchTimeSeconds, CAST(COUNT(s.id) AS SIGNED) AS visitCount
    FROM visitors v
    JOIN sessions s ON s.visitor_id = v.id AND s.pi_id = v.pi_id
    WHERE ${Prisma.join(buildVisitorConditions(piId, query), ' AND ')}
    GROUP BY v.id, v.first_seen_at, v.gender, v.age
    ${having}`;
};

export const piAnalyticsService = {
  getVisitors: async (deviceId: string, query: PiAnalyticsVisitorQuery): Promise<PiAnalyticsVisitorPage | null> => {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { piId: true }
    });

    if (!device?.piId) {
      return null;
    }

    const grouped = buildVisitorQuery(device.piId, query);
    const [countRow] = await piAnalyticsPrisma.$queryRaw<{ total: bigint | number }[]>`
      SELECT COUNT(*) AS total FROM (${grouped}) AS grouped_visitors`;

    const totalItems = Number(countRow?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const direction = query.order === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');

    const rows = await piAnalyticsPrisma.$queryRaw<VisitorRawRow[]>`
      ${grouped}
      ORDER BY ${SORT_COLUMNS[query.sortBy]} ${direction}, v.id ASC
      LIMIT ${query.pageSize} OFFSET ${(page - 1) * query.pageSize}`;

    const items: PiAnalyticsVisitorRow[] = rows.map(row => ({
      visitorId: row.visitorId,
      watchTimeSeconds: Number(row.watchTimeSeconds),
      visitCount: Number(row.visitCount),
      firstSeenAt: row.firstSeenAt,
      gender: row.gender,
      age: row.age
    }));

    return { items, totalItems, totalPages, page };
  },

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
