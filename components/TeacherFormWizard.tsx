import React, { useState, useRef, useEffect } from 'react';
import { Teacher, ClassLevel, Gender, ALL_SUBJECTS, SchoolSettings } from '../types';
import { useClassNames } from '../hooks/use-class-names';

// ============ ICONS ============
const Icons = {
    Camera: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
    ),
    Upload: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
    ),
    X: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
    ),
    Check: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12" /></svg>
    ),
    User: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    ),
    Briefcase: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
    ),
    Award: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>
    ),
    FileCheck: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" /></svg>
    ),
    ChevronLeft: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6" /></svg>
    ),
    ChevronRight: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6" /></svg>
    ),
    Trash: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
    ),
};

const ROLES = ['Class Teacher', 'Subject Teacher', 'Headteacher', 'DOS', 'School Nurse', 'Medical Officer'];

const STEPS = [
    { id: 1, title: 'Basic Info', icon: Icons.User },
    { id: 2, title: 'Professional', icon: Icons.Briefcase },
    { id: 3, title: 'Roles & Assignments', icon: Icons.Award },
    { id: 4, title: 'Review', icon: Icons.FileCheck },
];

// ============ WEBCAM CAPTURE ============
interface WebcamCaptureProps {
    onCapture: (photoData: string) => void;
    onClose: () => void;
    isDark: boolean;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onClose, isDark }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: 640, height: 480 }
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                setError('Unable to access camera. Please ensure camera permissions are granted.');
            }
        };
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                ctx.drawImage(videoRef.current, 0, 0);
                const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8);
                onCapture(photoData);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl`}>
                <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Take Photo</h3>
                    <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    {error ? (
                        <div className="text-red-500 text-center py-8">{error}</div>
                    ) : (
                        <>
                            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                <div className="absolute inset-0 border-4 border-white/30 rounded-xl pointer-events-none" />
                            </div>
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={onClose}
                                    className={`flex-1 px-4 py-3 rounded-xl font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={capturePhoto}
                                    className="flex-1 px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white hover:opacity-90 flex items-center justify-center gap-2"
                                >
                                    <Icons.Camera className="w-5 h-5" /> Capture
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============ MAIN WIZARD ============
interface TeacherFormWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (teacher: Teacher) => Promise<void>;
    initialData?: Partial<Teacher>;
    isEdit?: boolean;
    settings: SchoolSettings | null;
    isDark: boolean;
}

export const TeacherFormWizard: React.FC<TeacherFormWizardProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isEdit = false,
    settings,
    isDark,
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showWebcam, setShowWebcam] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newTeachingClass, setNewTeachingClass] = useState('');
    const { getDisplayName, getAllClasses } = useClassNames();

    const [formData, setFormData] = useState<Partial<Teacher>>({
        employeeId: '',
        name: '',
        gender: Gender.Male,
        phone: '',
        email: '',
        roles: [],
        assignedClass: undefined,
        assignedStream: undefined,
        subjects: [],
        teachingClasses: [],
        qualifications: '',
        dateJoined: '',
        initials: '',
        isActive: true,
        photoBase64: undefined,
        photoUrl: undefined,

        // HR Phase 1 Defaults
        dateOfBirth: '',
        nationalId: '',
        religion: '',
        maritalStatus: '',
        homeAddress: '',
        districtOfOrigin: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        teachingRegNumber: '',
        bankName: '',
        bankAccountNumber: '',
        bankBranch: '',
        nssfNumber: '',
        tinNumber: '',
        specialization: '',
        educationHistory: [],

        ...initialData,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({ ...formData, ...initialData });
        }
    }, [initialData]);

    const updateField = <K extends keyof Teacher>(field: K, value: Teacher[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayItem = (field: 'roles' | 'subjects' | 'teachingClasses', item: string) => {
        const arr = formData[field] || [];
        if (arr.includes(item)) {
            updateField(field, arr.filter(i => i !== item) as any);
        } else {
            updateField(field, [...arr, item] as any);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                updateField('photoBase64', event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleWebcamCapture = (photoData: string) => {
        updateField('photoBase64', photoData);
        setShowWebcam(false);
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                return !!(formData.name?.trim() && formData.employeeId?.trim());
            case 2:
                return true; // Professional details are optional
            case 3:
                return formData.roles!.length > 0;
            case 4:
                return true;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(currentStep) && currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep(3)) return;
        setIsSubmitting(true);
        try {
            await onSubmit(formData as Teacher);
            onClose();
        } catch (error) {
            console.error('Error saving teacher:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const inputClasses = `block w-full rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'} px-3 py-2.5 shadow-sm focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/30 focus:outline-none text-sm transition-all`;
    const labelClasses = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`;

    const availableStreams = formData.assignedClass && settings ? (settings.streams[formData.assignedClass] || []) : [];
    const teachingClassStreams = newTeachingClass && settings ? (settings.streams[newTeachingClass] || []) : [];

    // ============ STEP COMPONENTS ============
    const renderStep1 = () => (
        <div className="space-y-6">
            {/* Photo Section */}
            <div className="flex flex-col items-center mb-6">
                <div className={`relative w-32 h-32 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'} overflow-hidden border-4 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    {formData.photoBase64 ? (
                        <img src={formData.photoBase64} alt="Teacher" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Icons.User className={`w-16 h-16 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        </div>
                    )}
                    {formData.photoBase64 && (
                        <button
                            onClick={() => updateField('photoBase64', undefined)}
                            className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow"
                        >
                            <Icons.Trash className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <div className="flex gap-2 mt-4">
                    <button
                        type="button"
                        onClick={() => setShowWebcam(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        <Icons.Camera className="w-4 h-4" /> Take Photo
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        <Icons.Upload className="w-4 h-4" /> Upload
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClasses}>Full Name *</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.name || ''}
                        onChange={e => updateField('name', e.target.value.toUpperCase())}
                        placeholder="e.g. MR. JOHN OKELLO"
                    />
                </div>
                <div>
                    <label className={labelClasses}>Employee ID *</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.employeeId || ''}
                        onChange={e => updateField('employeeId', e.target.value.toUpperCase())}
                        placeholder="e.g. T001"
                    />
                </div>
                <div>
                    <label className={labelClasses}>Initials</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.initials || ''}
                        onChange={e => updateField('initials', e.target.value.toUpperCase())}
                        placeholder="e.g. JO"
                        maxLength={3}
                    />
                </div>
                <div>
                    <label className={labelClasses}>Gender</label>
                    <select
                        className={inputClasses}
                        value={formData.gender}
                        onChange={e => updateField('gender', e.target.value as Gender)}
                    >
                        <option value={Gender.Male}>Male</option>
                        <option value={Gender.Female}>Female</option>
                    </select>
                </div>
                <div>
                    <label className={labelClasses}>Date of Birth</label>
                    <input
                        type="date"
                        className={inputClasses}
                        value={formData.dateOfBirth || ''}
                        onChange={e => updateField('dateOfBirth', e.target.value)}
                    />
                </div>
                <div>
                    <label className={labelClasses}>National ID (NIN)</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.nationalId || ''}
                        onChange={e => updateField('nationalId', e.target.value.toUpperCase())}
                        placeholder="e.g. CM90..."
                    />
                </div>
                <div>
                    <label className={labelClasses}>Religion</label>
                    <select
                        className={inputClasses}
                        value={formData.religion || ''}
                        onChange={e => updateField('religion', e.target.value)}
                    >
                        <option value="">Select Religion</option>
                        <option value="Catholic">Catholic</option>
                        <option value="Anglican">Anglican / Protestant</option>
                        <option value="Muslim">Muslim</option>
                        <option value="Born Again">Born Again</option>
                        <option value="SDA">SDA</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label className={labelClasses}>Marital Status</label>
                    <select
                        className={inputClasses}
                        value={formData.maritalStatus || ''}
                        onChange={e => updateField('maritalStatus', e.target.value)}
                    >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className={labelClasses}>Home Address</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.homeAddress || ''}
                        onChange={e => updateField('homeAddress', e.target.value)}
                        placeholder="e.g. Nansana, Wakiso"
                    />
                </div>
                <div>
                    <label className={labelClasses}>District of Origin</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.districtOfOrigin || ''}
                        onChange={e => updateField('districtOfOrigin', e.target.value)}
                        placeholder="e.g. Masaka"
                    />
                </div>

                <div className="md:col-span-2 mt-4 mb-2">
                    <h4 className={`text-sm font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Emergency Contact</h4>
                </div>
                <div>
                    <label className={labelClasses}>Contact Name</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.emergencyContactName || ''}
                        onChange={e => updateField('emergencyContactName', e.target.value)}
                        placeholder="e.g. Sarah Okello"
                    />
                </div>
                <div>
                    <label className={labelClasses}>Contact Phone</label>
                    <input
                        type="tel"
                        className={inputClasses}
                        value={formData.emergencyContactPhone || ''}
                        onChange={e => updateField('emergencyContactPhone', e.target.value)}
                        placeholder="e.g. 0770 000 000"
                    />
                </div>
                <div>
                    <label className={labelClasses}>Relationship</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.emergencyContactRelationship || ''}
                        onChange={e => updateField('emergencyContactRelationship', e.target.value)}
                        placeholder="e.g. Spouse / Sibling"
                    />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClasses}>Phone Number</label>
                    <input
                        type="tel"
                        className={inputClasses}
                        value={formData.phone || ''}
                        onChange={e => updateField('phone', e.target.value)}
                        placeholder="e.g. 0700 000 000"
                    />
                </div>
                <div>
                    <label className={labelClasses}>Email Address</label>
                    <input
                        type="email"
                        className={inputClasses}
                        value={formData.email || ''}
                        onChange={e => updateField('email', e.target.value)}
                        placeholder="teacher@school.com"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClasses}>General Qualifications</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.qualifications || ''}
                        onChange={e => updateField('qualifications', e.target.value)}
                        placeholder="e.g. B.Ed, Diploma in Education"
                    />
                </div>
                <div>
                    <label className={labelClasses}>Specialization</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.specialization || ''}
                        onChange={e => updateField('specialization', e.target.value)}
                        placeholder="e.g. Special Needs, Early Childhood"
                    />
                </div>
                <div>
                    <label className={labelClasses}>Primary Teaching Reg No. (TSC)</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.teachingRegNumber || ''}
                        onChange={e => updateField('teachingRegNumber', e.target.value)}
                        placeholder="e.g. GT/20... or V/..."
                    />
                </div>
                <div>
                    <label className={labelClasses}>Date Joined</label>
                    <input
                        type="date"
                        className={inputClasses}
                        value={formData.dateJoined || ''}
                        onChange={e => updateField('dateJoined', e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 pt-7">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive !== false}
                        onChange={e => updateField('isActive', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#7B1113] focus:ring-[#7B1113] cursor-pointer"
                    />
                    <label htmlFor="isActive" className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} cursor-pointer`}>
                        Active Employee
                    </label>
                </div>

                <div className="md:col-span-2 mt-4 mb-2">
                    <h4 className={`text-sm font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Financial & Compliance</h4>
                </div>
                <div>
                    <label className={labelClasses}>Bank Name</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.bankName || ''}
                        onChange={e => updateField('bankName', e.target.value)}
                        placeholder="e.g. Centenary Bank"
                    />
                </div>
                <div>
                    <label className={labelClasses}>Account Number</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.bankAccountNumber || ''}
                        onChange={e => updateField('bankAccountNumber', e.target.value)}
                        placeholder="e.g. 31000..."
                    />
                </div>
                <div>
                    <label className={labelClasses}>Bank Branch</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.bankBranch || ''}
                        onChange={e => updateField('bankBranch', e.target.value)}
                        placeholder="e.g. Kampala Road"
                    />
                </div>
                <div>
                    <label className={labelClasses}>NSSF Number</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.nssfNumber || ''}
                        onChange={e => updateField('nssfNumber', e.target.value)}
                        placeholder="e.g...."
                    />
                </div>
                <div>
                    <label className={labelClasses}>TIN Number</label>
                    <input
                        type="text"
                        className={inputClasses}
                        value={formData.tinNumber || ''}
                        onChange={e => updateField('tinNumber', e.target.value)}
                        placeholder="e.g. 10..."
                    />
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            {/* Roles Selection */}
            <div className={`${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} p-4 rounded-xl border`}>
                <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} uppercase mb-4`}>Select Roles *</h3>
                <div className="flex flex-wrap gap-3">
                    {ROLES.map(role => (
                        <label
                            key={role}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${formData.roles?.includes(role)
                                ? 'bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white border-transparent shadow-lg'
                                : isDark
                                    ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-[#7B1113]'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-[#7B1113]'
                                }`}
                        >
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={formData.roles?.includes(role)}
                                onChange={() => toggleArrayItem('roles', role)}
                            />
                            <span className="font-medium">{role}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Class Teacher Assignment */}
            {formData.roles?.includes('Class Teacher') && (
                <div className={`${isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'} p-4 rounded-xl border`}>
                    <h3 className={`text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-800'} uppercase mb-4`}>Class Teacher Assignment</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Class *</label>
                            <select
                                className={inputClasses}
                                value={formData.assignedClass || ''}
                                onChange={e => {
                                    updateField('assignedClass', e.target.value as ClassLevel || undefined);
                                    updateField('assignedStream', undefined);
                                }}
                            >
                                <option value="">Select Class</option>
                                {getAllClasses().map(({ level, displayName }) => (
                                    <option key={level} value={level}>{displayName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>Stream *</label>
                            <select
                                className={inputClasses}
                                value={formData.assignedStream || ''}
                                onChange={e => updateField('assignedStream', e.target.value || undefined)}
                                disabled={!formData.assignedClass}
                            >
                                <option value="">Select Stream</option>
                                {availableStreams.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Subject Teacher Assignment */}
            {formData.roles?.includes('Subject Teacher') && (
                <div className={`${isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'} p-4 rounded-xl border`}>
                    <h3 className={`text-sm font-semibold ${isDark ? 'text-green-300' : 'text-green-800'} uppercase mb-4`}>Subject Teaching Assignment</h3>

                    {/* Subjects */}
                    <div className="mb-4">
                        <label className={labelClasses}>Subjects</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {ALL_SUBJECTS.map(sub => (
                                <label
                                    key={sub}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${formData.subjects?.includes(sub)
                                        ? 'bg-green-600 text-white border-transparent'
                                        : isDark
                                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-green-500'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={formData.subjects?.includes(sub)}
                                        onChange={() => toggleArrayItem('subjects', sub)}
                                    />
                                    {sub}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Teaching Classes */}
                    <div>
                        <label className={labelClasses}>Teaching Classes (Class-Stream)</label>
                        <div className="flex flex-wrap gap-2 mt-2 mb-3">
                            {(formData.teachingClasses || []).map(tc => (
                                <span
                                    key={tc}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    {tc}
                                    <button onClick={() => toggleArrayItem('teachingClasses', tc)} className="hover:text-red-500">
                                        <Icons.X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <select
                                className={`${inputClasses} flex-1`}
                                value={newTeachingClass}
                                onChange={e => setNewTeachingClass(e.target.value)}
                            >
                                <option value="">Select Class</option>
                                {getAllClasses().map(({ level, displayName }) => (
                                    <option key={level} value={level}>{displayName}</option>
                                ))}
                            </select>
                            {newTeachingClass && (
                                <select
                                    className={`${inputClasses} flex-1`}
                                    onChange={e => {
                                        if (e.target.value) {
                                            const combo = `${newTeachingClass}-${e.target.value}`;
                                            if (!formData.teachingClasses?.includes(combo)) {
                                                toggleArrayItem('teachingClasses', combo);
                                            }
                                            setNewTeachingClass('');
                                        }
                                    }}
                                >
                                    <option value="">Select Stream</option>
                                    {teachingClassStreams.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <div className={`${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} p-6 rounded-xl border`}>
                <div className="flex items-center gap-4 mb-6">
                    {formData.photoBase64 ? (
                        <img src={formData.photoBase64} alt="Teacher" className="w-20 h-20 rounded-full object-cover border-4 border-[#7B1113]" />
                    ) : (
                        <div className={`w-20 h-20 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                            <Icons.User className={`w-10 h-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        </div>
                    )}
                    <div>
                        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.name || 'No Name'}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formData.employeeId}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.roles?.map(role => (
                                <span key={role} className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white text-xs font-medium">
                                    {role}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gender:</span>
                        <span className={`ml-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {formData.gender === 'M' ? 'Male' : 'Female'}
                        </span>
                    </div>
                    <div>
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Initials:</span>
                        <span className={`ml-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.initials || '—'}</span>
                    </div>
                    <div>
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Phone:</span>
                        <span className={`ml-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.phone || '—'}</span>
                    </div>
                    <div>
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Email:</span>
                        <span className={`ml-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.email || '—'}</span>
                    </div>
                    <div className="col-span-2">
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Qualifications:</span>
                        <span className={`ml-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.qualifications || '—'}</span>
                    </div>
                    <div>
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date Joined:</span>
                        <span className={`ml-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.dateJoined || '—'}</span>
                    </div>
                    <div>
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status:</span>
                        <span className={`ml-2 font-medium ${formData.isActive !== false ? 'text-green-500' : 'text-red-500'}`}>
                            {formData.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                {formData.roles?.includes('Class Teacher') && (
                    <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
                        <span className={`text-xs uppercase font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Class Teacher:</span>
                        <span className={`ml-2 font-bold ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>
                            {getDisplayName(formData.assignedClass!)} {formData.assignedStream}
                        </span>
                    </div>
                )}

                {formData.roles?.includes('Subject Teacher') && (formData.subjects?.length || formData.teachingClasses?.length) && (
                    <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                        <div className="mb-2">
                            <span className={`text-xs uppercase font-semibold ${isDark ? 'text-green-300' : 'text-green-700'}`}>Subjects:</span>
                            <span className={`ml-2 ${isDark ? 'text-green-200' : 'text-green-900'}`}>
                                {formData.subjects?.join(', ') || 'None'}
                            </span>
                        </div>
                        <div>
                            <span className={`text-xs uppercase font-semibold ${isDark ? 'text-green-300' : 'text-green-700'}`}>Classes:</span>
                            <span className={`ml-2 ${isDark ? 'text-green-200' : 'text-green-900'}`}>
                                {formData.teachingClasses?.join(', ') || 'None'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {showWebcam && (
                <WebcamCapture onCapture={handleWebcamCapture} onClose={() => setShowWebcam(false)} isDark={isDark} />
            )}
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden`}>
                    {/* Header */}
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center shrink-0`}>
                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {isEdit ? 'Edit Teacher' : 'Add New Teacher'}
                        </h2>
                        <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                            <Icons.X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </button>
                    </div>

                    {/* Steps Indicator */}
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} shrink-0`}>
                        <div className="flex justify-between">
                            {STEPS.map((step, idx) => (
                                <div key={step.id} className="flex items-center">
                                    <button
                                        onClick={() => validateStep(currentStep) && setCurrentStep(step.id)}
                                        className={`flex items-center gap-2 ${currentStep === step.id
                                            ? 'text-[#7B1113]'
                                            : currentStep > step.id
                                                ? isDark ? 'text-green-400' : 'text-green-600'
                                                : isDark ? 'text-gray-500' : 'text-gray-400'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === step.id
                                            ? 'bg-[#7B1113] text-white'
                                            : currentStep > step.id
                                                ? 'bg-green-500 text-white'
                                                : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {currentStep > step.id ? <Icons.Check className="w-4 h-4" /> : step.id}
                                        </div>
                                        <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                                    </button>
                                    {idx < STEPS.length - 1 && (
                                        <div className={`w-8 sm:w-12 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-500' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderStep3()}
                        {currentStep === 4 && renderStep4()}
                    </div>

                    {/* Footer */}
                    <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-between shrink-0`}>
                        <button
                            onClick={currentStep === 1 ? onClose : prevStep}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <Icons.ChevronLeft className="w-4 h-4" />
                            {currentStep === 1 ? 'Cancel' : 'Back'}
                        </button>

                        {currentStep < 4 ? (
                            <button
                                onClick={nextStep}
                                disabled={!validateStep(currentStep)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next <Icons.ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-green-600 to-green-700 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Saving...' : (
                                    <>
                                        <Icons.Check className="w-4 h-4" /> {isEdit ? 'Update Teacher' : 'Add Teacher'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TeacherFormWizard;
