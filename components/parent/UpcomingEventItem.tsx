interface UpcomingEventItemProps {
    event: {
        id: number;
        name: string;
        startDate: string;
        eventType?: string;
        venue?: string;
    };
}

export default function UpcomingEventItem({ event }: UpcomingEventItemProps) {
    return (
        <div className="p-4">
            <div className="flex items-start gap-3">
                <div className="bg-purple-50 text-purple-700 rounded-lg p-2 text-center min-w-[50px]">
                    <p className="text-xs font-medium">
                        {new Date(event.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                    <p className="text-lg font-bold">
                        {new Date(event.startDate + 'T00:00:00').getDate()}
                    </p>
                </div>
                <div>
                    <p className="font-medium text-gray-900">{event.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {event.eventType?.replace(/_/g, ' ')}
                        {event.venue ? ` - ${event.venue}` : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}
