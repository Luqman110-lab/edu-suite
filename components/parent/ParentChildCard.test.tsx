import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ParentChildCard from './ParentChildCard';
import '@testing-library/jest-dom';

describe('ParentChildCard', () => {
  const mockChild = {
    id: 1,
    name: 'Test Student',
    photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // tiny red dot
    classLevel: 'P5',
    stream: 'Emerald',
    latestGrade: {
      term: 1,
      year: 2024,
      aggregate: 10,
      division: 'I',
    },
    feeBalance: 500000,
    attendanceRate: 95,
  };

  it('renders child information correctly', () => {
    render(
      <BrowserRouter>
        <ParentChildCard child={mockChild} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Student')).toBeInTheDocument();
    expect(screen.getByText('P5 Emerald')).toBeInTheDocument();
    expect(screen.getByText('Agg 10')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('UGX 500k')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/parent/student/1');
  });

  it('displays "N/A" for grade if not available', () => {
    const childWithoutGrade = { ...mockChild, latestGrade: null };
    render(
      <BrowserRouter>
        <ParentChildCard child={childWithoutGrade} />
      </BrowserRouter>
    );
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('displays "Paid" for fees if balance is 0', () => {
    const childWithClearedFees = { ...mockChild, feeBalance: 0 };
    render(
      <BrowserRouter>
        <ParentChildCard child={childWithClearedFees} />
      </BrowserRouter>
    );
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('displays generic user icon if no photo', () => {
    const childWithoutPhoto = { ...mockChild, photoBase64: undefined };
    render(
      <BrowserRouter>
        <ParentChildCard child={childWithoutPhoto} />
      </BrowserRouter>
    );
    expect(screen.getByLabelText('Users icon')).toBeInTheDocument();
  });
});
