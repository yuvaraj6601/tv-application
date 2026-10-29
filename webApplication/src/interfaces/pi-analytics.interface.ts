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

export type VisitorSortBy = 'watchTime' | 'visits' | 'firstSeen';
export type VisitorSortOrder = 'asc' | 'desc';
export type VisitorGenderFilter = 'male' | 'female' | 'unknown';
export type VisitorVisitsFilter = 'oneTime' | 'returning';

export interface VisitorTableQuery {
  sortBy: VisitorSortBy;
  order: VisitorSortOrder;
  gender?: VisitorGenderFilter;
  visits?: VisitorVisitsFilter;
  ageBucket?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface PiAnalyticsVisitorRowModel {
  visitorId: string;
  watchTimeSeconds: number;
  visitCount: number;
  firstSeenAt: string;
  gender: string | null;
  age: number | null;
}

export interface PiAnalyticsVisitorPageModel {
  items: PiAnalyticsVisitorRowModel[];
  totalItems: number;
  totalPages: number;
  page: number;
}
