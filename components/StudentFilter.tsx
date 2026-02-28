
import React, { useState, useEffect } from 'react';
import { Search, Filter, X, User } from 'lucide-react';
import { Input, Select } from './UIComponents';
import { Button } from './Button';
import { apiRequest } from '@/lib/queryClient';

interface StudentFilterProps {
    onFilterChange: (filters: FilterState) => void;
    className?: string;
    simpleSelect?: boolean;
    onSelect?: (student: any) => void;
}

export interface FilterState {
    searchQuery: string;
    classLevel: string;
    stream: string;
    boardingStatus: string;
    sortBy?: string;
    sortOrder?: string;
}

export function StudentFilter({ onFilterChange, className = '', simpleSelect, onSelect }: StudentFilterProps) {
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        classLevel: '',
        stream: '',
        boardingStatus: '',
        sortBy: 'name',
        sortOrder: 'asc'
    });

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [streamOptions, setStreamOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: 'All Streams' }]);

    // Fetch streams dynamically
    useEffect(() => {
        const fetchStreams = async () => {
            try {
                const res = await apiRequest('GET', '/api/streams');
                const data = await res.json();
                const opts = [{ value: '', label: 'All Streams' }];
                if (Array.isArray(data)) {
                    for (const s of data) {
                        const name = typeof s === 'string' ? s : s.name;
                        if (name) opts.push({ value: name, label: name });
                    }
                }
                if (opts.length > 1) setStreamOptions(opts);
            } catch {
                // Fallback: keep default "All Streams" only
            }
        };
        fetchStreams();
    }, []);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.searchQuery]);

    // Simplified Search for single select
    useEffect(() => {
        if (!simpleSelect || !debouncedSearch) return;

        const fetchStudents = async () => {
            try {
                const res = await apiRequest('GET', `/api/students?query=${debouncedSearch}`);
                const data = await res.json();
                setSearchResults(data);
            } catch (err) {
                console.error("Failed to search students", err);
            }
        };
        fetchStudents();
    }, [debouncedSearch, simpleSelect]);

    // Trigger parent change when filters change (using debounced search)
    useEffect(() => {
        if (!simpleSelect) {
            onFilterChange({ ...filters, searchQuery: debouncedSearch });
        }
    }, [debouncedSearch, filters.classLevel, filters.stream, filters.boardingStatus, filters.sortBy, filters.sortOrder, onFilterChange, simpleSelect]);

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
        setSearchResults([]);
    };

    const hasActiveFilters = filters.classLevel || filters.stream || filters.boardingStatus || filters.searchQuery;

    if (simpleSelect) {
        return (
            <div className={`space-y-4 ${className} relative`}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <Input
                        placeholder="Search student by name..."
                        className="pl-10 w-full"
                        value={filters.searchQuery}
                        onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    />
                    {filters.searchQuery && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                            onClick={clearFilters}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {filters.searchQuery && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                        {searchResults.map(student => (
                            <div
                                key={student.id}
                                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 border-b last:border-0"
                                onClick={() => {
                                    onSelect?.(student);
                                    clearFilters();
                                }}
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-medium">{student.name}</div>
                                    <div className="text-xs text-gray-500">{student.classLevel} {student.stream}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

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
                        { value: 'Baby', label: 'Baby Class' },
                        { value: 'N1', label: 'N1 (Nursery 1)' },
                        { value: 'N2', label: 'N2 (Nursery 2)' },
                        { value: 'N3', label: 'N3 (Nursery 3)' },
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
                    options={streamOptions}
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
