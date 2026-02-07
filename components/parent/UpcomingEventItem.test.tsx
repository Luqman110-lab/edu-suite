import React from 'react';
import { render, screen } from '@testing-library/react';
import UpcomingEventItem from './UpcomingEventItem';
import '@testing-library/jest-dom';

describe('UpcomingEventItem', () => {
  it('renders event information correctly with month and day', () => {
    const mockEvent = {
      id: 1,
      name: 'School Gala',
      startDate: '2024-04-20',
      eventType: 'social_event',
      venue: 'School Hall',
    };
    render(<UpcomingEventItem event={mockEvent} />);

    expect(screen.getByText('School Gala')).toBeInTheDocument();
    expect(screen.getByText('Apr')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('social event - School Hall')).toBeInTheDocument();
  });

  it('renders event without venue correctly', () => {
    const mockEvent = {
      id: 2,
      name: 'Parent-Teacher Conference',
      startDate: '2024-05-10',
      eventType: 'meeting',
    };
    render(<UpcomingEventItem event={mockEvent} />);

    expect(screen.getByText('Parent-Teacher Conference')).toBeInTheDocument();
    expect(screen.getByText('May')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('meeting')).toBeInTheDocument(); // No venue displayed
    expect(screen.queryByText(' - ')).not.toBeInTheDocument();
  });

  it('handles eventType with underscores correctly', () => {
    const mockEvent = {
      id: 3,
      name: 'Field Trip',
      startDate: '2024-06-05',
      eventType: 'field_trip',
    };
    render(<UpcomingEventItem event={mockEvent} />);
    expect(screen.getByText('field trip')).toBeInTheDocument();
  });
});
