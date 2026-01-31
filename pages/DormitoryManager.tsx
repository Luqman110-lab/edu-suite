import React, { useEffect, useState } from 'react';

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

interface DormRoom {
  id: number;
  dormitoryId: number;
  roomNumber: string;
  capacity: number;
  currentOccupancy: number;
  roomType: string;
  isActive: boolean;
}

interface Bed {
  id: number;
  roomId: number;
  bedNumber: string;
  bedType: string;
  status: string;
  currentStudentId: number | null;
}

interface Student {
  id: number;
  name: string;
  indexNumber: string;
  classLevel: string;
  gender: string;
  boardingStatus: string;
}

export const DormitoryManager: React.FC = () => {
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDorm, setSelectedDorm] = useState<Dormitory | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<DormRoom | null>(null);
  const [showDormModal, setShowDormModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showBedModal, setShowBedModal] = useState(false);
  const [editingDorm, setEditingDorm] = useState<Dormitory | null>(null);
  const [editingRoom, setEditingRoom] = useState<DormRoom | null>(null);
  const [dormForm, setDormForm] = useState({ name: '', gender: 'male', capacity: 0, building: '', floor: '', wardenName: '', wardenPhone: '', description: '' });
  const [roomForm, setRoomForm] = useState({ roomNumber: '', capacity: 4, roomType: 'standard' });
  const [bedForm, setBedForm] = useState({ bedNumber: '', bedType: 'single' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dormsRes, roomsRes, bedsRes, studentsRes] = await Promise.all([
        fetch('/api/dormitories', { credentials: 'include' }),
        fetch('/api/dorm-rooms', { credentials: 'include' }),
        fetch('/api/beds', { credentials: 'include' }),
        fetch('/api/students', { credentials: 'include' }),
      ]);
      if (dormsRes.ok) setDormitories(await dormsRes.json());
      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (bedsRes.ok) setBeds(await bedsRes.json());
      if (studentsRes.ok) {
        const allStudents = await studentsRes.json();
        setStudents(allStudents.filter((s: Student) => s.boardingStatus?.toLowerCase() === 'boarding'));
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

  const saveRoom = async () => {
    if (!selectedDorm) return;
    try {
      const url = editingRoom ? `/api/dorm-rooms/${editingRoom.id}` : '/api/dorm-rooms';
      const method = editingRoom ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...roomForm, dormitoryId: selectedDorm.id }),
      });
      if (res.ok) {
        loadData();
        setShowRoomModal(false);
        setEditingRoom(null);
        setRoomForm({ roomNumber: '', capacity: 4, roomType: 'standard' });
      }
    } catch (err) {
      console.error('Failed to save room:', err);
    }
  };

  const saveBed = async () => {
    if (!selectedRoom) return;
    try {
      const res = await fetch('/api/beds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...bedForm, roomId: selectedRoom.id }),
      });
      if (res.ok) {
        loadData();
        setShowBedModal(false);
        setBedForm({ bedNumber: '', bedType: 'single' });
      }
    } catch (err) {
      console.error('Failed to save bed:', err);
    }
  };

  const assignStudent = async (bedId: number, studentId: number) => {
    try {
      await fetch(`/api/beds/${bedId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to assign student:', err);
    }
  };

  const unassignStudent = async (bedId: number) => {
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

  const deleteRoom = async (id: number) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      await fetch(`/api/dorm-rooms/${id}`, { method: 'DELETE', credentials: 'include' });
      loadData();
      if (selectedRoom?.id === id) setSelectedRoom(null);
    } catch (err) {
      console.error('Failed to delete room:', err);
    }
  };

  const dormRooms = selectedDorm ? rooms.filter(r => r.dormitoryId === selectedDorm.id) : [];
  const roomBeds = selectedRoom ? beds.filter(b => b.roomId === selectedRoom.id) : [];
  const unassignedStudents = students.filter(s => !beds.some(b => b.currentStudentId === s.id));

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
          <p className="text-gray-500 dark:text-gray-400">Manage dormitories, rooms, and bed assignments</p>
        </div>
        <button
          onClick={() => { setShowDormModal(true); setEditingDorm(null); setDormForm({ name: '', gender: 'male', capacity: 0, building: '', floor: '', wardenName: '', wardenPhone: '', description: '' }); }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Dormitory
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dormitories</h2>
          <div className="space-y-2">
            {dormitories.map(dorm => (
              <div
                key={dorm.id}
                onClick={() => { setSelectedDorm(dorm); setSelectedRoom(null); }}
                className={`p-3 rounded-lg cursor-pointer transition-all ${selectedDorm?.id === dorm.id ? 'bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-500' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{dorm.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{dorm.gender} | Capacity: {dorm.capacity}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditingDorm(dorm); setDormForm({ ...dorm, building: dorm.building || '', floor: dorm.floor || '', wardenName: dorm.wardenName || '', wardenPhone: dorm.wardenPhone || '', description: dorm.description || '' }); setShowDormModal(true); }} className="p-1.5 text-gray-500 hover:text-primary-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteDormitory(dorm.id); }} className="p-1.5 text-gray-500 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rooms</h2>
            {selectedDorm && (
              <button onClick={() => { setShowRoomModal(true); setEditingRoom(null); setRoomForm({ roomNumber: '', capacity: 4, roomType: 'standard' }); }} className="text-sm text-primary-600 hover:underline">+ Add Room</button>
            )}
          </div>
          {selectedDorm ? (
            <div className="space-y-2">
              {dormRooms.map(room => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${selectedRoom?.id === room.id ? 'bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-500' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Room {room.roomNumber}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{room.roomType} | {room.currentOccupancy}/{room.capacity} beds</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }} className="p-1.5 text-gray-500 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {dormRooms.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No rooms in this dormitory</p>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Select a dormitory to view rooms</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Beds</h2>
            {selectedRoom && (
              <button onClick={() => setShowBedModal(true)} className="text-sm text-primary-600 hover:underline">+ Add Bed</button>
            )}
          </div>
          {selectedRoom ? (
            <div className="space-y-2">
              {roomBeds.map(bed => {
                const student = students.find(s => s.id === bed.currentStudentId);
                return (
                  <div key={bed.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Bed {bed.bedNumber}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{bed.bedType}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${bed.status === 'occupied' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'}`}>
                        {bed.status}
                      </span>
                    </div>
                    {student ? (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-300">{student.name} ({student.classLevel})</p>
                        <button onClick={() => unassignStudent(bed.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                      </div>
                    ) : (
                      <select
                        className="mt-2 w-full text-sm border rounded-lg px-2 py-1 dark:bg-gray-600 dark:border-gray-500"
                        onChange={(e) => e.target.value && assignStudent(bed.id, parseInt(e.target.value))}
                        defaultValue=""
                      >
                        <option value="">Assign a student...</option>
                        {unassignedStudents.filter(s => {
                          if (!selectedDorm) return false;
                          if (selectedDorm.gender === 'mixed') return true;
                          const studentGender = s.gender === 'M' ? 'male' : 'female';
                          return studentGender === selectedDorm.gender;
                        }).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.classLevel})</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
              {roomBeds.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No beds in this room</p>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Select a room to view beds</p>
          )}
        </div>
      </div>

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

      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingRoom ? 'Edit' : 'Add'} Room</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Number</label>
                <input type="text" value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
                <input type="number" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 4 })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Type</label>
                <select value={roomForm.roomType} onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="standard">Standard</option>
                  <option value="prefect">Prefect</option>
                  <option value="sick_bay">Sick Bay</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRoomModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={saveRoom} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {showBedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Bed</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bed Number</label>
                <input type="text" value={bedForm.bedNumber} onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bed Type</label>
                <select value={bedForm.bedType} onChange={(e) => setBedForm({ ...bedForm, bedType: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="single">Single</option>
                  <option value="bunk_top">Bunk (Top)</option>
                  <option value="bunk_bottom">Bunk (Bottom)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBedModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={saveBed} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DormitoryManager;
