import React, { useState } from 'react';
import { useTeacherContracts, useTeacherDocuments, useTeacherAppraisals, useTeacherDisciplinaryRecords, useStaffLeave } from '../../hooks/useHR';
import { Icons } from '../../lib/icons';
import { Button } from '../../../../components/Button';
import UIComponents from '../../../../components/UIComponents';

const { Input, Select } = UIComponents;

interface ModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    isDark: boolean;
    onSubmit: (e: React.FormEvent) => void;
    isSubmitting: boolean;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ isOpen, onClose, title, children, isDark, onSubmit, isSubmitting }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`rounded-xl shadow-xl w-full max-w-md ${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden`}>
                <div className={`px-4 py-3 border-b flex justify-between items-center ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                    <button type="button" onClick={onClose} className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Icons.X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={onSubmit}>
                    <div className="p-4 space-y-4">
                        {children}
                    </div>
                    <div className={`px-4 py-3 border-t flex justify-end gap-2 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" loading={isSubmitting}>Save</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const AddContractModal = ({ teacherId, isOpen, onClose, isDark }: any) => {
    const { createContract, isCreating } = useTeacherContracts(teacherId);
    const [formData, setFormData] = useState({
        contractType: 'Full-time',
        startDate: '',
        endDate: '',
        baseSalary: '',
        status: 'Active'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createContract({
                teacherId,
                ...formData,
                baseSalary: formData.baseSalary ? Number(formData.baseSalary) : undefined
            } as any);
            onClose();
        } catch (error) {
            console.error("Failed to add contract", error);
        }
    };

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Contract" isDark={isDark} onSubmit={handleSubmit} isSubmitting={isCreating}>
            <Select
                label="Contract Type"
                value={formData.contractType}
                onChange={e => setFormData({ ...formData, contractType: e.target.value })}
                options={[
                    { value: 'Full-time', label: 'Full-time' },
                    { value: 'Part-time', label: 'Part-time' },
                    { value: 'Contract', label: 'Contract' },
                    { value: 'Temporary', label: 'Temporary' },
                    { value: 'Other', label: 'Other' },
                ]}
            />
            <div className="grid grid-cols-2 gap-4">
                <Input type="date" label="Start Date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                <Input type="date" label="End Date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
            </div>
            <Input type="number" label="Base Salary (UGX)" value={formData.baseSalary} onChange={e => setFormData({ ...formData, baseSalary: e.target.value })} />
            <Select
                label="Status"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Expired', label: 'Expired' },
                    { value: 'Terminated', label: 'Terminated' }
                ]}
            />
        </ModalWrapper>
    );
};

export const UploadDocumentModal = ({ teacherId, isOpen, onClose, isDark }: any) => {
    const { uploadDocument, isUploading } = useTeacherDocuments(teacherId);
    const [formData, setFormData] = useState({
        documentType: 'CV',
        title: '',
        fileUrl: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await uploadDocument({
                teacherId,
                ...formData
            } as any);
            onClose();
        } catch (error) {
            console.error("Failed to upload document", error);
        }
    };

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Upload Document" isDark={isDark} onSubmit={handleSubmit} isSubmitting={isUploading}>
            <Select
                label="Document Type"
                value={formData.documentType}
                onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                options={[
                    { value: 'CV', label: 'CV' },
                    { value: 'National ID', label: 'National ID' },
                    { value: 'Academic Certificate', label: 'Academic Certificate' },
                    { value: 'Teaching License', label: 'Teaching License' },
                    { value: 'Other', label: 'Other' },
                ]}
            />
            <Input label="Document Title" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            <Input label="File URL" required value={formData.fileUrl} onChange={e => setFormData({ ...formData, fileUrl: e.target.value })} placeholder="https://..." />
        </ModalWrapper>
    );
};

export const AddAppraisalModal = ({ teacherId, isOpen, onClose, isDark }: any) => {
    const { createAppraisal, isCreating } = useTeacherAppraisals(teacherId);
    const [formData, setFormData] = useState({
        appraisalDate: '',
        score: '',
        status: 'Draft',
        feedback: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAppraisal({
                teacherId,
                ...formData,
                score: formData.score ? Number(formData.score) : undefined
            } as any);
            onClose();
        } catch (error) {
            console.error("Failed to add appraisal", error);
        }
    };

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Performance Appraisal" isDark={isDark} onSubmit={handleSubmit} isSubmitting={isCreating}>
            <div className="grid grid-cols-2 gap-4">
                <Input type="date" label="Appraisal Date" required value={formData.appraisalDate} onChange={e => setFormData({ ...formData, appraisalDate: e.target.value })} />
                <Input type="number" label="Score (0-100)" min="0" max="100" value={formData.score} onChange={e => setFormData({ ...formData, score: e.target.value })} />
            </div>
            <Select
                label="Status"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                options={[
                    { value: 'Draft', label: 'Draft' },
                    { value: 'Completed', label: 'Completed' },
                    { value: 'Acknowledged', label: 'Acknowledged' }
                ]}
            />
            <Input label="Feedback" required value={formData.feedback} onChange={e => setFormData({ ...formData, feedback: e.target.value })} />
        </ModalWrapper>
    );
};

export const FileReportModal = ({ teacherId, isOpen, onClose, isDark }: any) => {
    const { createRecord, isCreating } = useTeacherDisciplinaryRecords(teacherId);
    const [formData, setFormData] = useState({
        incidentDate: '',
        actionTaken: 'Verbal Warning',
        status: 'Open',
        incidentDescription: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createRecord({
                teacherId,
                ...formData
            } as any);
            onClose();
        } catch (error) {
            console.error("Failed to file report", error);
        }
    };

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="File Disciplinary Report" isDark={isDark} onSubmit={handleSubmit} isSubmitting={isCreating}>
            <Input type="date" label="Incident Date" required value={formData.incidentDate} onChange={e => setFormData({ ...formData, incidentDate: e.target.value })} />
            <Select
                label="Action Taken"
                value={formData.actionTaken}
                onChange={e => setFormData({ ...formData, actionTaken: e.target.value })}
                options={[
                    { value: 'Verbal Warning', label: 'Verbal Warning' },
                    { value: 'Written Warning', label: 'Written Warning' },
                    { value: 'Suspension', label: 'Suspension' },
                    { value: 'Dismissal', label: 'Dismissal' },
                    { value: 'Other', label: 'Other' },
                ]}
            />
            <Select
                label="Status"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                options={[
                    { value: 'Open', label: 'Open' },
                    { value: 'Under Investigation', label: 'Under Investigation' },
                    { value: 'Resolved', label: 'Resolved' }
                ]}
            />
            <Input label="Incident Description" required value={formData.incidentDescription} onChange={e => setFormData({ ...formData, incidentDescription: e.target.value })} />
        </ModalWrapper>
    );
};

export const RequestLeaveModal = ({ teacherId, isOpen, onClose, isDark }: any) => {
    const { createRequest, isCreating } = useStaffLeave(teacherId);
    const [formData, setFormData] = useState({
        leaveType: 'Sick',
        startDate: '',
        endDate: '',
        reason: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createRequest({
                teacherId,
                ...formData,
                status: 'Pending'
            } as any);
            onClose();
        } catch (error) {
            console.error("Failed to request leave", error);
        }
    };

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Request Leave" isDark={isDark} onSubmit={handleSubmit} isSubmitting={isCreating}>
            <Select
                label="Leave Type"
                value={formData.leaveType}
                onChange={e => setFormData({ ...formData, leaveType: e.target.value })}
                options={[
                    { value: 'Sick', label: 'Sick' },
                    { value: 'Maternity', label: 'Maternity' },
                    { value: 'Paternity', label: 'Paternity' },
                    { value: 'Annual', label: 'Annual' },
                    { value: 'Casual', label: 'Casual' },
                    { value: 'Other', label: 'Other' },
                ]}
            />
            <div className="grid grid-cols-2 gap-4">
                <Input type="date" label="Start Date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                <Input type="date" label="End Date" required value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
            </div>
            <Input label="Reason" required value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
        </ModalWrapper>
    );
};
