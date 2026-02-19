export interface ObservationCriteria {
    id: number;
    category: string;
    criterion: string;
    description?: string;
    maxScore: number;
    sortOrder: number;
}

export interface ObservationScore {
    criteriaId: number;
    score: number;
    comment?: string;
}

export interface Observation {
    id: number;
    teacherId: number;
    observerId: number;
    observationDate: string;
    classLevel: string;
    stream?: string;
    subject: string;
    lessonTopic?: string;
    numberOfLearners?: number;
    scores: ObservationScore[];
    totalScore: number;
    maxPossibleScore: number;
    percentage: number;
    overallRating?: string;
    strengths?: string;
    areasForImprovement?: string;
    recommendations?: string;
    status: string;
}

export interface AppraisalCycle {
    id: number;
    name: string;
    cycleType: string;
    startDate: string;
    endDate: string;
    status: string;
}

export interface PerformanceArea {
    area: string;
    selfRating: number;
    supervisorRating: number;
    weight: number;
    comments?: string;
}

export interface Appraisal {
    id: number;
    cycleId?: number;
    teacherId: number;
    appraiserId: number;
    appraisalDate: string;
    performanceAreas: PerformanceArea[];
    overallSelfRating?: number;
    overallSupervisorRating?: number;
    finalRating?: string;
    status: string;
    achievements?: string;
    challenges?: string;
}

export interface AppraisalGoal {
    id: number;
    appraisalId?: number;
    teacherId: number;
    goal: string;
    category?: string;
    targetDate?: string;
    progress: number;
    status: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
    lesson_planning: 'Lesson Planning',
    teaching_methods: 'Teaching Methods',
    classroom_management: 'Classroom Management',
    learner_engagement: 'Learner Engagement',
    assessment: 'Assessment',
};

export const RATING_LABELS: Record<string, { label: string; color: string }> = {
    excellent: { label: 'Excellent', color: 'text-green-600' },
    very_good: { label: 'Very Good', color: 'text-blue-600' },
    good: { label: 'Good', color: 'text-cyan-600' },
    satisfactory: { label: 'Satisfactory', color: 'text-yellow-600' },
    needs_improvement: { label: 'Needs Improvement', color: 'text-red-600' },
    outstanding: { label: 'Outstanding', color: 'text-purple-600' },
    exceeds_expectations: { label: 'Exceeds Expectations', color: 'text-blue-600' },
    meets_expectations: { label: 'Meets Expectations', color: 'text-green-600' },
    unsatisfactory: { label: 'Unsatisfactory', color: 'text-red-600' },
};

export const GOAL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    deferred: { label: 'Deferred', color: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};
