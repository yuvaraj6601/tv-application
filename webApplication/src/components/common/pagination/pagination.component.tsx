import React from 'react';
import './pagination.component.scss';

interface PaginationProps {
  start: number;
  end: number;
  total: number;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export const Pagination = ({ start, end, total, canPrevious, canNext, onPrevious, onNext }: PaginationProps): React.JSX.Element => (
  <div className="pagination">
    <span className="pagination__range">
      {start}&ndash;{end} of {total}
    </span>
    <button type="button" className="pagination__button" aria-label="Previous rows" disabled={!canPrevious} onClick={onPrevious}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    <button type="button" className="pagination__button" aria-label="Next rows" disabled={!canNext} onClick={onNext}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  </div>
);
