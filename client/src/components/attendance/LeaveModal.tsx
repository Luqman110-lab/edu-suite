import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Button } from '../../../../components/Button';

interface LeaveModalProps {
    teacherId: number | null;
    onClose: () => void;
    onSave: () => void;
    leaveType: string;
    setLeaveType: (type: string) => void;
    leaveNotes: string;
    setLeaveNotes: (notes: string) => void;
}

export const LeaveModal: React.FC<LeaveModalProps> = ({
    teacherId,
    onClose,
    onSave,
    leaveType,
    setLeaveType,
    leaveNotes,
    setLeaveNotes
}) => {
    const { isDark } = useTheme();

    if (!teacherId) return null;

    const leaveTypes = ['sick', 'personal', 'official', 'emergency', 'annual'];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-md w-full p-6`}>
                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Mark Leave</h2>
                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Leave Type</label>
                        <select
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        >
                            {leaveTypes.map(type => (
                                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                        <textarea
                            value={leaveNotes}
                            onChange={(e) => setLeaveNotes(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                            rows={3}
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={onSave}>Save</Button>
                </div>
            </div>
        </div>
    );
};
