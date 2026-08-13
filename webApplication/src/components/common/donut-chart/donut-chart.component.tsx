import React from 'react';
import './donut-chart.component.scss';

export interface DonutChartSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutChartSegment[];
  centerLabel?: string;
  centerValue?: string;
}

export const DonutChart = ({ segments, centerLabel, centerValue }: DonutChartProps): React.JSX.Element => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  let cumulativePercent = 0;
  const gradientStops = segments
    .map(segment => {
      const percent = total > 0 ? (segment.value / total) * 100 : 0;
      const start = cumulativePercent;
      const end = cumulativePercent + percent;
      cumulativePercent = end;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="donut-chart">
      <div
        className="donut-chart__ring"
        style={{ background: total > 0 ? `conic-gradient(${gradientStops})` : undefined }}
      >
        <div className="donut-chart__center">
          {centerValue ? <strong>{centerValue}</strong> : null}
          {centerLabel ? <span>{centerLabel}</span> : null}
        </div>
      </div>
      <ul className="donut-chart__legend">
        {segments.map(segment => (
          <li key={segment.label}>
            <span className="donut-chart__swatch" style={{ background: segment.color }} />
            <span className="donut-chart__legend-label">{segment.label}</span>
            <span className="donut-chart__legend-value">
              {total > 0 ? `${Math.round((segment.value / total) * 100)}%` : '0%'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
