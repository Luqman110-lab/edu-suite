import { useQuery } from "@tanstack/react-query";
import { School, Phone, Mail, MapPin, Calendar, Clock, AlertCircle } from "lucide-react";

export default function ParentSchoolInfo() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['parent-school-info'],
        queryFn: async () => {
            const res = await fetch('/api/parent/school-info', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading school information...</div>;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Failed to load school information.</p>
        </div>
    );

    const school = data?.school;
    const events = data?.events || [];

    if (!school) {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center text-gray-500">
                <School className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No school information available.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* School Header */}
            <div className="bg-gradient-to-r from-[#0052CC] to-[#1E3A5F] rounded-xl p-6 text-white">
                <div className="flex items-center gap-4">
                    {school.logoBase64 ? (
                        <img src={school.logoBase64} alt={school.name} className="w-16 h-16 rounded-lg bg-white/10 object-contain" />
                    ) : (
                        <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                            <School className="w-8 h-8" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold">{school.name}</h1>
                        {school.motto && <p className="text-blue-200 text-sm italic mt-1">"{school.motto}"</p>}
                        <p className="text-blue-200 text-xs mt-1">Code: {school.code}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Contact Information */}
                <div className="bg-white rounded-lg border shadow-sm">
                    <div className="p-4 border-b">
                        <h3 className="font-bold text-gray-900">Contact Information</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        {school.contactPhones && (
                            <div className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{school.contactPhones}</p>
                                </div>
                            </div>
                        )}
                        {school.email && (
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-sm font-medium text-gray-900">{school.email}</p>
                                </div>
                            </div>
                        )}
                        {school.addressBox && (
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Address</p>
                                    <p className="text-sm font-medium text-gray-900">{school.addressBox}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Term Information */}
                <div className="bg-white rounded-lg border shadow-sm">
                    <div className="p-4 border-b">
                        <h3 className="font-bold text-gray-900">Term Information</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                                <p className="text-xs text-gray-500">Current Term</p>
                                <p className="text-sm font-medium text-gray-900">Term {school.currentTerm}, {school.currentYear}</p>
                            </div>
                        </div>
                        {school.nextTermBeginDay && (
                            <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-green-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Next Term Begins (Day Scholars)</p>
                                    <p className="text-sm font-medium text-gray-900">{school.nextTermBeginDay}</p>
                                </div>
                            </div>
                        )}
                        {school.nextTermBeginBoarders && (
                            <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-purple-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Next Term Begins (Boarders)</p>
                                    <p className="text-sm font-medium text-gray-900">{school.nextTermBeginBoarders}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-gray-900">Upcoming Events</h3>
                </div>
                {events.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No upcoming events scheduled.</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {events.map((event: any) => (
                            <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="bg-purple-50 text-purple-700 rounded-lg p-3 text-center min-w-[60px]">
                                        <p className="text-xs font-medium">
                                            {new Date(event.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                                        </p>
                                        <p className="text-xl font-bold">
                                            {new Date(event.startDate + 'T00:00:00').getDate()}
                                        </p>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{event.name}</h4>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                                                {event.eventType?.replace(/_/g, ' ')}
                                            </span>
                                            {event.venue && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {event.venue}
                                                </span>
                                            )}
                                            {event.startTime && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}
                                                </span>
                                            )}
                                        </div>
                                        {event.description && (
                                            <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                                        )}
                                        {event.status && event.status !== 'planned' && (
                                            <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block capitalize ${event.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                    event.status === 'postponed' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-blue-100 text-blue-800'}`}>
                                                {event.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
