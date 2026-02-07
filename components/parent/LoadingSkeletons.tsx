import { Users, DollarSign, Calendar, Book, MessageSquare } from "lucide-react";

// =====================================
// CHILD CARD SKELETON
// =====================================

export function ChildCardSkeleton() {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="w-5 h-5 bg-gray-200 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-100 rounded-lg p-2 text-center">
                        <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// =====================================
// DASHBOARD SKELETON
// =====================================

export function DashboardSkeleton() {
    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
            {/* Banner Skeleton */}
            <div className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-xl p-6 h-24" />

            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                        <div className="h-6 bg-gray-200 rounded w-1/3" />
                    </div>
                ))}
            </div>

            {/* Children Section */}
            <div>
                <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
                <div className="grid gap-4 md:grid-cols-2">
                    <ChildCardSkeleton />
                    <ChildCardSkeleton />
                </div>
            </div>

            {/* Activity & Events */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white rounded-lg border shadow-sm">
                    <div className="p-4 border-b">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="p-4 space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-lg border shadow-sm">
                    <div className="p-4 border-b">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="p-4 space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                                    <div className="h-2 bg-gray-100 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// =====================================
// TABLE SKELETON
// =====================================

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden animate-pulse">
            {/* Header */}
            <div className="bg-gray-50 p-4 flex gap-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="flex-1 h-4 bg-gray-200 rounded" />
                ))}
            </div>
            {/* Rows */}
            <div className="divide-y">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="p-4 flex gap-4">
                        {Array.from({ length: cols }).map((_, colIndex) => (
                            <div
                                key={colIndex}
                                className="flex-1 h-4 bg-gray-100 rounded"
                                style={{ width: `${60 + Math.random() * 40}%` }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// =====================================
// PROFILE SKELETON
// =====================================

export function ProfileSkeleton() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-48" />
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-6 border-b flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-40" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                    </div>
                    <div className="h-9 w-24 bg-gray-200 rounded-lg" />
                </div>
                <div className="p-6 grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                            <div className="space-y-1">
                                <div className="h-2 bg-gray-200 rounded w-12" />
                                <div className="h-4 bg-gray-200 rounded w-32" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Children Section */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
                <div className="divide-y">
                    {[1, 2].map((i) => (
                        <div key={i} className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full" />
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-32" />
                                <div className="h-3 bg-gray-100 rounded w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// =====================================
// MESSAGES SKELETON
// =====================================

export function MessagesSkeleton() {
    return (
        <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-7 bg-gray-200 rounded w-32" />
                    <div className="h-4 bg-gray-100 rounded w-48" />
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-lg" />
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden" style={{ minHeight: '500px' }}>
                <div className="flex h-[600px]">
                    {/* Conversation List */}
                    <div className="w-1/3 border-r">
                        <div className="p-3 border-b">
                            <div className="h-3 bg-gray-200 rounded w-24" />
                        </div>
                        <div className="divide-y">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-4 flex gap-3">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                                        <div className="h-2 bg-gray-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Message Area */}
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto" />
                            <div className="h-3 bg-gray-200 rounded w-48 mx-auto" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =====================================
// ATTENDANCE SKELETON
// =====================================

export function AttendanceSkeleton() {
    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-64" />
            </div>

            {/* Month Navigator */}
            <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center justify-between">
                <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                <div className="h-6 bg-gray-200 rounded w-32" />
                <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white rounded-lg border p-4 text-center">
                        <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2" />
                        <div className="h-3 bg-gray-100 rounded w-16 mx-auto" />
                    </div>
                ))}
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
                <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
}

// =====================================
// FEES SKELETON
// =====================================

export function FeesSkeleton() {
    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-40" />
                <div className="h-4 bg-gray-100 rounded w-64" />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg border p-5 shadow-sm text-center">
                        <div className="h-3 bg-gray-200 rounded w-16 mx-auto mb-3" />
                        <div className="h-7 bg-gray-200 rounded w-24 mx-auto" />
                    </div>
                ))}
            </div>

            {/* Table */}
            <TableSkeleton rows={4} cols={6} />
        </div>
    );
}
