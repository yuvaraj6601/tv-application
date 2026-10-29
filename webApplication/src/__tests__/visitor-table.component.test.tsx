import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VisitorTable } from '../components/common/visitor-table/visitor-table.component';
import { deviceService } from '../services/device.service';
import { PiAnalyticsVisitorPageModel } from '../interfaces/pi-analytics.interface';

vi.mock('../services/device.service', () => ({
  deviceService: { getAnalyticsVisitors: vi.fn() }
}));

const getVisitors = vi.mocked(deviceService.getAnalyticsVisitors);

const page = (overrides: Partial<PiAnalyticsVisitorPageModel> = {}): PiAnalyticsVisitorPageModel => ({
  items: [
    { visitorId: 'v-1', watchTimeSeconds: 90, visitCount: 3, firstSeenAt: '2026-08-10T09:00:00Z', gender: 'female', age: 31 },
    { visitorId: 'v-2', watchTimeSeconds: 5, visitCount: 1, firstSeenAt: '2026-08-12T09:00:00Z', gender: null, age: null }
  ],
  totalItems: 2,
  totalPages: 1,
  page: 1,
  ...overrides
});

const lastQuery = () => getVisitors.mock.calls[getVisitors.mock.calls.length - 1][1];

beforeEach(() => {
  getVisitors.mockReset();
  getVisitors.mockResolvedValue(page());
});

describe('VisitorTable', () => {
  it('happy path — loads with default sort and shows gender and age', async () => {
    render(<VisitorTable deviceId="d-1" />);

    expect(await screen.findByText('v-1')).toBeInTheDocument();
    expect(lastQuery()).toMatchObject({ sortBy: 'watchTime', order: 'desc', page: 1 });
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Female')).toBeInTheDocument();
    expect(table.getByText('31')).toBeInTheDocument();
    expect(table.getByText('Unknown')).toBeInTheDocument();
  });

  it('requests the gender filter and resets to page 1', async () => {
    render(<VisitorTable deviceId="d-1" />);
    await screen.findByText('v-1');

    fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'female' } });

    await waitFor(() => expect(lastQuery()).toMatchObject({ gender: 'female', page: 1 }));
  });

  it('requests visits, age bucket and date range filters', async () => {
    render(<VisitorTable deviceId="d-1" />);
    await screen.findByText('v-1');

    fireEvent.change(screen.getByLabelText('Visits'), { target: { value: 'returning' } });
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '30-39' } });
    fireEvent.change(screen.getByLabelText('First seen from'), { target: { value: '2026-08-05' } });
    fireEvent.change(screen.getByLabelText('First seen to'), { target: { value: '2026-08-10' } });

    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ visits: 'returning', ageBucket: '30-39', from: '2026-08-05', to: '2026-08-10' })
    );
  });

  it('clicking a sort header sorts by it, and clicking again flips the order', async () => {
    render(<VisitorTable deviceId="d-1" />);
    await screen.findByText('v-1');

    fireEvent.click(screen.getByRole('button', { name: /^Visits/ }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ sortBy: 'visits', order: 'desc' }));

    fireEvent.click(screen.getByRole('button', { name: /^Visits/ }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ sortBy: 'visits', order: 'asc' }));
  });

  it('reset filters clears every filter', async () => {
    render(<VisitorTable deviceId="d-1" />);
    await screen.findByText('v-1');
    fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'male' } });

    fireEvent.click(await screen.findByRole('button', { name: 'Reset filters' }));

    await waitFor(() => expect(lastQuery().gender).toBeUndefined());
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
  });

  it('paginates with the next button', async () => {
    getVisitors.mockResolvedValue(page({ totalItems: 12, totalPages: 2 }));
    render(<VisitorTable deviceId="d-1" />);
    await screen.findByText('v-1');

    fireEvent.click(screen.getByRole('button', { name: 'Next rows' }));

    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));
  });

  it('shows an empty message when nothing matches', async () => {
    getVisitors.mockResolvedValue(page({ items: [], totalItems: 0 }));
    render(<VisitorTable deviceId="d-1" />);

    expect(await screen.findByText('No visitors match these filters.')).toBeInTheDocument();
  });

  it('shows an error message when loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getVisitors.mockRejectedValue(new Error('network'));
    render(<VisitorTable deviceId="d-1" />);

    expect(await screen.findByText('Failed to load visitors.')).toBeInTheDocument();
  });
});
