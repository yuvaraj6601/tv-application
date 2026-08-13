export interface PiAnalyticsVisitorModel {
  visitorId: string;
  watchTimeSeconds: number;
  firstSeenAt: string;
  visitCount: number;
}

export interface PiAnalyticsAgeBucketModel {
  label: string;
  count: number;
}

export interface PiAnalyticsGenderBreakdownModel {
  male: number;
  female: number;
  unknown: number;
}

export interface DeviceAnalyticsModel {
  piId: string;
  uniqueVisitors: number;
  totalWatchTimeSeconds: number;
  averageWatchTimeSeconds: number;
  returningVisitors: number;
  oneTimeVisitors: number;
  genderBreakdown: PiAnalyticsGenderBreakdownModel;
  ageBuckets: PiAnalyticsAgeBucketModel[];
  visitors: PiAnalyticsVisitorModel[];
}
