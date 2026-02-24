
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X, Edit2, RotateCcw, Loader2, AlertCircle, Layers, Users, Hash, BookOpen, BookMarked, UsersRound, Activity, ArrowRightLeft, TrendingUp, CalendarPlus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useSettings } from '../client/src/hooks/useSettings';
import { useStudents } from '../client/src/hooks/useStudents';
import { SubjectTeachersModal } from '../client/src/components/classes/SubjectTeachersModal';
import { ClassRegisterModal } from '../client/src/components/classes/ClassRegisterModal';
import { ClassOverview } from '../client/src/components/classes/ClassOverview';
import { PromotionWizard } from '../client/src/components/classes/PromotionWizard';
import { StreamBalancer } from '../client/src/components/classes/StreamBalancer';
import { YearTransitionWizard } from '../client/src/components/classes/YearTransitionWizard';

export default function ClassManagement() {
  const { toast } = useToast();

  const { settings, refetch: refetchSettings, updateSettings } = useSettings();
  const { students } = useStudents();

  const [newStreams, setNewStreams] = useState<Record<string, string>>({});
  const [editingAlias, setEditingAlias] = useState<{ level: string; value: string } | null>(null);
  const [editingStream, setEditingStream] = useState<{ level: string; oldName: string; value: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ level: string; stream: string } | null>(null);

  // Modals state
  const [subjectTeachersModal, setSubjectTeachersModal] = useState<{ isOpen: boolean; classLevel: string; stream: string } | null>(null);
  const [registerModal, setRegisterModal] = useState<{ isOpen: boolean; classLevel: string; stream: string } | null>(null);
  const [overviewModal, setOverviewModal] = useState<{ isOpen: boolean; classLevel: string; stream: string } | null>(null);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [streamBalancerOpen, setStreamBalancerOpen] = useState(false);
  const [yearTransitionOpen, setYearTransitionOpen] = useState(false);

  const aliasInputRef = useRef<HTMLInputElement>(null);
  const streamInputRef = useRef<HTMLInputElement>(null);

  // Hardcode active term and year for now, typically this comes from global settings
  const ACTIVE_TERM = 1;
  const ACTIVE_YEAR = new Date().getFullYear();

  useEffect(() => {
    if (editingAlias && aliasInputRef.current) aliasInputRef.current.focus();
  }, [editingAlias]);

  useEffect(() => {
    if (editingStream && streamInputRef.current) streamInputRef.current.focus();
  }, [editingStream]);

  const nurseryLevels = ['N1', 'N2', 'N3'];
  const primaryLevels = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

  const getStudentCount = (level: string, stream?: string) => {
    if (!students) return 0;
    return students.filter(s =>
      s.classLevel === level && (stream ? s.stream === stream : true)
    ).length;
  };

  const getDefaultName = (level: string) => {
    const isNursery = nurseryLevels.includes(level);
    const num = level.replace(/\D/g, '');
    return (isNursery ? 'Nursery ' : 'Primary ') + num;
  };

  const getDisplayName = (level: string) => {
    return settings?.classAliases?.[level] || getDefaultName(level);
  };

  const totalStudents = students?.length || 0;
  const totalStreams = Object.values(settings?.streams || {}).reduce((sum, arr) => sum + arr.length, 0);

  // --- Handlers ---

  const handleAddStream = async (classLevel: string) => {
    const streamName = newStreams[classLevel]?.trim();
    if (!streamName || !settings) return;

    if (settings.streams[classLevel]?.includes(streamName)) {
      toast({ title: 'Stream already exists', description: `"${streamName}" is already in ${getDisplayName(classLevel)}.`, variant: 'destructive' });
      return;
    }

    setBusyAction(`add-${classLevel}`);
    try {
      const currentStreams = settings.streams[classLevel] || [];
      const newSettings = {
        ...settings,
        streams: {
          ...settings.streams,
          [classLevel]: [...currentStreams, streamName]
        }
      };
      await updateSettings.mutateAsync(newSettings);
      setNewStreams(prev => ({ ...prev, [classLevel]: '' }));
      toast({ title: 'Stream added', description: `"${streamName}" added to ${getDisplayName(classLevel)}.` });
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to add stream', description: String(error), variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveStream = async () => {
    if (!confirmDelete || !settings) return;
    const { level, stream } = confirmDelete;
    const count = getStudentCount(level, stream);

    setBusyAction(`remove-${level}-${stream}`);
    setConfirmDelete(null);
    try {
      const currentStreams = settings.streams[level] || [];
      const newSettings = {
        ...settings,
        streams: {
          ...settings.streams,
          [level]: currentStreams.filter(s => s !== stream)
        }
      };
      await updateSettings.mutateAsync(newSettings);
      toast({
        title: 'Stream removed',
        description: `"${stream}" removed from ${getDisplayName(level)}.${count > 0 ? ` ${count} students were in this stream.` : ''}`,
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to remove stream', description: String(error), variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRenameStream = async () => {
    if (!editingStream || !settings) return;
    const { level, oldName, value } = editingStream;
    const newName = value.trim();
    if (!newName || newName === oldName) {
      setEditingStream(null);
      return;
    }

    if (settings.streams[level]?.includes(newName)) {
      toast({ title: 'Name already taken', description: `"${newName}" already exists in ${getDisplayName(level)}.`, variant: 'destructive' });
      return;
    }

    setBusyAction(`rename-stream-${level}-${oldName}`);
    try {
      const currentStreams = settings.streams[level] || [];
      const idx = currentStreams.indexOf(oldName);
      if (idx !== -1) {
        const newStreamsList = [...currentStreams];
        newStreamsList[idx] = newName;
        const newSettings = {
          ...settings,
          streams: {
            ...settings.streams,
            [level]: newStreamsList
          }
        };
        await updateSettings.mutateAsync(newSettings);
      }
      setEditingStream(null);
      toast({ title: 'Stream renamed', description: `"${oldName}" renamed to "${newName}".` });
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to rename stream', description: String(error), variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleUpdateAlias = async () => {
    if (!editingAlias || !settings) return;
    const { level, value } = editingAlias;
    const trimmed = value.trim();
    if (!trimmed) return;

    setBusyAction(`alias-${level}`);
    try {
      const newSettings = {
        ...settings,
        classAliases: {
          ...settings.classAliases,
          [level]: trimmed
        }
      };
      await updateSettings.mutateAsync(newSettings);
      setEditingAlias(null);
      toast({ title: 'Class name updated', description: `${level} is now displayed as "${trimmed}".` });
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to update class name', description: String(error), variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleResetAlias = async (level: string) => {
    if (!settings) return;
    setBusyAction(`alias-${level}`);
    try {
      const newSettings = {
        ...settings,
        classAliases: {
          ...settings.classAliases,
          [level]: ''
        }
      };
      await updateSettings.mutateAsync(newSettings);
      toast({ title: 'Class name reset', description: `${level} reset to default name.` });
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to reset class name', description: String(error), variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  // --- Render ---

  const renderStreamChip = (level: string, stream: string) => {
    const isEditing = editingStream?.level === level && editingStream?.oldName === stream;
    const isBusy = busyAction === `rename-stream-${level}-${stream}` || busyAction === `remove-${level}-${stream}`;
    const count = getStudentCount(level, stream);

    if (isEditing) {
      return (
        <div key={stream} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-400 dark:border-primary-500">
          <input
            ref={streamInputRef}
            type="text"
            value={editingStream.value}
            onChange={(e) => setEditingStream({ ...editingStream, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameStream();
              if (e.key === 'Escape') setEditingStream(null);
            }}
            className="w-24 px-1 py-0.5 text-sm bg-transparent border-none outline-none dark:text-white"
          />
          <button onClick={handleRenameStream} className="text-green-500 hover:text-green-600 p-0.5">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setEditingStream(null)} className="text-red-500 hover:text-red-600 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div
        key={stream}
        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
      >
        {isBusy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
        ) : null}
        <span>{stream}</span>
        {count > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">({count})</span>
        )}
        <button
          onClick={() => setEditingStream({ level, oldName: stream, value: stream })}
          disabled={!!busyAction}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-500 transition-all p-0.5"
          title="Rename stream"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={() => setConfirmDelete({ level, stream })}
          disabled={!!busyAction}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5"
          title="Remove stream"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex gap-1 ml-1 pl-1 border-l border-gray-200 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => setOverviewModal({ isOpen: true, classLevel: level, stream })}
            className="text-gray-400 hover:text-purple-500 p-0.5"
            title="Overview Dashboard"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSubjectTeachersModal({ isOpen: true, classLevel: level, stream })}
            className="text-gray-400 hover:text-blue-500 p-0.5"
            title="Subject Teachers"
          >
            <BookMarked className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setRegisterModal({ isOpen: true, classLevel: level, stream })}
            className="text-gray-400 hover:text-green-500 p-0.5"
            title="View Register"
          >
            <UsersRound className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderClassCard = (level: string) => {
    const streams = settings?.streams[level] || [];
    const inputStream = newStreams[level] || '';
    const isNursery = nurseryLevels.includes(level);
    const studentCount = getStudentCount(level);
    const isAddingStream = busyAction === `add-${level}`;
    const isUpdatingAlias = busyAction === `alias-${level}`;
    const hasCustomAlias = !!(settings?.classAliases?.[level]);

    return (
      <div key={level} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all overflow-hidden">
        {/* Card Header */}
        <div className={`p-4 border-b border-gray-100 dark:border-gray-700/50 ${isNursery ? 'bg-pink-50/50 dark:bg-pink-900/10' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0
                ${isNursery
                  ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400'
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                }`}>
                {level}
              </div>
              <div className="min-w-0">
                {editingAlias?.level === level ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={aliasInputRef}
                      type="text"
                      value={editingAlias.value}
                      onChange={(e) => setEditingAlias({ ...editingAlias, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateAlias();
                        if (e.key === 'Escape') setEditingAlias(null);
                      }}
                      className="w-36 px-2 py-1 text-sm font-semibold border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    />
                    <button
                      onClick={handleUpdateAlias}
                      disabled={isUpdatingAlias}
                      className="text-green-500 hover:text-green-600 p-1"
                    >
                      {isUpdatingAlias ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditingAlias(null)} className="text-red-500 hover:text-red-600 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group/title">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                      {getDisplayName(level)}
                    </h3>
                    <button
                      onClick={() => setEditingAlias({ level, value: getDisplayName(level) })}
                      disabled={!!busyAction}
                      className="opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-primary-500 transition-opacity shrink-0"
                      title="Edit class name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {hasCustomAlias && (
                      <button
                        onClick={() => handleResetAlias(level)}
                        disabled={!!busyAction}
                        className="opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-amber-500 transition-opacity shrink-0"
                        title="Reset to default name"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {streams.length} {streams.length === 1 ? 'Stream' : 'Streams'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {studentCount} {studentCount === 1 ? 'Student' : 'Students'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Streams */}
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {streams.length > 0 ? (
              streams.map(stream => renderStreamChip(level, stream))
            ) : (
              <div className="text-sm text-gray-400 italic w-full text-center py-3 flex flex-col items-center gap-1">
                <AlertCircle className="w-4 h-4 opacity-50" />
                No streams yet
              </div>
            )}
          </div>

          {/* Add stream input */}
          <div className="relative">
            <input
              type="text"
              value={inputStream}
              onChange={(e) => setNewStreams(prev => ({ ...prev, [level]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStream(level)}
              placeholder="Add stream name..."
              disabled={!!busyAction}
              className="w-full pl-3 pr-10 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-50"
            />
            <button
              onClick={() => handleAddStream(level)}
              disabled={!inputStream.trim() || !!busyAction}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${inputStream.trim() && !busyAction
                ? isNursery
                  ? 'bg-pink-500 text-white shadow-sm hover:bg-pink-600'
                  : 'bg-blue-500 text-white shadow-sm hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                }`}
            >
              {isAddingStream ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage classes, streams, and display names</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setYearTransitionOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <CalendarPlus className="w-4 h-4" />
            Advance Year
          </button>
          <button
            onClick={() => setStreamBalancerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-500" />
            Balance Streams
          </button>
          <button
            onClick={() => setPromotionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <TrendingUp className="w-4 h-4" />
            Promote Students
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm hidden md:flex">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{nurseryLevels.length + primaryLevels.length}</span> Classes
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{totalStreams}</span> Streams
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{totalStudents}</span> Students
            </span>
          </div>
        </div>
      </div>

      {/* Nursery Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg">
            <Users className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nursery Section</h2>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            ({nurseryLevels.reduce((sum, l) => sum + getStudentCount(l), 0)} students)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nurseryLevels.map(level => renderClassCard(level))}
        </div>
      </div>

      {/* Primary Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Primary Section</h2>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            ({primaryLevels.reduce((sum, l) => sum + getStudentCount(l), 0)} students)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {primaryLevels.map(level => renderClassCard(level))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Remove Stream</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Are you sure you want to remove <span className="font-semibold">"{confirmDelete.stream}"</span> from{' '}
              <span className="font-semibold">{getDisplayName(confirmDelete.level)}</span>?
            </p>
            {getStudentCount(confirmDelete.level, confirmDelete.stream) > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {getStudentCount(confirmDelete.level, confirmDelete.stream)} students are currently in this stream.
                  They will need to be reassigned.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveStream}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {subjectTeachersModal?.isOpen && (
        <SubjectTeachersModal
          isOpen={subjectTeachersModal.isOpen}
          onClose={() => setSubjectTeachersModal(null)}
          classLevel={subjectTeachersModal.classLevel}
          stream={subjectTeachersModal.stream}
          term={ACTIVE_TERM}
          year={ACTIVE_YEAR}
        />
      )}

      {registerModal?.isOpen && (
        <ClassRegisterModal
          isOpen={registerModal.isOpen}
          onClose={() => setRegisterModal(null)}
          classLevel={registerModal.classLevel}
          stream={registerModal.stream}
          term={ACTIVE_TERM}
          year={ACTIVE_YEAR}
        />
      )}

      {overviewModal?.isOpen && (
        <ClassOverview
          isOpen={overviewModal.isOpen}
          onClose={() => setOverviewModal(null)}
          classLevel={overviewModal.classLevel}
          stream={overviewModal.stream}
          term={ACTIVE_TERM}
          year={ACTIVE_YEAR}
        />
      )}

      {promotionModalOpen && (
        <PromotionWizard
          isOpen={promotionModalOpen}
          onClose={() => setPromotionModalOpen(false)}
        />
      )}

      {streamBalancerOpen && (
        <StreamBalancer
          isOpen={streamBalancerOpen}
          onClose={() => setStreamBalancerOpen(false)}
        />
      )}

      {yearTransitionOpen && (
        <YearTransitionWizard
          isOpen={yearTransitionOpen}
          onClose={() => setYearTransitionOpen(false)}
        />
      )}
    </div>
  );
}
