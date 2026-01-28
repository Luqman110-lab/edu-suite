import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { Calendar, Clock, CalendarCheck, BookOpen, Plus, Edit2, Trash2, Users, CheckSquare, Target, ChevronDown, ChevronRight, ListTodo, Settings, RefreshCw, Download } from 'lucide-react';

type Tab = 'term-plans' | 'events' | 'timetables' | 'routines';

interface Teacher {
  id: number;
  name: string;
  assignedClass?: string;
  subjects?: string[];
}

interface User {
  id: number;
  name: string;
  role: string;
}

interface TermPlan {
  id: number;
  name: string;
  term: number;
  year: number;
  startDate: string;
  endDate: string;
  theme?: string;
  objectives: string[];
  keyActivities: { week: number; activity: string; responsible?: string }[];
  status: string;
}

interface SchoolEvent {
  id: number;
  termPlanId?: number;
  name: string;
  eventType: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  targetAudience?: string;
  targetClasses?: string[];
  budget?: number;
  status: string;
  notes?: string;
  coordinatorId?: number;
  committees?: EventCommittee[];
  tasks?: EventTask[];
}

interface EventCommittee {
  id: number;
  eventId: number;
  userId: number;
  role: string;
  responsibilities?: string;
}

interface EventTask {
  id: number;
  eventId: number;
  title: string;
  description?: string;
  assignedToId?: number;
  dueDate?: string;
  priority: string;
  status: string;
}

interface TimetablePeriod {
  id: number;
  name: string;
  periodType: string;
  startTime: string;
  endTime: string;
  duration?: number;
  sortOrder: number;
  isActive: boolean;
}

interface ClassTimetable {
  id: number;
  periodId: number;
  classLevel: string;
  stream?: string;
  dayOfWeek: string;
  subject?: string;
  teacherId?: number;
  room?: string;
}

interface SchoolRoutine {
  id: number;
  name: string;
  description?: string;
  appliesTo: string;
  dayOfWeek: string[];
  isDefault: boolean;
  isActive: boolean;
  slots?: RoutineSlot[];
}

interface RoutineSlot {
  id?: number;
  activity: string;
  customActivity?: string;
  startTime: string;
  endTime: string;
  description?: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const CLASS_LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const SUBJECTS = ['English', 'Mathematics', 'Science', 'Social Studies', 'Religious Education', 'Literacy', 'P.E.', 'Art', 'Music', 'Local Language'];

const EVENT_TYPES = [
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'religious', label: 'Religious' },
  { value: 'parents', label: 'Parents Meeting' },
  { value: 'examination', label: 'Examination' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'other', label: 'Other' },
];

const ROUTINE_ACTIVITIES = [
  { value: 'wake_up', label: 'Wake Up' },
  { value: 'prayer', label: 'Prayer/Devotion' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'lessons', label: 'Lessons' },
  { value: 'break', label: 'Break' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'games', label: 'Games/Sports' },
  { value: 'clubs', label: 'Clubs/Activities' },
  { value: 'prep', label: 'Prep/Study' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'lights_out', label: 'Lights Out' },
  { value: 'custom', label: 'Custom Activity' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  planned: { bg: 'bg-blue-100', text: 'text-blue-700' },
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  pending: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

export function Planning() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('term-plans');
  const [showTermPlanModal, setShowTermPlanModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [editingTermPlan, setEditingTermPlan] = useState<TermPlan | null>(null);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
  const [editingPeriod, setEditingPeriod] = useState<TimetablePeriod | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<SchoolRoutine | null>(null);
  const [selectedClass, setSelectedClass] = useState('P1');
  const [selectedStream, setSelectedStream] = useState('');

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: termPlans = [] } = useQuery<TermPlan[]>({
    queryKey: ['/api/term-plans'],
  });

  const { data: events = [] } = useQuery<SchoolEvent[]>({
    queryKey: ['/api/school-events'],
  });

  const { data: periods = [] } = useQuery<TimetablePeriod[]>({
    queryKey: ['/api/timetable-periods'],
  });

  const { data: timetableEntries = [] } = useQuery<ClassTimetable[]>({
    queryKey: ['/api/class-timetables', selectedClass, selectedStream],
  });

  const { data: routines = [] } = useQuery<SchoolRoutine[]>({
    queryKey: ['/api/school-routines'],
  });

  const createTermPlanMutation = useMutation({
    mutationFn: async (data: Partial<TermPlan>) => {
      const res = await fetch('/api/term-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create term plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/term-plans'] });
      setShowTermPlanModal(false);
      setEditingTermPlan(null);
    },
  });

  const updateTermPlanMutation = useMutation({
    mutationFn: async (data: Partial<TermPlan>) => {
      const res = await fetch(`/api/term-plans/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update term plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/term-plans'] });
      setShowTermPlanModal(false);
      setEditingTermPlan(null);
    },
  });

  const deleteTermPlanMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/term-plans/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete term plan');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/term-plans'] }),
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: Partial<SchoolEvent>) => {
      const res = await fetch('/api/school-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school-events'] });
      setShowEventModal(false);
      setEditingEvent(null);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: Partial<SchoolEvent>) => {
      const res = await fetch(`/api/school-events/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school-events'] });
      setShowEventModal(false);
      setEditingEvent(null);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/school-events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete event');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/school-events'] }),
  });

  const seedPeriodsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/timetable-periods/seed-defaults', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to seed periods');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/timetable-periods'] }),
  });

  const createPeriodMutation = useMutation({
    mutationFn: async (data: Partial<TimetablePeriod>) => {
      const res = await fetch('/api/timetable-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create period');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timetable-periods'] });
      setShowPeriodModal(false);
      setEditingPeriod(null);
    },
  });

  const updatePeriodMutation = useMutation({
    mutationFn: async (data: Partial<TimetablePeriod>) => {
      const res = await fetch(`/api/timetable-periods/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update period');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timetable-periods'] });
      setShowPeriodModal(false);
      setEditingPeriod(null);
    },
  });

  const deletePeriodMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/timetable-periods/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete period');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/timetable-periods'] }),
  });

  const saveTimetableMutation = useMutation({
    mutationFn: async (data: { entries: Partial<ClassTimetable>[]; classLevel: string; stream?: string }) => {
      const res = await fetch('/api/class-timetables/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save timetable');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/class-timetables'] });
    },
  });

  const createRoutineMutation = useMutation({
    mutationFn: async (data: Partial<SchoolRoutine>) => {
      const res = await fetch('/api/school-routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create routine');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school-routines'] });
      setShowRoutineModal(false);
      setEditingRoutine(null);
    },
  });

  const updateRoutineMutation = useMutation({
    mutationFn: async (data: Partial<SchoolRoutine>) => {
      const res = await fetch(`/api/school-routines/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update routine');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school-routines'] });
      setShowRoutineModal(false);
      setEditingRoutine(null);
    },
  });

  const deleteRoutineMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/school-routines/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete routine');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/school-routines'] }),
  });

  const tabs: { id: Tab; label: string; icon: typeof Calendar }[] = [
    { id: 'term-plans', label: 'Term Plans', icon: Calendar },
    { id: 'events', label: 'Events', icon: CalendarCheck },
    { id: 'timetables', label: 'Timetables', icon: Clock },
    { id: 'routines', label: 'Routines', icon: ListTodo },
  ];

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const cardBorder = isDark ? 'border-gray-700' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textColor}`}>Planning & Programming</h1>
          <p className={mutedText}>Manage term plans, events, timetables, and daily routines</p>
        </div>
      </div>

      <div className={`${cardBg} border ${cardBorder} rounded-lg overflow-hidden`}>
        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 min-h-[44px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-red-800 text-red-800 bg-red-50 dark:bg-red-900/20'
                  : `${mutedText} hover:bg-gray-50 dark:hover:bg-gray-700`
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 'term-plans' && (
            <TermPlansTab
              termPlans={termPlans}
              onAdd={() => { setEditingTermPlan(null); setShowTermPlanModal(true); }}
              onEdit={(plan) => { setEditingTermPlan(plan); setShowTermPlanModal(true); }}
              onDelete={(id) => deleteTermPlanMutation.mutate(id)}
              isDark={isDark}
            />
          )}

          {activeTab === 'events' && (
            <EventsTab
              events={events}
              termPlans={termPlans}
              onAdd={() => { setEditingEvent(null); setShowEventModal(true); }}
              onEdit={(event) => { setEditingEvent(event); setShowEventModal(true); }}
              onDelete={(id) => deleteEventMutation.mutate(id)}
              onViewDetails={(event) => { setSelectedEvent(event); setShowEventDetailModal(true); }}
              isDark={isDark}
            />
          )}

          {activeTab === 'timetables' && (
            <TimetablesTab
              periods={periods}
              timetableEntries={timetableEntries}
              teachers={teachers}
              selectedClass={selectedClass}
              selectedStream={selectedStream}
              onClassChange={setSelectedClass}
              onStreamChange={setSelectedStream}
              onAddPeriod={() => { setEditingPeriod(null); setShowPeriodModal(true); }}
              onEditPeriod={(period) => { setEditingPeriod(period); setShowPeriodModal(true); }}
              onDeletePeriod={(id) => deletePeriodMutation.mutate(id)}
              onSaveTimetable={(entries) => saveTimetableMutation.mutate({ entries, classLevel: selectedClass, stream: selectedStream })}
              onSeedPeriods={() => seedPeriodsMutation.mutate()}
              isDark={isDark}
            />
          )}

          {activeTab === 'routines' && (
            <RoutinesTab
              routines={routines}
              onAdd={() => { setEditingRoutine(null); setShowRoutineModal(true); }}
              onEdit={(routine) => { setEditingRoutine(routine); setShowRoutineModal(true); }}
              onDelete={(id) => deleteRoutineMutation.mutate(id)}
              isDark={isDark}
            />
          )}
        </div>
      </div>

      {showTermPlanModal && (
        <TermPlanModal
          plan={editingTermPlan}
          onClose={() => { setShowTermPlanModal(false); setEditingTermPlan(null); }}
          onSave={(data) => editingTermPlan ? updateTermPlanMutation.mutate(data) : createTermPlanMutation.mutate(data)}
          isDark={isDark}
        />
      )}

      {showEventModal && (
        <EventModal
          event={editingEvent}
          termPlans={termPlans}
          users={users}
          onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
          onSave={(data) => editingEvent ? updateEventMutation.mutate(data) : createEventMutation.mutate(data)}
          isDark={isDark}
        />
      )}

      {showEventDetailModal && selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          users={users}
          onClose={() => { setShowEventDetailModal(false); setSelectedEvent(null); }}
          isDark={isDark}
        />
      )}

      {showPeriodModal && (
        <PeriodModal
          period={editingPeriod}
          periods={periods}
          onClose={() => { setShowPeriodModal(false); setEditingPeriod(null); }}
          onSave={(data) => editingPeriod ? updatePeriodMutation.mutate(data) : createPeriodMutation.mutate(data)}
          isDark={isDark}
        />
      )}

      {showRoutineModal && (
        <RoutineModal
          routine={editingRoutine}
          onClose={() => { setShowRoutineModal(false); setEditingRoutine(null); }}
          onSave={(data) => editingRoutine ? updateRoutineMutation.mutate(data) : createRoutineMutation.mutate(data)}
          isDark={isDark}
        />
      )}
    </div>
  );
}

function TermPlansTab({
  termPlans,
  onAdd,
  onEdit,
  onDelete,
  isDark,
}: {
  termPlans: TermPlan[];
  onAdd: () => void;
  onEdit: (plan: TermPlan) => void;
  onDelete: (id: number) => void;
  isDark: boolean;
}) {
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className={`text-lg font-semibold ${textColor}`}>Term Work Plans</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Term Plan</span>
        </button>
      </div>

      {termPlans.length === 0 ? (
        <div className={`text-center py-12 ${mutedText}`}>
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No term plans yet. Create your first term plan to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {termPlans.map((plan) => (
            <div key={plan.id} className={`${cardBg} rounded-lg p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className={`font-semibold ${textColor}`}>{plan.name}</h3>
                  <p className={`text-sm ${mutedText}`}>Term {plan.term}, {plan.year}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[plan.status]?.bg || 'bg-gray-100'} ${STATUS_COLORS[plan.status]?.text || 'text-gray-700'}`}>
                  {plan.status}
                </span>
              </div>
              
              <div className={`text-sm ${mutedText} mb-3`}>
                <p>{plan.startDate} - {plan.endDate}</p>
                {plan.theme && <p className="mt-1 italic">"{plan.theme}"</p>}
              </div>

              <div className="flex items-center gap-2 text-sm mb-3">
                <Target className="w-4 h-4" />
                <span>{(plan.objectives || []).length} objectives</span>
                <BookOpen className="w-4 h-4 ml-2" />
                <span>{(plan.keyActivities || []).length} activities</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(plan)}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-h-[44px]"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => onDelete(plan.id)}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[44px]"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventsTab({
  events,
  termPlans,
  onAdd,
  onEdit,
  onDelete,
  onViewDetails,
  isDark,
}: {
  events: SchoolEvent[];
  termPlans: TermPlan[];
  onAdd: () => void;
  onEdit: (event: SchoolEvent) => void;
  onDelete: (id: number) => void;
  onViewDetails: (event: SchoolEvent) => void;
  isDark: boolean;
}) {
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';

  const eventTypeLabel = (type: string) => EVENT_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className={`text-lg font-semibold ${textColor}`}>School Events</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Event</span>
        </button>
      </div>

      {events.length === 0 ? (
        <div className={`text-center py-12 ${mutedText}`}>
          <CalendarCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No events scheduled. Add your first school event.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className={`${cardBg} rounded-lg p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold ${textColor}`}>{event.name}</h3>
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                      {eventTypeLabel(event.eventType)}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[event.status]?.bg || 'bg-gray-100'} ${STATUS_COLORS[event.status]?.text || 'text-gray-700'}`}>
                      {event.status}
                    </span>
                  </div>
                  <p className={`text-sm ${mutedText} mt-1`}>
                    {event.startDate}{event.endDate && event.endDate !== event.startDate ? ` - ${event.endDate}` : ''}
                    {event.startTime && ` at ${event.startTime}`}
                    {event.venue && ` | ${event.venue}`}
                  </p>
                  {event.description && (
                    <p className={`text-sm ${mutedText} mt-1 line-clamp-1`}>{event.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewDetails(event)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 min-h-[44px]"
                  >
                    <Users className="w-3 h-3" /> Details
                  </button>
                  <button
                    onClick={() => onEdit(event)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-h-[44px]"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[44px]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimetablesTab({
  periods,
  timetableEntries,
  teachers,
  selectedClass,
  selectedStream,
  onClassChange,
  onStreamChange,
  onAddPeriod,
  onEditPeriod,
  onDeletePeriod,
  onSaveTimetable,
  onSeedPeriods,
  isDark,
}: {
  periods: TimetablePeriod[];
  timetableEntries: ClassTimetable[];
  teachers: Teacher[];
  selectedClass: string;
  selectedStream: string;
  onClassChange: (c: string) => void;
  onStreamChange: (s: string) => void;
  onAddPeriod: () => void;
  onEditPeriod: (period: TimetablePeriod) => void;
  onDeletePeriod: (id: number) => void;
  onSaveTimetable: (entries: Partial<ClassTimetable>[]) => void;
  onSeedPeriods: () => void;
  isDark: boolean;
}) {
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const [showPeriodSettings, setShowPeriodSettings] = useState(false);
  const [localTimetable, setLocalTimetable] = useState<Record<string, Partial<ClassTimetable>>>({});

  const lessonPeriods = periods.filter(p => p.periodType === 'lesson' && p.isActive);

  const getTimetableEntry = (periodId: number, day: string) => {
    const key = `${periodId}-${day}`;
    if (localTimetable[key]) return localTimetable[key];
    return timetableEntries.find(e => e.periodId === periodId && e.dayOfWeek === day);
  };

  const updateCell = (periodId: number, day: string, field: string, value: string | number | null) => {
    const key = `${periodId}-${day}`;
    setLocalTimetable(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        periodId,
        dayOfWeek: day,
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    const entries: Partial<ClassTimetable>[] = [];
    DAYS_OF_WEEK.forEach(day => {
      lessonPeriods.forEach(period => {
        const entry = getTimetableEntry(period.id, day);
        if (entry?.subject || entry?.teacherId) {
          entries.push({
            periodId: period.id,
            dayOfWeek: day,
            subject: entry.subject,
            teacherId: entry.teacherId,
            room: entry.room,
          });
        }
      });
    });
    onSaveTimetable(entries);
  };

  const exportTimetablePDF = async () => {
    const jsPDF = (window as any).jspdf?.jsPDF;
    if (!jsPDF) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
          const autoTableScript = document.createElement('script');
          autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
          autoTableScript.onload = () => resolve();
          document.body.appendChild(autoTableScript);
        };
        document.body.appendChild(script);
      });
    }

    const PDF = (window as any).jspdf?.jsPDF;
    const doc = new PDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text(`Class Timetable - ${selectedClass}${selectedStream ? ` (${selectedStream})` : ''}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

    const headers = ['Period', 'Time', ...DAYS_OF_WEEK];
    const rows = lessonPeriods.map(period => {
      const row: string[] = [
        period.name,
        `${period.startTime} - ${period.endTime}`,
      ];
      DAYS_OF_WEEK.forEach(day => {
        const entry = getTimetableEntry(period.id, day);
        const teacher = entry?.teacherId ? teachers.find(t => t.id === entry.teacherId)?.name : '';
        const cell = entry?.subject ? `${entry.subject}${teacher ? `\n(${teacher})` : ''}` : '-';
        row.push(cell);
      });
      return row;
    });

    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [123, 17, 19], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
      },
    });

    doc.save(`timetable-${selectedClass}${selectedStream ? `-${selectedStream}` : ''}.pdf`);
  };

  const exportTeacherTimetablePDF = async (teacherId: number) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    const jsPDF = (window as any).jspdf?.jsPDF;
    if (!jsPDF) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
          const autoTableScript = document.createElement('script');
          autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
          autoTableScript.onload = () => resolve();
          document.body.appendChild(autoTableScript);
        };
        document.body.appendChild(script);
      });
    }

    const PDF = (window as any).jspdf?.jsPDF;
    const doc = new PDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text(`Teacher Timetable - ${teacher.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

    const teacherEntries = timetableEntries.filter(e => e.teacherId === teacherId);
    const headers = ['Period', 'Time', ...DAYS_OF_WEEK];
    const rows = lessonPeriods.map(period => {
      const row: string[] = [
        period.name,
        `${period.startTime} - ${period.endTime}`,
      ];
      DAYS_OF_WEEK.forEach(day => {
        const entry = teacherEntries.find(e => e.periodId === period.id && e.dayOfWeek === day);
        const cell = entry?.subject ? `${entry.subject}\n(${entry.classLevel}${entry.stream ? `-${entry.stream}` : ''})` : '-';
        row.push(cell);
      });
      return row;
    });

    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
      },
    });

    doc.save(`teacher-timetable-${teacher.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className={`text-lg font-semibold ${textColor}`}>Class Timetables</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedClass}
            onChange={(e) => onClassChange(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor} min-h-[44px]`}
          >
            {CLASS_LEVELS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => setShowPeriodSettings(!showPeriodSettings)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${inputBorder} ${textColor} min-h-[44px]`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Periods</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export PDF</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showExportMenu && (
              <div className={`absolute right-0 mt-1 w-56 rounded-lg shadow-lg border z-50 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                <button
                  onClick={() => { exportTimetablePDF(); setShowExportMenu(false); }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 min-h-[44px] ${textColor}`}
                >
                  Class Timetable ({selectedClass})
                </button>
                <div className={`border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className={`px-4 py-2 text-xs font-medium ${mutedText}`}>Teacher Timetables</div>
                  <div className="max-h-48 overflow-y-auto">
                    {teachers.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { exportTeacherTimetablePDF(t.id); setShowExportMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${textColor}`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[44px]"
          >
            Save Timetable
          </button>
        </div>
      </div>

      {showPeriodSettings && (
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-medium ${textColor}`}>Period Configuration</h3>
            <div className="flex gap-2">
              {periods.length === 0 && (
                <button
                  onClick={onSeedPeriods}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-h-[44px]"
                >
                  <RefreshCw className="w-3 h-3" /> Load Defaults
                </button>
              )}
              <button
                onClick={onAddPeriod}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[44px]"
              >
                <Plus className="w-3 h-3" /> Add Period
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={mutedText}>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Time</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period.id} className={`border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    <td className={`py-2 ${textColor}`}>{period.name}</td>
                    <td className={`py-2 ${mutedText} capitalize`}>{period.periodType}</td>
                    <td className={`py-2 ${mutedText}`}>{period.startTime} - {period.endTime}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => onEditPeriod(period)} className="text-blue-600 hover:underline mr-2">Edit</button>
                      <button onClick={() => onDeletePeriod(period.id)} className="text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lessonPeriods.length === 0 ? (
        <div className={`text-center py-12 ${mutedText}`}>
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No lesson periods configured. Add periods to create the timetable grid.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className={`p-2 text-left border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'} ${textColor}`}>
                  Period
                </th>
                {DAYS_OF_WEEK.map(day => (
                  <th key={day} className={`p-2 text-center border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'} ${textColor}`}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lessonPeriods.map(period => (
                <tr key={period.id}>
                  <td className={`p-2 border ${isDark ? 'border-gray-600' : 'border-gray-200'} ${textColor}`}>
                    <div className="font-medium">{period.name}</div>
                    <div className={`text-xs ${mutedText}`}>{period.startTime} - {period.endTime}</div>
                  </td>
                  {DAYS_OF_WEEK.map(day => {
                    const entry = getTimetableEntry(period.id, day);
                    return (
                      <td key={day} className={`p-1 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                        <select
                          value={entry?.subject || ''}
                          onChange={(e) => updateCell(period.id, day, 'subject', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border ${inputBg} ${inputBorder} ${textColor} mb-1`}
                        >
                          <option value="">Subject</option>
                          {SUBJECTS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <select
                          value={entry?.teacherId || ''}
                          onChange={(e) => updateCell(period.id, day, 'teacherId', e.target.value ? parseInt(e.target.value) : null)}
                          className={`w-full px-2 py-1 text-xs rounded border ${inputBg} ${inputBorder} ${textColor}`}
                        >
                          <option value="">Teacher</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RoutinesTab({
  routines,
  onAdd,
  onEdit,
  onDelete,
  isDark,
}: {
  routines: SchoolRoutine[];
  onAdd: () => void;
  onEdit: (routine: SchoolRoutine) => void;
  onDelete: (id: number) => void;
  isDark: boolean;
}) {
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
  const [expandedRoutine, setExpandedRoutine] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className={`text-lg font-semibold ${textColor}`}>Daily Routines</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Routine</span>
        </button>
      </div>

      {routines.length === 0 ? (
        <div className={`text-center py-12 ${mutedText}`}>
          <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No routines defined. Create routines for boarding and day students.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {routines.map((routine) => (
            <div key={routine.id} className={`${cardBg} rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedRoutine === routine.id ? (
                    <ChevronDown className={`w-5 h-5 ${mutedText}`} />
                  ) : (
                    <ChevronRight className={`w-5 h-5 ${mutedText}`} />
                  )}
                  <div>
                    <h3 className={`font-semibold ${textColor}`}>{routine.name}</h3>
                    <p className={`text-sm ${mutedText}`}>
                      {routine.appliesTo === 'all' ? 'All Students' : routine.appliesTo === 'boarders' ? 'Boarders Only' : 'Day Students Only'}
                      {routine.isDefault && <span className="ml-2 text-green-600">(Default)</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onEdit(routine)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-h-[44px]"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete(routine.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[44px]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {expandedRoutine === routine.id && routine.slots && routine.slots.length > 0 && (
                <div className={`px-4 pb-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className={mutedText}>
                        <th className="text-left py-2">Time</th>
                        <th className="text-left py-2">Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routine.slots.map((slot, idx) => (
                        <tr key={idx} className={`border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                          <td className={`py-2 ${textColor}`}>{slot.startTime} - {slot.endTime}</td>
                          <td className={`py-2 ${textColor}`}>
                            {ROUTINE_ACTIVITIES.find(a => a.value === slot.activity)?.label || slot.customActivity || slot.activity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TermPlanModal({
  plan,
  onClose,
  onSave,
  isDark,
}: {
  plan: TermPlan | null;
  onClose: () => void;
  onSave: (data: Partial<TermPlan>) => void;
  isDark: boolean;
}) {
  const [formData, setFormData] = useState<Partial<TermPlan>>({
    name: plan?.name || '',
    term: plan?.term || 1,
    year: plan?.year || new Date().getFullYear(),
    startDate: plan?.startDate || '',
    endDate: plan?.endDate || '',
    theme: plan?.theme || '',
    objectives: plan?.objectives || [],
    keyActivities: plan?.keyActivities || [],
    status: plan?.status || 'draft',
  });
  const [newObjective, setNewObjective] = useState('');

  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const textColor = isDark ? 'text-white' : 'text-gray-900';

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...(prev.objectives || []), newObjective.trim()],
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: (prev.objectives || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textColor}`}>{plan ? 'Edit Term Plan' : 'New Term Plan'}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Plan Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              placeholder="e.g., Term One Work Plan 2025"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Term</label>
              <select
                value={formData.term}
                onChange={(e) => setFormData(prev => ({ ...prev, term: parseInt(e.target.value) }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              >
                <option value={1}>Term 1</option>
                <option value={2}>Term 2</option>
                <option value={3}>Term 3</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Theme</label>
            <input
              type="text"
              value={formData.theme}
              onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              placeholder="Term theme or focus area"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Objectives</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                className={`flex-1 px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                placeholder="Add an objective"
              />
              <button
                type="button"
                onClick={addObjective}
                className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900"
              >
                Add
              </button>
            </div>
            {(formData.objectives || []).map((obj, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <span className={`flex-1 text-sm ${textColor}`}>{idx + 1}. {obj}</span>
                <button
                  type="button"
                  onClick={() => removeObjective(idx)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${inputBorder} ${textColor} min-h-[44px]`}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...formData, id: plan?.id })}
            className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
          >
            {plan ? 'Update' : 'Create'} Plan
          </button>
        </div>
      </div>
    </div>
  );
}

function EventModal({
  event,
  termPlans,
  users,
  onClose,
  onSave,
  isDark,
}: {
  event: SchoolEvent | null;
  termPlans: TermPlan[];
  users: User[];
  onClose: () => void;
  onSave: (data: Partial<SchoolEvent>) => void;
  isDark: boolean;
}) {
  const [formData, setFormData] = useState<Partial<SchoolEvent>>({
    name: event?.name || '',
    eventType: event?.eventType || 'academic',
    description: event?.description || '',
    startDate: event?.startDate || '',
    endDate: event?.endDate || '',
    startTime: event?.startTime || '',
    endTime: event?.endTime || '',
    venue: event?.venue || '',
    targetAudience: event?.targetAudience || '',
    budget: event?.budget,
    status: event?.status || 'planned',
    coordinatorId: event?.coordinatorId,
    termPlanId: event?.termPlanId,
  });

  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const textColor = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textColor}`}>{event ? 'Edit Event' : 'New Event'}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Event Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Event Type</label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              >
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Term Plan</label>
              <select
                value={formData.termPlanId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, termPlanId: e.target.value ? parseInt(e.target.value) : undefined }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              >
                <option value="">No linked plan</option>
                {termPlans.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Venue</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Coordinator</label>
              <select
                value={formData.coordinatorId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, coordinatorId: e.target.value ? parseInt(e.target.value) : undefined }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              >
                <option value="">Select coordinator</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Target Audience</label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                placeholder="e.g., All students, P7 only, Parents"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Budget (UGX)</label>
            <input
              type="number"
              value={formData.budget || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value ? parseInt(e.target.value) : undefined }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
            />
          </div>
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${inputBorder} ${textColor} min-h-[44px]`}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...formData, id: event?.id })}
            className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
          >
            {event ? 'Update' : 'Create'} Event
          </button>
        </div>
      </div>
    </div>
  );
}

function EventDetailModal({
  event,
  users,
  onClose,
  isDark,
}: {
  event: SchoolEvent;
  users: User[];
  onClose: () => void;
  isDark: boolean;
}) {
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
  const queryClient = useQueryClient();

  const { data: eventDetails } = useQuery<SchoolEvent>({
    queryKey: ['/api/school-events', event.id],
    queryFn: async () => {
      const res = await fetch(`/api/school-events/${event.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch event details');
      return res.json();
    },
  });

  const committees = eventDetails?.committees || [];
  const tasks = eventDetails?.tasks || [];

  const getUserName = (userId: number) => users.find(u => u.id === userId)?.name || 'Unknown';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textColor}`}>{event.name}</h2>
          <p className={mutedText}>
            {event.startDate}{event.endDate && event.endDate !== event.startDate ? ` - ${event.endDate}` : ''}
            {event.venue && ` | ${event.venue}`}
          </p>
        </div>
        <div className="p-4 space-y-6">
          {event.description && (
            <div>
              <h3 className={`font-medium mb-2 ${textColor}`}>Description</h3>
              <p className={mutedText}>{event.description}</p>
            </div>
          )}

          <div>
            <h3 className={`font-medium mb-2 ${textColor}`}>Committee Members ({committees.length})</h3>
            {committees.length === 0 ? (
              <p className={mutedText}>No committee members assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {committees.map((member) => (
                  <div key={member.id} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div>
                      <span className={textColor}>{getUserName(member.userId)}</span>
                      <span className={`ml-2 text-sm ${mutedText}`}>- {member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className={`font-medium mb-2 ${textColor}`}>Tasks ({tasks.length})</h3>
            {tasks.length === 0 ? (
              <p className={mutedText}>No tasks created yet.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <CheckSquare className={`w-4 h-4 ${task.status === 'completed' ? 'text-green-600' : mutedText}`} />
                      <span className={textColor}>{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {task.assignedToId && <span className={mutedText}>{getUserName(task.assignedToId)}</span>}
                      <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[task.status]?.bg || 'bg-gray-100'} ${STATUS_COLORS[task.status]?.text || 'text-gray-700'}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end`}>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PeriodModal({
  period,
  periods,
  onClose,
  onSave,
  isDark,
}: {
  period: TimetablePeriod | null;
  periods: TimetablePeriod[];
  onClose: () => void;
  onSave: (data: Partial<TimetablePeriod>) => void;
  isDark: boolean;
}) {
  const [formData, setFormData] = useState<Partial<TimetablePeriod>>({
    name: period?.name || '',
    periodType: period?.periodType || 'lesson',
    startTime: period?.startTime || '',
    endTime: period?.endTime || '',
    sortOrder: period?.sortOrder ?? periods.length,
    isActive: period?.isActive ?? true,
  });

  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const textColor = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-md w-full`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textColor}`}>{period ? 'Edit Period' : 'New Period'}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Period Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              placeholder="e.g., Period 1, Break, Lunch"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Type</label>
            <select
              value={formData.periodType}
              onChange={(e) => setFormData(prev => ({ ...prev, periodType: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
            >
              <option value="lesson">Lesson</option>
              <option value="break">Break</option>
              <option value="assembly">Assembly</option>
              <option value="games">Games/Sports</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textColor}`}>End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Sort Order</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="isActive" className={textColor}>Active</label>
          </div>
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${inputBorder} ${textColor} min-h-[44px]`}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...formData, id: period?.id })}
            className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
          >
            {period ? 'Update' : 'Create'} Period
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutineModal({
  routine,
  onClose,
  onSave,
  isDark,
}: {
  routine: SchoolRoutine | null;
  onClose: () => void;
  onSave: (data: Partial<SchoolRoutine>) => void;
  isDark: boolean;
}) {
  const [formData, setFormData] = useState<Partial<SchoolRoutine>>({
    name: routine?.name || '',
    description: routine?.description || '',
    appliesTo: routine?.appliesTo || 'all',
    dayOfWeek: routine?.dayOfWeek || DAYS_OF_WEEK,
    isDefault: routine?.isDefault ?? false,
    isActive: routine?.isActive ?? true,
    slots: routine?.slots || [],
  });

  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';

  const addSlot = () => {
    setFormData(prev => ({
      ...prev,
      slots: [...(prev.slots || []), { activity: 'lessons', startTime: '', endTime: '' }],
    }));
  };

  const updateSlot = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      slots: (prev.slots || []).map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  };

  const removeSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      slots: (prev.slots || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textColor}`}>{routine ? 'Edit Routine' : 'New Routine'}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Routine Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
              placeholder="e.g., Boarders Daily Routine"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Applies To</label>
            <select
              value={formData.appliesTo}
              onChange={(e) => setFormData(prev => ({ ...prev, appliesTo: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
            >
              <option value="all">All Students</option>
              <option value="boarders">Boarders Only</option>
              <option value="day">Day Students Only</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="rounded"
              />
              <span className={textColor}>Default Routine</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded"
              />
              <span className={textColor}>Active</span>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-sm font-medium ${textColor}`}>Time Slots</label>
              <button
                type="button"
                onClick={addSlot}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                <Plus className="w-3 h-3" /> Add Slot
              </button>
            </div>
            <div className="space-y-2">
              {(formData.slots || []).map((slot, idx) => (
                <div key={idx} className={`flex items-center gap-2 p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(idx, 'startTime', e.target.value)}
                    className={`px-2 py-1 rounded border ${inputBg} ${inputBorder} ${textColor} w-28`}
                  />
                  <span className={mutedText}>-</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(idx, 'endTime', e.target.value)}
                    className={`px-2 py-1 rounded border ${inputBg} ${inputBorder} ${textColor} w-28`}
                  />
                  <select
                    value={slot.activity}
                    onChange={(e) => updateSlot(idx, 'activity', e.target.value)}
                    className={`flex-1 px-2 py-1 rounded border ${inputBg} ${inputBorder} ${textColor}`}
                  >
                    {ROUTINE_ACTIVITIES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  {slot.activity === 'custom' && (
                    <input
                      type="text"
                      value={slot.customActivity || ''}
                      onChange={(e) => updateSlot(idx, 'customActivity', e.target.value)}
                      placeholder="Activity name"
                      className={`px-2 py-1 rounded border ${inputBg} ${inputBorder} ${textColor} w-32`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeSlot(idx)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${inputBorder} ${textColor} min-h-[44px]`}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...formData, id: routine?.id })}
            className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
          >
            {routine ? 'Update' : 'Create'} Routine
          </button>
        </div>
      </div>
    </div>
  );
}
