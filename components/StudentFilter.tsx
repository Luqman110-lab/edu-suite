
import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input, Select } from './UIComponents';
import { Button } from './Button';

interface StudentFilterProps {
    onFilterChange: (filters: FilterState) => void;
    className?: string;
}

export interface FilterState {
    searchQuery: string;
    classLevel: string;
    stream: string;
    boardingStatus: string;
    sortBy?: string;
    sortOrder?: string;
}

export function StudentFilter({ onFilterChange, className = '' }: StudentFilterProps) {
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        classLevel: '',
        stream: '',
        boardingStatus: '',
        sortBy: 'name',
        sortOrder: 'asc'
    });

    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.searchQuery]);

    // Trigger parent change when filters change (using debounced search)
    useEffect(() => {
        onFilterChange({ ...filters, searchQuery: debouncedSearch });
    }, [debouncedSearch, filters.classLevel, filters.stream, filters.boardingStatus, filters.sortBy, filters.sortOrder, onFilterChange]);

    const updateFilter = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            searchQuery: '',
            classLevel: '',
            stream: '',
            boardingStatus: '',
            sortBy: 'name',
            sortOrder: 'asc'
        });
    };

    const hasActiveFilters = filters.classLevel || filters.stream || filters.boardingStatus || filters.searchQuery;

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <Input
                        placeholder="Search by name, ID..."
                        className="pl-10 w-full"
                        value={filters.searchQuery}
                        onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    />
                </div>

                {/* Filter Toggle / Clear - Mobile mostly, but useful for desktop quick clear */}
                {hasActiveFilters && (
                    <Button variant="ghost" onClick={clearFilters} className="md:hidden">
                        Clear Filters
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select
                    label=""
                    value={filters.classLevel}
                    onChange={(e) => updateFilter('classLevel', e.target.value)}
                    options={[
                        { value: '', label: 'All Classes' },
                        { value: 'P1', label: 'P1' },
                        { value: 'P2', label: 'P2' },
                        { value: 'P3', label: 'P3' },
                        { value: 'P4', label: 'P4' },
                        { value: 'P5', label: 'P5' },
                        { value: 'P6', label: 'P6' },
                        { value: 'P7', label: 'P7' },
                    ]}
                />

                <Select
                    label=""
                    value={filters.stream}
                    onChange={(e) => updateFilter('stream', e.target.value)}
                    options={[
                        { value: '', label: 'All Streams' },
                        { value: 'Red', label: 'Red' },
                        { value: 'Blue', label: 'Blue' },
                        { value: 'Green', label: 'Green' },
                        { value: 'Yellow', label: 'Yellow' } // Common streams, adjust if dynamic
                    ]}
                />

                <Select
                    label=""
                    value={filters.boardingStatus}
                    onChange={(e) => updateFilter('boardingStatus', e.target.value)}
                    options={[
                        { value: '', label: 'All Status' },
                        { value: 'Boarding', label: 'Boarding' },
                    ]}
                />

                <Select
                    label=""
                    value={filters.sortBy || 'name'}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    options={[
                        { value: 'name', label: 'Sort by Name' },
                        { value: 'classLevel', label: 'Sort by Class' },
                        { value: 'stream', label: 'Sort by Stream' },
                        { value: 'boardingStatus', label: 'Sort by Status' },
                    ]}
                />

                <Select
                    label=""
                    value={filters.sortOrder || 'asc'}
                    onChange={(e) => updateFilter('sortOrder', e.target.value)}
                    options={[
                        { value: 'asc', label: 'Ascending' },
                        { value: 'desc', label: 'Descending' },
                    ]}
                />

                {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} className="hidden md:flex items-center gap-2">
                        <X className="w-4 h-4" /> Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
