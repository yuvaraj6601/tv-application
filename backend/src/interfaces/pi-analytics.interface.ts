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

export type PiAnalyticsVisitorSortBy = 'watchTime' | 'visits' | 'firstSeen';
export type PiAnalyticsVisitorGender = 'male' | 'female' | 'unknown';
export type PiAnalyticsVisitorVisits = 'oneTime' | 'returning';

export interface PiAnalyticsVisitorQuery {
  sortBy: PiAnalyticsVisitorSortBy;
  order: 'asc' | 'desc';
  gender?: PiAnalyticsVisitorGender;
  visits?: PiAnalyticsVisitorVisits;
  ageBucket?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface PiAnalyticsVisitorRow {
  visitorId: string;
  watchTimeSeconds: number;
  visitCount: number;
  firstSeenAt: Date;
  gender: string | null;
  age: number | null;
}

export interface PiAnalyticsVisitorPage {
  items: PiAnalyticsVisitorRow[];
  totalItems: number;
  totalPages: number;
  page: number;
}
