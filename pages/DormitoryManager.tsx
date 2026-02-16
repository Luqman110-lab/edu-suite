import React, { useEffect, useState, useMemo } from 'react';

interface Dormitory {
  id: number;
  name: string;
  gender: string;
  capacity: number;
  building?: string;
  floor?: string;
  wardenName?: string;
  wardenPhone?: string;
  description?: string;
  isActive: boolean;
}

interface Bed {
  id: number;
  dormitoryId: number;
  bedNumber: string; // Structure Identifier
  level: string; // Single, Top, Middle, Bottom
  mattressNumber?: string;
  status: string;
  currentStudentId: number | null;
  studentName?: string;
  classLevel?: string;
}

interface Student {
  id: number;
  name: string;
  indexNumber?: string;
  classLevel: string;
  gender: string;
  boardingStatus: string;
}

export const DormitoryManager: React.FC = () => {
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDorm, setSelectedDorm] = useState<Dormitory | null>(null);

  const [showDormModal, setShowDormModal] = useState(false);
  const [showBedModal, setShowBedModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [editingDorm, setEditingDorm] = useState<Dormitory | null>(null);
  const [dormForm, setDormForm] = useState({ name: '', gender: 'male', capacity: 0, building: '', floor: '', wardenName: '', wardenPhone: '', description: '' });

  // Bed Bulk Create Form
  const [bedForm, setBedForm] = useState({ startNumber: '1', count: 10, type: 'single' });

  // Assignment Form
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [assignForm, setAssignForm] = useState({ studentId: '', mattressNumber: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dormsRes, bedsRes, studentsRes] = await Promise.all([
        fetch('/api/dormitories', { credentials: 'include' }),
        fetch('/api/beds', { credentials: 'include' }),
        fetch('/api/students', { credentials: 'include' }),
      ]);

      if (dormsRes.ok) setDormitories(await dormsRes.json());
      if (bedsRes.ok) setBeds(await bedsRes.json());
      if (studentsRes.ok) {
        const allStudents = await studentsRes.json();
        // Allow assigning any student, but practically mostly boarders
        setStudents(allStudents);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const saveDormitory = async () => {
    try {
      const url = editingDorm ? `/api/dormitories/${editingDorm.id}` : '/api/dormitories';
      const method = editingDorm ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dormForm),
      });
      if (res.ok) {
        loadData();
        setShowDormModal(false);
        setEditingDorm(null);
        setDormForm({ name: '', gender: 'male', capacity: 0, building: '', floor: '', wardenName: '', wardenPhone: '', description: '' });
      }
    } catch (err) {
      console.error('Failed to save dormitory:', err);
    }
  };

  const deleteDormitory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dormitory?')) return;
    try {
      await fetch(`/api/dormitories/${id}`, { method: 'DELETE', credentials: 'include' });
      loadData();
      if (selectedDorm?.id === id) setSelectedDorm(null);
    } catch (err) {
      console.error('Failed to delete dormitory:', err);
    }
  };

  const saveBeds = async () => {
    if (!selectedDorm) return;
    try {
      const res = await fetch('/api/beds/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dormitoryId: selectedDorm.id,
          startNumber: bedForm.startNumber,
          count: parseInt(bedForm.count.toString()),
          type: bedForm.type
        }),
      });
      if (res.ok) {
        loadData();
        setShowBedModal(false);
        setBedForm({ startNumber: '1', count: 10, type: 'single' });
      }
    } catch (err) {
      console.error('Failed to create beds:', err);
    }
  };

  const handleAssignClick = (bed: Bed) => {
    setSelectedBed(bed);
    setAssignForm({ studentId: '', mattressNumber: '' });
    setShowAssignModal(true);
  };

  const confirmAssign = async () => {
    if (!selectedBed || !assignForm.studentId) return;
    try {
      await fetch(`/api/beds/${selectedBed.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentId: parseInt(assignForm.studentId),
          mattressNumber: assignForm.mattressNumber
        }),
      });
      loadData();
      setShowAssignModal(false);
      setSelectedBed(null);
    } catch (err) {
      console.error("Assignment failed", err);
    }
  };

  const unassignStudent = async (bedId: number) => {
    if (!confirm("Release this bed?")) return;
    try {
      await fetch(`/api/beds/${bedId}/unassign`, {
        method: 'POST',
        credentials: 'include',
      });
      loadData();
    } catch (err) {
      console.error('Failed to unassign student:', err);
    }
  };

  const deleteBed = async (id: number) => {
    if (!confirm("Delete this bed slot?")) return;
    try {
      await fetch(`/api/beds/${id}`, { method: 'DELETE', credentials: 'include' });
      loadData();
    } catch (err) {
      console.error("Failed to delete bed", err);
    }
  };

  const filteredBeds = selectedDorm ? beds.filter(b => b.dormitoryId === selectedDorm.id) : [];

  // Group beds by structure (bedNumber)
  const bedStructures = useMemo(() => {
    const groups: Record<string, Bed[]> = {};
    filteredBeds.forEach(bed => {
      // Normalized key
      const key = bed.bedNumber;
      if (!groups[key]) groups[key] = [];
      groups[key].push(bed);
    });
    return groups;
  }, [filteredBeds]);

  // Sort logic for bed numbers (numeric vs string)
  const sortedStructureKeys = Object.keys(bedStructures).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  // Students available for validation
  const unassignedStudents = useMemo(() => {
    return students.filter(s => !beds.some(b => b.currentStudentId === s.id));
  }, [students, beds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dormitory Manager</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage dormitories, beds, and student allocation</p>
        </div>
        <button
          onClick={() => { setShowDormModal(true); setEditingDorm(null); setDormForm({ name: '', gender: 'male', capacity: 0, building: '', floor: '', wardenName: '', wardenPhone: '', description: '' }); }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Dormitory
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dorm List */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-100 dark:border-gray-700 p-4 h-fit">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dormitories</h2>
          <div className="space-y-2">
            {dormitories.map(dorm => (
              <div
                key={dorm.id}
                onClick={() => setSelectedDorm(dorm)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${selectedDorm?.id === dorm.id ? 'bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-500' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{dorm.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{dorm.gender} | Cap: {dorm.capacity}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditingDorm(dorm); setDormForm({ ...dorm, building: dorm.building || '', floor: dorm.floor || '', wardenName: dorm.wardenName || '', wardenPhone: dorm.wardenPhone || '', description: dorm.description || '' }); setShowDormModal(true); }} className="p-1.5 text-gray-500 hover:text-primary-600">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteDormitory(dorm.id); }} className="p-1.5 text-gray-500 hover:text-red-600">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {dormitories.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No dormitories yet</p>
            )}
          </div>
        </div>

        {/* Beds Matrix */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-100 dark:border-gray-700 p-4">
          {selectedDorm ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedDorm.name} Layout</h2>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                    <span>Total Beds: {filteredBeds.length}</span>
                    <span>Occupied: {filteredBeds.filter(b => b.status === 'occupied').length}</span>
                    <span>Vacant: {filteredBeds.filter(b => b.status === 'vacant').length}</span>
                  </div>
                </div>
                <button onClick={() => setShowBedModal(true)} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                  + Add Beds
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedStructureKeys.map(key => {
                  const structureBeds = bedStructures[key];
                  // Sort levels: Top -> Middle -> Bottom -> Single
                  const levelOrder = { 'Top': 0, 'Middle': 1, 'Bottom': 2, 'Single': 3 };
                  const sortedBeds = [...structureBeds].sort((a, b) => (levelOrder[a.level as keyof typeof levelOrder] ?? 9) - (levelOrder[b.level as keyof typeof levelOrder] ?? 9));

                  return (
                    <div key={key} className="border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-gray-700 dark:text-gray-300">Structure #{key}</span>
                        <span className="text-xs text-gray-500 uppercase">{structureBeds.length > 1 ? (structureBeds.length === 3 ? 'Triple Decker' : 'Decker') : 'Bed'}</span>
                      </div>
                      <div className="space-y-2">
                        {sortedBeds.map(bed => (
                          <div key={bed.id} className={`p-2 rounded border text-sm ${bed.status === 'occupied' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'}`}>
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{bed.level}</span>
                              {bed.mattressNumber && <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">M: {bed.mattressNumber}</span>}
                            </div>
                            {bed.currentStudentId ? (
                              <div className="mt-1">
                                <div className="font-medium text-green-700 dark:text-green-400 truncate">{bed.studentName}</div>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-xs text-gray-500">{bed.classLevel}</span>
                                  <button onClick={() => unassignStudent(bed.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 flex justify-between items-center">
                                <span className="text-xs text-gray-400">Vacant</span>
                                <div className="flex gap-2">
                                  <button onClick={() => handleAssignClick(bed)} className="text-xs text-primary-600 hover:underline font-medium">Assign</button>
                                  <button onClick={() => deleteBed(bed.id)} className="text-xs text-gray-400 hover:text-red-500">×</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {sortedStructureKeys.length === 0 && (
                  <div className="col-span-full text-center py-10 text-gray-500">
                    No beds configured for this dormitory yet.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <p className="text-lg">Select a dormitory to manage beds</p>
            </div>
          )}
        </div>
      </div>

      {/* Dorm Modal */}
      {showDormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingDorm ? 'Edit' : 'Add'} Dormitory</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input type="text" value={dormForm.name} onChange={(e) => setDormForm({ ...dormForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                <select value={dormForm.gender} onChange={(e) => setDormForm({ ...dormForm, gender: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
                <input type="number" value={dormForm.capacity} onChange={(e) => setDormForm({ ...dormForm, capacity: parseInt(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warden Name</label>
                <input type="text" value={dormForm.wardenName} onChange={(e) => setDormForm({ ...dormForm, wardenName: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warden Phone</label>
                <input type="text" value={dormForm.wardenPhone} onChange={(e) => setDormForm({ ...dormForm, wardenPhone: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDormModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={saveDormitory} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Bed Modal */}
      {showBedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Beds (Bulk)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Number (Structure #)</label>
                <input type="number" value={bedForm.startNumber} onChange={(e) => setBedForm({ ...bedForm, startNumber: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
                <p className="text-xs text-gray-500 mt-1">E.g. If you start at 1, beds will be labeled 1, 2, 3...</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Structures</label>
                <input type="number" value={bedForm.count} onChange={(e) => setBedForm({ ...bedForm, count: parseInt(e.target.value) || 1 })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={bedForm.type} onChange={(e) => setBedForm({ ...bedForm, type: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="single">Single Bed (1 spot)</option>
                  <option value="double">Double Decker (2 spots)</option>
                  <option value="triple">Triple Decker (3 spots)</option>
                </select>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-800 dark:text-blue-300">
                Adding {bedForm.count} structures of type {bedForm.type} will create {parseInt(bedForm.count.toString()) * (bedForm.type === 'single' ? 1 : bedForm.type === 'double' ? 2 : 3)} total bed slots.
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBedModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={saveBeds} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Create Beds</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedBed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assign Student</h3>
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
              <p className="font-medium">Structure #{selectedBed.bedNumber}</p>
              <p className="text-sm text-gray-500">Level: {selectedBed.level}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Student</label>
                <select
                  value={assignForm.studentId}
                  onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">-- Choose Student --</option>
                  {unassignedStudents.filter(s => {
                    if (!selectedDorm) return true;
                    if (selectedDorm.gender === 'mixed') return true;
                    const sGender = s.gender === 'M' || s.gender === 'Male' ? 'male' : 'female';
                    // Basic check, might need robust normalization
                    return sGender.toLowerCase() === selectedDorm.gender.toLowerCase();
                  }).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.classLevel})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mattress Number</label>
                <input
                  type="text"
                  value={assignForm.mattressNumber}
                  onChange={(e) => setAssignForm({ ...assignForm, mattressNumber: e.target.value })}
                  placeholder="e.g. M-101"
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAssignModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={confirmAssign} disabled={!assignForm.studentId} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DormitoryManager;
