import React, { useEffect, useState } from 'react';
import { deviceService } from '../../../services/device.service';
import {
  PiAnalyticsVisitorPageModel,
  VisitorGenderFilter,
  VisitorSortBy,
  VisitorSortOrder,
  VisitorTableQuery,
  VisitorVisitsFilter
} from '../../../interfaces/pi-analytics.interface';
import { STRINGS, VISITOR_AGE_BUCKETS } from '../../../constants/strings.constant';
import { formatWatchTime, getNextVisitorSort } from '../../../utils/functions.utils';
import { Pagination } from '../pagination/pagination.component';
import { SelectField } from '../select-field/select-field.component';
import './visitor-table.component.scss';

const PAGE_SIZE = 10;
const COPY = STRINGS.devices.detail;

interface VisitorTableProps {
  deviceId: string;
}

interface Filters {
  gender: string;
  visits: string;
  ageBucket: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = { gender: '', visits: '', ageBucket: '', from: '', to: '' };

const GENDER_OPTIONS = [
  { value: '', label: COPY.analyticsFilterAllGenders },
  { value: 'male', label: COPY.analyticsMale },
  { value: 'female', label: COPY.analyticsFemale },
  { value: 'unknown', label: COPY.analyticsUnknown }
];

const VISITS_OPTIONS = [
  { value: '', label: COPY.analyticsFilterAllVisits },
  { value: 'oneTime', label: COPY.analyticsFilterOneTime },
  { value: 'returning', label: COPY.analyticsFilterReturning }
];

const AGE_OPTIONS = [
  { value: '', label: COPY.analyticsFilterAllAges },
  ...VISITOR_AGE_BUCKETS.map(bucket => ({ value: bucket, label: bucket }))
];

const buildQuery = (
  filters: Filters,
  sort: { sortBy: VisitorSortBy; order: VisitorSortOrder },
  page: number
): VisitorTableQuery => ({
  sortBy: sort.sortBy,
  order: sort.order,
  gender: (filters.gender || undefined) as VisitorGenderFilter | undefined,
  visits: (filters.visits || undefined) as VisitorVisitsFilter | undefined,
  ageBucket: filters.ageBucket || undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
  page,
  pageSize: PAGE_SIZE
});

const formatGender = (gender: string | null): string => {
  if (gender === 'male') {
    return COPY.analyticsMale;
  }
  if (gender === 'female') {
    return COPY.analyticsFemale;
  }
  return COPY.analyticsUnknown;
};

export const VisitorTable = ({ deviceId }: VisitorTableProps): React.JSX.Element => {
  const [state, setState] = useState<{
    filters: Filters;
    sort: { sortBy: VisitorSortBy; order: VisitorSortOrder };
    page: number;
    data: PiAnalyticsVisitorPageModel | null;
    isLoading: boolean;
    error: string;
  }>({
    filters: EMPTY_FILTERS,
    sort: { sortBy: 'watchTime', order: 'desc' },
    page: 1,
    data: null,
    isLoading: true,
    error: ''
  });

  useEffect(() => {
    let isCancelled = false;

    const loadVisitors = async (): Promise<void> => {
      setState(prev => ({ ...prev, isLoading: true, error: '' }));
      try {
        const data = await deviceService.getAnalyticsVisitors(deviceId, buildQuery(state.filters, state.sort, state.page));
        if (!isCancelled) {
          setState(prev => ({ ...prev, data, isLoading: false }));
        }
      } catch (error: unknown) {
        console.error('Failed to load visitors', error);
        if (!isCancelled) {
          setState(prev => ({ ...prev, isLoading: false, error: COPY.analyticsVisitorsErrorLoad }));
        }
      }
    };

    void loadVisitors();

    return () => {
      isCancelled = true;
    };
  }, [deviceId, state.filters, state.sort, state.page]);

  const handleFilterChange = (field: keyof Filters, value: string): void => {
    setState(prev => ({ ...prev, filters: { ...prev.filters, [field]: value }, page: 1 }));
  };

  const handleSort = (column: VisitorSortBy): void => {
    setState(prev => ({ ...prev, sort: getNextVisitorSort(prev.sort, column), page: 1 }));
  };

  const handleReset = (): void => {
    setState(prev => ({ ...prev, filters: EMPTY_FILTERS, page: 1 }));
  };

  const renderSortHeader = (column: VisitorSortBy, label: string): React.JSX.Element => {
    const isActive = state.sort.sortBy === column;
    const ariaSort = isActive ? (state.sort.order === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <th aria-sort={ariaSort}>
        <button type="button" className="visitor-table__sort" onClick={() => handleSort(column)}>
          {label}
          <span aria-hidden="true">{isActive ? (state.sort.order === 'asc' ? ' ▲' : ' ▼') : ''}</span>
        </button>
      </th>
    );
  };

  const hasFilters = Object.values(state.filters).some(value => value !== '');
  const page = state.data?.page ?? 1;
  const totalItems = state.data?.totalItems ?? 0;
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="visitor-table">
      <div className="visitor-table__toolbar">
        <SelectField
          label={COPY.analyticsGenderColumn}
          value={state.filters.gender}
          options={GENDER_OPTIONS}
          onChange={value => handleFilterChange('gender', value)}
        />
        <SelectField
          label={COPY.analyticsVisitsColumn}
          value={state.filters.visits}
          options={VISITS_OPTIONS}
          onChange={value => handleFilterChange('visits', value)}
        />
        <SelectField
          label={COPY.analyticsAgeColumn}
          value={state.filters.ageBucket}
          options={AGE_OPTIONS}
          onChange={value => handleFilterChange('ageBucket', value)}
        />
        <input
          type="date"
          className="visitor-table__date"
          aria-label={COPY.analyticsFilterFrom}
          value={state.filters.from}
          max={state.filters.to || undefined}
          onChange={event => handleFilterChange('from', event.target.value)}
        />
        <input
          type="date"
          className="visitor-table__date"
          aria-label={COPY.analyticsFilterTo}
          value={state.filters.to}
          min={state.filters.from || undefined}
          onChange={event => handleFilterChange('to', event.target.value)}
        />
        {hasFilters ? (
          <button type="button" className="visitor-table__reset" onClick={handleReset}>
            {COPY.analyticsFilterReset}
          </button>
        ) : null}
      </div>

      {state.error ? <p className="analytics-panel__error">{state.error}</p> : null}
      {state.isLoading && !state.data ? <p className="analytics-panel__loading">{COPY.analyticsVisitorsLoading}</p> : null}

      {state.data && state.data.items.length === 0 && !state.isLoading ? (
        <p className="analytics-panel__empty">{COPY.analyticsVisitorsEmpty}</p>
      ) : null}

      {state.data && state.data.items.length > 0 ? (
        <div className="analytics-table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>{COPY.analyticsVisitorIdColumn}</th>
                {renderSortHeader('watchTime', COPY.analyticsWatchTimeColumn)}
                {renderSortHeader('visits', COPY.analyticsVisitsColumn)}
                <th>{COPY.analyticsGenderColumn}</th>
                <th>{COPY.analyticsAgeColumn}</th>
                {renderSortHeader('firstSeen', COPY.analyticsFirstSeenColumn)}
              </tr>
            </thead>
            <tbody>
              {state.data.items.map(visitor => (
                <tr key={visitor.visitorId}>
                  <td>{visitor.visitorId}</td>
                  <td>{formatWatchTime(visitor.watchTimeSeconds)}</td>
                  <td>
                    <span className={`analytics-badge${visitor.visitCount > 1 ? ' analytics-badge--returning' : ''}`}>
                      {visitor.visitCount}x
                    </span>
                  </td>
                  <td>{formatGender(visitor.gender)}</td>
                  <td>{visitor.age ?? '-'}</td>
                  <td>{new Date(visitor.firstSeenAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {state.data && state.data.totalPages > 1 ? (
        <Pagination
          start={rangeStart}
          end={rangeEnd}
          total={totalItems}
          canPrevious={page > 1}
          canNext={page < state.data.totalPages}
          onPrevious={() => setState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
          onNext={() => setState(prev => ({ ...prev, page: prev.page + 1 }))}
        />
      ) : null}
    </div>
  );
};
