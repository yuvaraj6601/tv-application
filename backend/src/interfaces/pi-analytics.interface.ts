export interface PiAnalyticsVisitor {
  visitorId: string;
  watchTimeSeconds: number;
  firstSeenAt: Date;
}

export interface PiAnalyticsResponse {
  piId: string;
  uniqueVisitors: number;
  totalWatchTimeSeconds: number;
  visitors: PiAnalyticsVisitor[];
}
