import React from 'react';
import './bar-chart.component.scss';

export interface BarChartItem {
  label: string;
  value: number;
}

interface BarChartProps {
  items: BarChartItem[];
  color?: string;
}

export const BarChart = ({ items, color = '#0f766e' }: BarChartProps): React.JSX.Element => {
  const maxValue = Math.max(...items.map(item => item.value), 1);

  return (
    <div className="bar-chart">
      {items.map(item => (
        <div key={item.label} className="bar-chart__row">
          <span className="bar-chart__label">{item.label}</span>
          <div className="bar-chart__track">
            <div
              className="bar-chart__fill"
              style={{ width: `${(item.value / maxValue) * 100}%`, background: color }}
            />
          </div>
          <span className="bar-chart__value">{item.value}</span>
        </div>
      ))}
    </div>
  );
};
