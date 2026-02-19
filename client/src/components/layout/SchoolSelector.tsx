
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, ChevronDown, Check, X, Search, Settings } from 'lucide-react';
import { useAuth, UserSchool } from '../../../../hooks/use-auth';

const FAVORITES_KEY = 'edusuite_favorite_schools';
const RECENTS_KEY = 'edusuite_recent_schools';
const MAX_RECENTS = 5;

export const SchoolSelector: React.FC = () => {
    const { user, activeSchool, switchSchoolMutation, isSuperAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState<number[]>([]);
    const [recents, setRecents] = useState<number[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const savedFavorites = localStorage.getItem(FAVORITES_KEY);
        const savedRecents = localStorage.getItem(RECENTS_KEY);
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
        if (savedRecents) setRecents(JSON.parse(savedRecents));
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const schools = user?.schools || [];
    const hasMultipleSchools = schools.length > 1 || isSuperAdmin;

    const filteredSchools = useMemo(() => {
        if (!searchQuery.trim()) return schools;
        const query = searchQuery.toLowerCase();
        return schools.filter(s =>
            s.name.toLowerCase().includes(query) ||
            (s.code && s.code.toLowerCase().includes(query))
        );
    }, [schools, searchQuery]);

    const favoriteSchools = useMemo(() =>
        schools.filter(s => favorites.includes(s.id)),
        [schools, favorites]
    );

    const recentSchools = useMemo(() =>
        recents
            .map(id => schools.find(s => s.id === id))
            .filter((s): s is UserSchool => s !== undefined && !favorites.includes(s.id) && s.id !== activeSchool?.id)
            .slice(0, 3),
        [schools, recents, favorites, activeSchool]
    );

    if (!activeSchool && schools.length === 0) {
        return null;
    }

    const toggleFavorite = (schoolId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newFavorites = favorites.includes(schoolId)
            ? favorites.filter(id => id !== schoolId)
            : [...favorites, schoolId];
        setFavorites(newFavorites);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    };

    const addToRecents = (schoolId: number) => {
        const newRecents = [schoolId, ...recents.filter(id => id !== schoolId)].slice(0, MAX_RECENTS);
        setRecents(newRecents);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(newRecents));
    };

    const handleSwitch = async (school: UserSchool) => {
        if (school.id === activeSchool?.id) {
            setIsOpen(false);
            setSearchQuery('');
            return;
        }
        try {
            await switchSchoolMutation.mutateAsync(school.id);
            addToRecents(school.id);
            setIsOpen(false);
            setSearchQuery('');
        } catch (error) {
            console.error('Failed to switch school:', error);
        }
    };

    const renderSchoolItem = (school: UserSchool, showFavorite = true) => (
        <button
            key={school.id}
            onClick={() => handleSwitch(school)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group ${school.id === activeSchool?.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${school.id === activeSchool?.id
                ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                <School className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{school.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{school.role}</p>
            </div>
            <div className="flex items-center gap-1">
                {showFavorite && (
                    <button
                        onClick={(e) => toggleFavorite(school.id, e)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={favorites.includes(school.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <svg className={`w-4 h-4 ${favorites.includes(school.id) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </button>
                )}
                {school.id === activeSchool?.id && (
                    <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                )}
            </div>
        </button>
    );

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => hasMultipleSchools && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${hasMultipleSchools
                    ? 'border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 cursor-pointer'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-default'
                    }`}
                disabled={!hasMultipleSchools}
            >
                <School className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[150px] truncate">
                    {activeSchool?.name || 'Select School'}
                </span>
                {hasMultipleSchools && (
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {isOpen && hasMultipleSchools && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Search schools..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white placeholder-gray-400"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {searchQuery ? (
                            <div className="py-1">
                                {filteredSchools.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No schools found matching "{searchQuery}"
                                    </p>
                                ) : (
                                    filteredSchools.map(school => renderSchoolItem(school))
                                )}
                            </div>
                        ) : (
                            <>
                                {favoriteSchools.length > 0 && (
                                    <div className="py-1">
                                        <div className="px-3 py-2 flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                            </svg>
                                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Favorites</p>
                                        </div>
                                        {favoriteSchools.map(school => renderSchoolItem(school, false))}
                                    </div>
                                )}

                                {recentSchools.length > 0 && (
                                    <div className="py-1 border-t border-gray-100 dark:border-gray-700">
                                        <div className="px-3 py-2 flex items-center gap-2">
                                            <div className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                            </div>
                                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent</p>
                                        </div>
                                        {recentSchools.map(school => renderSchoolItem(school))}
                                    </div>
                                )}

                                <div className={`py-1 ${(favoriteSchools.length > 0 || recentSchools.length > 0) ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                                    <div className="px-3 py-2">
                                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">All Schools</p>
                                    </div>
                                    {schools.map(school => renderSchoolItem(school))}
                                </div>
                            </>
                        )}
                    </div>

                    {isSuperAdmin && (
                        <div className="border-t border-gray-100 dark:border-gray-700 p-2">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setSearchQuery('');
                                    navigate('/app/settings?tab=schools');
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                <span>Manage Schools</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
