import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { ClipboardCheck, Eye, Target } from 'lucide-react';

import { Teacher } from '../types';
import { Observation, ObservationCriteria, AppraisalCycle, Appraisal, AppraisalGoal } from '../client/src/types/supervision';

import { ObservationModal } from '../client/src/components/supervision/ObservationModal';
import { AppraisalModal } from '../client/src/components/supervision/AppraisalModal';
import { GoalModal } from '../client/src/components/supervision/GoalModal';
import { CycleModal } from '../client/src/components/supervision/CycleModal';
import { ObservationList } from '../client/src/components/supervision/ObservationList';
import { AppraisalList } from '../client/src/components/supervision/AppraisalList';
import { GoalList } from '../client/src/components/supervision/GoalList';

type Tab = 'observations' | 'appraisals' | 'goals';

export function Supervision() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('observations');

  // Modal State
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);

  // Selection State
  const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
  const [editingAppraisal, setEditingAppraisal] = useState<Appraisal | null>(null);
  const [editingGoal, setEditingGoal] = useState<AppraisalGoal | null>(null);

  // Queries
  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers'],
  });

  const { data: criteria = [] } = useQuery<ObservationCriteria[]>({
    queryKey: ['/api/observation-criteria'],
  });

  const { data: observations = [] } = useQuery<Observation[]>({
    queryKey: ['/api/observations'],
  });

  const { data: cycles = [] } = useQuery<AppraisalCycle[]>({
    queryKey: ['/api/appraisal-cycles'],
  });

  const { data: appraisals = [] } = useQuery<Appraisal[]>({
    queryKey: ['/api/appraisals'],
  });

  const { data: goals = [] } = useQuery<AppraisalGoal[]>({
    queryKey: ['/api/appraisal-goals'],
  });

  const seedCriteriaMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/observation-criteria/seed-defaults', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to seed criteria');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/observation-criteria'] }),
  });

  const groupedCriteria = criteria.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, ObservationCriteria[]>);

  const tabClasses = (tab: Tab) =>
    `min-h-[44px] px-4 py-3 font-medium text-sm rounded-lg transition-colors ${activeTab === tab
      ? 'bg-[#7B1113] text-white'
      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7 text-[#7B1113]" />
              Staff Supervision & Appraisal
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage teacher observations, performance appraisals, and professional goals
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setActiveTab('observations')} className={tabClasses('observations')}>
            <Eye className="w-4 h-4 inline mr-2" />
            Observations
          </button>
          <button onClick={() => setActiveTab('appraisals')} className={tabClasses('appraisals')}>
            <ClipboardCheck className="w-4 h-4 inline mr-2" />
            Appraisals
          </button>
          <button onClick={() => setActiveTab('goals')} className={tabClasses('goals')}>
            <Target className="w-4 h-4 inline mr-2" />
            Goals
          </button>
        </div>

        {activeTab === 'observations' && (
          <ObservationList
            observations={observations}
            teachers={teachers}
            criteria={criteria}
            isDark={isDark}
            onEdit={(obs) => { setEditingObservation(obs); setShowObservationModal(true); }}
            onSchedule={() => { setEditingObservation(null); setShowObservationModal(true); }}
            onSeedCriteria={() => seedCriteriaMutation.mutate()}
            isSeeding={seedCriteriaMutation.isPending}
          />
        )}

        {activeTab === 'appraisals' && (
          <AppraisalList
            appraisals={appraisals}
            cycles={cycles}
            teachers={teachers}
            isDark={isDark}
            onEdit={(apr) => { setEditingAppraisal(apr); setShowAppraisalModal(true); }}
            onManageCycles={() => setShowCycleModal(true)}
            onNewAppraisal={() => { setEditingAppraisal(null); setShowAppraisalModal(true); }}
          />
        )}

        {activeTab === 'goals' && (
          <GoalList
            goals={goals}
            teachers={teachers}
            isDark={isDark}
            onEdit={(goal) => { setEditingGoal(goal); setShowGoalModal(true); }}
            onAdd={() => { setEditingGoal(null); setShowGoalModal(true); }}
          />
        )}

        {showObservationModal && (
          <ObservationModal
            observation={editingObservation}
            teachers={teachers}
            criteria={criteria}
            groupedCriteria={groupedCriteria}
            onClose={() => { setShowObservationModal(false); setEditingObservation(null); }}
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/observations'] });
              setShowObservationModal(false);
              setEditingObservation(null);
            }}
            isDark={isDark}
          />
        )}

        {showAppraisalModal && (
          <AppraisalModal
            appraisal={editingAppraisal}
            teachers={teachers}
            cycles={cycles}
            onClose={() => { setShowAppraisalModal(false); setEditingAppraisal(null); }}
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/appraisals'] });
              setShowAppraisalModal(false);
              setEditingAppraisal(null);
            }}
            isDark={isDark}
          />
        )}

        {showGoalModal && (
          <GoalModal
            goal={editingGoal}
            teachers={teachers}
            onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/appraisal-goals'] });
              setShowGoalModal(false);
              setEditingGoal(null);
            }}
            isDark={isDark}
          />
        )}

        {showCycleModal && (
          <CycleModal
            cycles={cycles}
            onClose={() => setShowCycleModal(false)}
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/appraisal-cycles'] });
            }}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
}
