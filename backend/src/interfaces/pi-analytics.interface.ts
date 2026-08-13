export interface PiAnalyticsVisitor {
  visitorId: string;
  watchTimeSeconds: number;
  firstSeenAt: Date;
  visitCount: number;
}

export interface PiAnalyticsAgeBucket {
  label: string;
  count: number;
}

export interface PiAnalyticsGenderBreakdown {
  male: number;
  female: number;
  unknown: number;
}

export interface PiAnalyticsResponse {
  piId: string;
  uniqueVisitors: number;
  totalWatchTimeSeconds: number;
  averageWatchTimeSeconds: number;
  returningVisitors: number;
  oneTimeVisitors: number;
  genderBreakdown: PiAnalyticsGenderBreakdown;
  ageBuckets: PiAnalyticsAgeBucket[];
  visitors: PiAnalyticsVisitor[];
}
