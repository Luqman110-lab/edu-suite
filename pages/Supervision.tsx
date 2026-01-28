import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, ClipboardCheck, Target, Plus, Edit2, Trash2, Calendar, User, BookOpen, CheckCircle, Clock, AlertTriangle, FileText, ChevronDown } from 'lucide-react';

type Tab = 'observations' | 'appraisals' | 'goals';

interface Teacher {
  id: number;
  name: string;
  assignedClass?: string;
  subjects?: string[];
}

interface ObservationCriteria {
  id: number;
  category: string;
  criterion: string;
  description?: string;
  maxScore: number;
  sortOrder: number;
}

interface Observation {
  id: number;
  teacherId: number;
  observerId: number;
  observationDate: string;
  classLevel: string;
  stream?: string;
  subject: string;
  lessonTopic?: string;
  numberOfLearners?: number;
  scores: { criteriaId: number; score: number; comment?: string }[];
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  overallRating?: string;
  strengths?: string;
  areasForImprovement?: string;
  recommendations?: string;
  status: string;
}

interface AppraisalCycle {
  id: number;
  name: string;
  cycleType: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Appraisal {
  id: number;
  cycleId?: number;
  teacherId: number;
  appraiserId: number;
  appraisalDate: string;
  performanceAreas: { area: string; selfRating: number; supervisorRating: number; weight: number; comments?: string }[];
  overallSelfRating?: number;
  overallSupervisorRating?: number;
  finalRating?: string;
  status: string;
  achievements?: string;
  challenges?: string;
}

interface AppraisalGoal {
  id: number;
  appraisalId?: number;
  teacherId: number;
  goal: string;
  category?: string;
  targetDate?: string;
  progress: number;
  status: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  lesson_planning: 'Lesson Planning',
  teaching_methods: 'Teaching Methods',
  classroom_management: 'Classroom Management',
  learner_engagement: 'Learner Engagement',
  assessment: 'Assessment',
};

const RATING_LABELS: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'text-green-600' },
  very_good: { label: 'Very Good', color: 'text-blue-600' },
  good: { label: 'Good', color: 'text-cyan-600' },
  satisfactory: { label: 'Satisfactory', color: 'text-yellow-600' },
  needs_improvement: { label: 'Needs Improvement', color: 'text-red-600' },
};

const GOAL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  deferred: { label: 'Deferred', color: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export function Supervision() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('observations');
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
  const [editingAppraisal, setEditingAppraisal] = useState<Appraisal | null>(null);
  const [editingGoal, setEditingGoal] = useState<AppraisalGoal | null>(null);

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

  const getTeacherName = (id: number) => teachers.find(t => t.id === id)?.name || 'Unknown';

  const groupedCriteria = criteria.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, ObservationCriteria[]>);

  const tabClasses = (tab: Tab) =>
    `min-h-[44px] px-4 py-3 font-medium text-sm rounded-lg transition-colors ${
      activeTab === tab
        ? isDark ? 'bg-[#7B1113] text-white' : 'bg-[#7B1113] text-white'
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
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setEditingObservation(null); setShowObservationModal(true); }}
                className="min-h-[44px] px-4 py-3 bg-[#7B1113] text-white rounded-lg font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Schedule Observation
              </button>
              {criteria.length === 0 && (
                <button
                  onClick={() => seedCriteriaMutation.mutate()}
                  disabled={seedCriteriaMutation.isPending}
                  className={`min-h-[44px] px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${
                    isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Load Default Criteria
                </button>
              )}
            </div>

            {observations.length === 0 ? (
              <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Observations Yet</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Schedule your first classroom observation to get started.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {observations.map(obs => (
                  <div key={obs.id} className={`rounded-lg p-4 shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{getTeacherName(obs.teacherId)}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {obs.subject} - {obs.classLevel}{obs.stream ? ` ${obs.stream}` : ''}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        obs.status === 'completed' ? 'bg-green-100 text-green-700' :
                        obs.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {obs.status}
                      </span>
                    </div>
                    <div className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {obs.observationDate}
                      </p>
                      {obs.status === 'completed' && (
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Score: {obs.percentage}%
                          {obs.overallRating && (
                            <span className={RATING_LABELS[obs.overallRating]?.color}>
                              ({RATING_LABELS[obs.overallRating]?.label})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => { setEditingObservation(obs); setShowObservationModal(true); }}
                        className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                          isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <Edit2 className="w-4 h-4 inline mr-1" /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'appraisals' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowCycleModal(true)}
                className={`min-h-[44px] px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${
                  isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <Calendar className="w-4 h-4" /> Manage Cycles
              </button>
              <button
                onClick={() => { setEditingAppraisal(null); setShowAppraisalModal(true); }}
                className="min-h-[44px] px-4 py-3 bg-[#7B1113] text-white rounded-lg font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Appraisal
              </button>
            </div>

            {cycles.length > 0 && (
              <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Active Cycles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {cycles.filter(c => c.status === 'active').map(cycle => (
                    <span key={cycle.id} className={`px-3 py-1 rounded-full text-sm ${
                      isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {cycle.name} ({cycle.startDate} - {cycle.endDate})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {appraisals.length === 0 ? (
              <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Appraisals Yet</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Create an appraisal cycle and start evaluating staff performance.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {appraisals.map(apr => (
                  <div key={apr.id} className={`rounded-lg p-4 shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{getTeacherName(apr.teacherId)}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {apr.appraisalDate}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        apr.status === 'completed' ? 'bg-green-100 text-green-700' :
                        apr.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {apr.status}
                      </span>
                    </div>
                    {apr.finalRating && (
                      <p className={`text-sm font-medium ${RATING_LABELS[apr.finalRating]?.color}`}>
                        {RATING_LABELS[apr.finalRating]?.label}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => { setEditingAppraisal(apr); setShowAppraisalModal(true); }}
                        className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                          isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <Edit2 className="w-4 h-4 inline mr-1" /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
                className="min-h-[44px] px-4 py-3 bg-[#7B1113] text-white rounded-lg font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Goal
              </button>
            </div>

            {goals.length === 0 ? (
              <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Goals Yet</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Set professional development goals for staff members.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {goals.map(goal => (
                  <div key={goal.id} className={`rounded-lg p-4 shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{getTeacherName(goal.teacherId)}</h3>
                        <p className={`text-sm line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {goal.goal}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${GOAL_STATUS_LABELS[goal.status]?.color}`}>
                        {GOAL_STATUS_LABELS[goal.status]?.label}
                      </span>
                      {goal.targetDate && (
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Due: {goal.targetDate}
                        </span>
                      )}
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className="h-full rounded-full bg-[#7B1113] transition-all"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {goal.progress}% complete
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => { setEditingGoal(goal); setShowGoalModal(true); }}
                        className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                          isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <Edit2 className="w-4 h-4 inline mr-1" /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

function ObservationModal({
  observation,
  teachers,
  criteria,
  groupedCriteria,
  onClose,
  onSave,
  isDark,
}: {
  observation: Observation | null;
  teachers: Teacher[];
  criteria: ObservationCriteria[];
  groupedCriteria: Record<string, ObservationCriteria[]>;
  onClose: () => void;
  onSave: () => void;
  isDark: boolean;
}) {
  const [formData, setFormData] = useState({
    teacherId: observation?.teacherId || '',
    observationDate: observation?.observationDate || new Date().toISOString().split('T')[0],
    classLevel: observation?.classLevel || '',
    stream: observation?.stream || '',
    subject: observation?.subject || '',
    lessonTopic: observation?.lessonTopic || '',
    numberOfLearners: observation?.numberOfLearners || '',
    scores: observation?.scores || criteria.map(c => ({ criteriaId: c.id, score: 0, comment: '' })),
    strengths: observation?.strengths || '',
    areasForImprovement: observation?.areasForImprovement || '',
    recommendations: observation?.recommendations || '',
    status: observation?.status || 'scheduled',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const totalScore = formData.scores.reduce((sum, s) => sum + (s.score || 0), 0);
      const maxPossibleScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
      const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
      let overallRating = '';
      if (percentage >= 90) overallRating = 'excellent';
      else if (percentage >= 75) overallRating = 'very_good';
      else if (percentage >= 60) overallRating = 'good';
      else if (percentage >= 50) overallRating = 'satisfactory';
      else overallRating = 'needs_improvement';

      const payload = {
        ...formData,
        teacherId: parseInt(formData.teacherId as string),
        numberOfLearners: formData.numberOfLearners ? parseInt(formData.numberOfLearners as string) : null,
        totalScore,
        maxPossibleScore,
        percentage,
        overallRating: formData.status === 'completed' ? overallRating : null,
      };

      const res = await fetch(observation ? `/api/observations/${observation.id}` : '/api/observations', {
        method: observation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: onSave,
  });

  const updateScore = (criteriaId: number, score: number) => {
    setFormData(prev => ({
      ...prev,
      scores: prev.scores.map(s =>
        s.criteriaId === criteriaId ? { ...s, score } : s
      ),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="sticky top-0 p-4 border-b flex justify-between items-center bg-inherit z-10">
          <h2 className="text-lg font-bold">{observation ? 'Edit Observation' : 'Schedule Observation'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Teacher</label>
              <select
                value={formData.teacherId}
                onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="">Select teacher</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.observationDate}
                onChange={e => setFormData({ ...formData, observationDate: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select
                value={formData.classLevel}
                onChange={e => setFormData({ ...formData, classLevel: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="">Select class</option>
                {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Mathematics"
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lesson Topic</label>
            <input
              type="text"
              value={formData.lessonTopic}
              onChange={e => setFormData({ ...formData, lessonTopic: e.target.value })}
              placeholder="Topic being taught"
              className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {(formData.status === 'in_progress' || formData.status === 'completed') && Object.keys(groupedCriteria).length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Observation Scores</h3>
              {Object.entries(groupedCriteria).map(([category, items]) => (
                <div key={category} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className="font-medium mb-2">{CATEGORY_LABELS[category] || category}</h4>
                  <div className="space-y-2">
                    {items.map(item => {
                      const currentScore = formData.scores.find(s => s.criteriaId === item.id)?.score || 0;
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-4">
                          <span className="text-sm flex-1">{item.criterion}</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(score => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => updateScore(item.id, score)}
                                className={`w-8 h-8 rounded text-sm font-medium ${
                                  currentScore >= score
                                    ? 'bg-[#7B1113] text-white'
                                    : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {formData.status === 'completed' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Strengths Observed</label>
                <textarea
                  value={formData.strengths}
                  onChange={e => setFormData({ ...formData, strengths: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Areas for Improvement</label>
                <textarea
                  value={formData.areasForImprovement}
                  onChange={e => setFormData({ ...formData, areasForImprovement: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Recommendations</label>
                <textarea
                  value={formData.recommendations}
                  onChange={e => setFormData({ ...formData, recommendations: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
              </div>
            </>
          )}
        </div>
        <div className="sticky bottom-0 p-4 border-t bg-inherit flex justify-end gap-2">
          <button onClick={onClose} className={`min-h-[44px] px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.teacherId || !formData.classLevel || !formData.subject}
            className="min-h-[44px] px-4 py-2 bg-[#7B1113] text-white rounded-lg disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppraisalModal({
  appraisal,
  teachers,
  cycles,
  onClose,
  onSave,
  isDark,
}: {
  appraisal: Appraisal | null;
  teachers: Teacher[];
  cycles: AppraisalCycle[];
  onClose: () => void;
  onSave: () => void;
  isDark: boolean;
}) {
  const defaultAreas = [
    { area: 'Teaching & Learning', selfRating: 0, supervisorRating: 0, weight: 25 },
    { area: 'Classroom Management', selfRating: 0, supervisorRating: 0, weight: 20 },
    { area: 'Professional Conduct', selfRating: 0, supervisorRating: 0, weight: 20 },
    { area: 'Collaboration & Teamwork', selfRating: 0, supervisorRating: 0, weight: 15 },
    { area: 'Student Results & Achievement', selfRating: 0, supervisorRating: 0, weight: 20 },
  ];

  const [formData, setFormData] = useState({
    teacherId: appraisal?.teacherId || '',
    cycleId: appraisal?.cycleId || '',
    appraisalDate: appraisal?.appraisalDate || new Date().toISOString().split('T')[0],
    performanceAreas: appraisal?.performanceAreas?.length ? appraisal.performanceAreas : defaultAreas,
    achievements: appraisal?.achievements || '',
    challenges: appraisal?.challenges || '',
    status: appraisal?.status || 'draft',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const totalWeight = formData.performanceAreas.reduce((sum, a) => sum + a.weight, 0);
      const selfTotal = formData.performanceAreas.reduce((sum, a) => sum + (a.selfRating * a.weight), 0) / totalWeight;
      const supervisorTotal = formData.performanceAreas.reduce((sum, a) => sum + (a.supervisorRating * a.weight), 0) / totalWeight;
      
      let finalRating = '';
      if (supervisorTotal >= 4.5) finalRating = 'outstanding';
      else if (supervisorTotal >= 3.5) finalRating = 'exceeds_expectations';
      else if (supervisorTotal >= 2.5) finalRating = 'meets_expectations';
      else if (supervisorTotal >= 1.5) finalRating = 'needs_improvement';
      else finalRating = 'unsatisfactory';

      const payload = {
        ...formData,
        teacherId: parseInt(formData.teacherId as string),
        cycleId: formData.cycleId ? parseInt(formData.cycleId as string) : null,
        overallSelfRating: Math.round(selfTotal * 10) / 10,
        overallSupervisorRating: Math.round(supervisorTotal * 10) / 10,
        finalRating: formData.status === 'completed' ? finalRating : null,
      };

      const res = await fetch(appraisal ? `/api/appraisals/${appraisal.id}` : '/api/appraisals', {
        method: appraisal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: onSave,
  });

  const updateAreaRating = (index: number, field: 'selfRating' | 'supervisorRating', value: number) => {
    setFormData(prev => ({
      ...prev,
      performanceAreas: prev.performanceAreas.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      ),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="sticky top-0 p-4 border-b flex justify-between items-center bg-inherit z-10">
          <h2 className="text-lg font-bold">{appraisal ? 'Edit Appraisal' : 'New Appraisal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Teacher</label>
              <select
                value={formData.teacherId}
                onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="">Select teacher</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Appraisal Cycle</label>
              <select
                value={formData.cycleId}
                onChange={e => setFormData({ ...formData, cycleId: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="">No cycle</option>
                {cycles.filter(c => c.status === 'active').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.appraisalDate}
                onChange={e => setFormData({ ...formData, appraisalDate: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="draft">Draft</option>
                <option value="self_assessment">Self Assessment</option>
                <option value="supervisor_review">Supervisor Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Performance Areas (Rate 1-5)</h3>
            {formData.performanceAreas.map((area, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{area.area}</span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Weight: {area.weight}%</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1">Self Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(score => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => updateAreaRating(idx, 'selfRating', score)}
                          className={`w-8 h-8 rounded text-sm font-medium ${
                            area.selfRating >= score
                              ? 'bg-blue-600 text-white'
                              : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Supervisor Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(score => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => updateAreaRating(idx, 'supervisorRating', score)}
                          className={`w-8 h-8 rounded text-sm font-medium ${
                            area.supervisorRating >= score
                              ? 'bg-[#7B1113] text-white'
                              : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Key Achievements</label>
            <textarea
              value={formData.achievements}
              onChange={e => setFormData({ ...formData, achievements: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Challenges Faced</label>
            <textarea
              value={formData.challenges}
              onChange={e => setFormData({ ...formData, challenges: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
        </div>
        <div className="sticky bottom-0 p-4 border-t bg-inherit flex justify-end gap-2">
          <button onClick={onClose} className={`min-h-[44px] px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.teacherId}
            className="min-h-[44px] px-4 py-2 bg-[#7B1113] text-white rounded-lg disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalModal({
  goal,
  teachers,
  onClose,
  onSave,
  isDark,
}: {
  goal: AppraisalGoal | null;
  teachers: Teacher[];
  onClose: () => void;
  onSave: () => void;
  isDark: boolean;
}) {
  const [formData, setFormData] = useState({
    teacherId: goal?.teacherId || '',
    goal: goal?.goal || '',
    category: goal?.category || '',
    targetDate: goal?.targetDate || '',
    progress: goal?.progress || 0,
    status: goal?.status || 'not_started',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        teacherId: parseInt(formData.teacherId as string),
      };

      const res = await fetch(goal ? `/api/appraisal-goals/${goal.id}` : '/api/appraisal-goals', {
        method: goal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: onSave,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-md rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">{goal ? 'Edit Goal' : 'Add Goal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Teacher</label>
            <select
              value={formData.teacherId}
              onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
              className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            >
              <option value="">Select teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Goal</label>
            <textarea
              value={formData.goal}
              onChange={e => setFormData({ ...formData, goal: e.target.value })}
              rows={3}
              placeholder="Describe the goal..."
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="">Select category</option>
                <option value="professional_development">Professional Development</option>
                <option value="student_achievement">Student Achievement</option>
                <option value="classroom_management">Classroom Management</option>
                <option value="school_contribution">School Contribution</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Date</label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Progress: {formData.progress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="deferred">Deferred</option>
            </select>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className={`min-h-[44px] px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.teacherId || !formData.goal}
            className="min-h-[44px] px-4 py-2 bg-[#7B1113] text-white rounded-lg disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CycleModal({
  cycles,
  onClose,
  onSave,
  isDark,
}: {
  cycles: AppraisalCycle[];
  onClose: () => void;
  onSave: () => void;
  isDark: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cycleType: 'termly',
    startDate: '',
    endDate: '',
    status: 'active',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/appraisal-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      onSave();
      setShowForm(false);
      setFormData({ name: '', cycleType: 'termly', startDate: '', endDate: '', status: 'active' });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">Appraisal Cycles</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="min-h-[44px] px-4 py-2 bg-[#7B1113] text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Cycle
            </button>
          )}

          {showForm && (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'} space-y-3`}>
              <input
                type="text"
                placeholder="Cycle name (e.g., Term 1 2025 Appraisal)"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'}`}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={formData.cycleType}
                  onChange={e => setFormData({ ...formData, cycleType: e.target.value })}
                  className={`min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'}`}
                >
                  <option value="termly">Termly</option>
                  <option value="annually">Annually</option>
                  <option value="probation">Probation</option>
                </select>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className={`min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'}`}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  placeholder="Start Date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className={`min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'}`}
                />
                <input
                  type="date"
                  placeholder="End Date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className={`min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !formData.name || !formData.startDate || !formData.endDate}
                  className="min-h-[44px] flex-1 px-3 py-2 bg-[#7B1113] text-white rounded-lg disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {cycles.map(cycle => (
              <div key={cycle.id} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{cycle.name}</h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {cycle.startDate} - {cycle.endDate}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    cycle.status === 'active' ? 'bg-green-100 text-green-700' :
                    cycle.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {cycle.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
