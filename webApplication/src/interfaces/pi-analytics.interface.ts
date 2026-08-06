export interface PiAnalyticsVisitorModel {
  visitorId: string;
  watchTimeSeconds: number;
  firstSeenAt: string;
}

export interface DeviceAnalyticsModel {
  piId: string;
  uniqueVisitors: number;
  totalWatchTimeSeconds: number;
  visitors: PiAnalyticsVisitorModel[];
}
