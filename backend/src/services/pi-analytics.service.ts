import { prisma } from '../db';
import { piAnalyticsPrisma } from '../db-pi-analytics';
import { PiAnalyticsResponse, PiAnalyticsVisitor } from '../interfaces/pi-analytics.interface';

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

    const [uniqueVisitors, totalWatchTime, watchTimePerVisitor] = await Promise.all([
      piAnalyticsPrisma.visitor.count({ where: { piId } }),
      piAnalyticsPrisma.session.aggregate({
        where: { piId },
        _sum: { durationSeconds: true }
      }),
      piAnalyticsPrisma.session.groupBy({
        by: ['visitorId'],
        where: { piId },
        _sum: { durationSeconds: true }
      })
    ]);

    const visitorIds = watchTimePerVisitor.map(row => row.visitorId);
    const visitorDetails = await piAnalyticsPrisma.visitor.findMany({
      where: { id: { in: visitorIds } },
      select: { id: true, firstSeenAt: true }
    });
    const firstSeenAtByVisitorId = new Map(visitorDetails.map(visitor => [visitor.id, visitor.firstSeenAt]));

    return {
      piId,
      uniqueVisitors,
      totalWatchTimeSeconds: totalWatchTime._sum.durationSeconds ?? 0,
      visitors: watchTimePerVisitor
        .map(row => {
          const firstSeenAt = firstSeenAtByVisitorId.get(row.visitorId);
          if (!firstSeenAt) {
            return null;
          }

          return {
            visitorId: row.visitorId,
            watchTimeSeconds: row._sum.durationSeconds ?? 0,
            firstSeenAt
          };
        })
        .filter((visitor): visitor is PiAnalyticsVisitor => visitor !== null)
    };
  }
};
