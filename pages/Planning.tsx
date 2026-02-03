
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { Calendar, Clock, CalendarCheck, ListTodo } from 'lucide-react';
import { Teacher, User, TermPlan, SchoolEvent, TimetablePeriod, ClassTimetable, SchoolRoutine } from '../types';
import { TermPlansTab, TermPlanModal } from '../components/planning/TermPlansTab';
import { EventsTab, EventModal, EventDetailModal } from '../components/planning/EventsTab';
import { TimetablesTab, PeriodModal } from '../components/planning/TimetablesTab';
import { RoutinesTab, RoutineModal } from '../components/planning/RoutinesTab';

type Tab = 'term-plans' | 'events' | 'timetables' | 'routines';

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
              className={`flex items-center gap-2 px-4 py-3 min-h-[44px] font-medium transition-colors ${activeTab === tab.id
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
