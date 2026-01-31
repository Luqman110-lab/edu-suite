import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Building2, Mail, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { School } from '../../../types';
import { Button } from '../../../components/Button';
import { StatsCard } from '../../../components/admin/StatsCard'; // reusing stats card if applicable

export const SchoolDetails: React.FC = () => {
    const { id } = useParams();
    const [school, setSchool] = useState<School | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchool = async () => {
            try {
                // Fetch specific school details - standard API usually just lists all, but checking if specific endpoint exists
                // If standard list API is all we have, we might need to filter or update API.
                // Assuming /api/schools/:id works or /api/admin/schools/:id
                // Based on AdminDashboard.tsx, it fetched ALL schools and filtered.
                // But generally there should be a detail endpoint.
                // Let's try /api/schools/:id because that's what was used for PUT in AdminDashboard.

                const res = await fetch(`/api/schools/${id}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setSchool(data);
                }
            } catch (err) {
                console.error('Failed to fetch school details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSchool();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading school details...</div>;
    if (!school) return <div className="p-8 text-center">School not found.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/app/admin/schools">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{school.name}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{school.code}</span>
                        <span>•</span>
                        <span className={school.isActive ? "text-green-600" : "text-red-500"}>
                            {school.isActive ? "Active" : "Inactive"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Info Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm md:col-span-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span>{school.email || 'No email provided'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <Phone className="w-4 h-4" />
                            <span>{school.contactPhones || 'No phone provided'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span>{school.addressBox || 'No address provided'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Meta Data</h3>
                    <p className="text-sm text-gray-500">Created: {new Date(school.createdAt || '').toLocaleDateString()}</p>
                    {/* Add more stats here later */}
                </div>
            </div>

            {/* In the future: Add Tabs for Users, Classes, etc. */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-center p-12 text-gray-500">
                    User Management for specific schools coming soon.
                </div>
            </div>
        </div>
    );
};
