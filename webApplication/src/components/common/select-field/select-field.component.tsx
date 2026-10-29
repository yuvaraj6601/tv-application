import React from 'react';
import './select-field.component.scss';

export interface SelectFieldOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  className?: string;
}

export const SelectField = ({ label, value, options, onChange, className = '' }: SelectFieldProps): React.JSX.Element => (
  <select
    className={`select-field ${className}`.trim()}
    aria-label={label}
    value={value}
    onChange={event => onChange(event.target.value)}
  >
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);
