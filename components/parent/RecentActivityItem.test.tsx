import React from 'react';
import { render, screen } from '@testing-library/react';
import RecentActivityItem from './RecentActivityItem';
import '@testing-library/jest-dom';

// Mock lucide-react icons because they are external components
// and we only care that they are rendered, not their internal logic.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Award: (props: any) => <svg data-testid="award-icon" {...props} />,
    DollarSign: (props: any) => <svg data-testid="dollar-sign-icon" {...props} />,
    Bell: (props: any) => <svg data-testid="bell-icon" {...props} />,
  };
});

describe('RecentActivityItem', () => {
  it('renders mark activity correctly with Award icon', () => {
    const mockActivity = {
      type: 'mark',
      message: 'John Doe received Term 1 2024 results - Aggregate: 10',
      date: '2024-03-15T10:00:00Z',
      studentId: 1,
    };
    render(<RecentActivityItem activity={mockActivity} idx={0} />);

    expect(screen.getByText('John Doe received Term 1 2024 results - Aggregate: 10')).toBeInTheDocument();
    expect(screen.getByText('3/15/2024')).toBeInTheDocument();
    expect(screen.getByTestId('award-icon')).toBeInTheDocument();
  });

  it('renders payment activity correctly with DollarSign icon', () => {
    const mockActivity = {
      type: 'payment',
      message: 'Payment of UGX 150,000 received for Jane Smith (Tuition)',
      date: '2024-03-14T11:30:00Z',
      studentId: 2,
    };
    render(<RecentActivityItem activity={mockActivity} idx={1} />);

    expect(screen.getByText('Payment of UGX 150,000 received for Jane Smith (Tuition)')).toBeInTheDocument();
    expect(screen.getByText('3/14/2024')).toBeInTheDocument();
    expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument();
  });

  it('renders generic activity correctly with Bell icon', () => {
    const mockActivity = {
      type: 'announcement',
      message: 'School will be closed next Monday',
      date: '2024-03-13T08:00:00Z',
      studentId: 0, // No specific student for general announcement
    };
    render(<RecentActivityItem activity={mockActivity} idx={2} />);

    expect(screen.getByText('School will be closed next Monday')).toBeInTheDocument();
    expect(screen.getByText('3/13/2024')).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  it('handles missing date gracefully', () => {
    const mockActivity = {
      type: 'mark',
      message: 'No date activity',
      studentId: 1,
    };
    render(<RecentActivityItem activity={mockActivity} idx={3} />);
    expect(screen.getByText('No date activity')).toBeInTheDocument();
    expect(screen.queryByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).not.toBeInTheDocument(); // Date format
  });
});
