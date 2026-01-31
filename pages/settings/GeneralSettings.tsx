import React, { useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { SchoolSettings } from '../../types';
import { Upload, Trash2 } from 'lucide-react';

interface GeneralSettingsProps {
    settings: SchoolSettings;
    onUpdate: (updates: Partial<SchoolSettings>) => void;
    isSaving: boolean;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate, isSaving }) => {
    const { isDark } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const inputClasses = `mt-1 block w-full rounded-xl border px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm transition-all duration-200 ${isDark
            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
            : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
        }`;

    const labelClasses = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                onUpdate({ logoBase64: ev.target?.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>School Profile</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Basic information that appears on report cards and documents.
                </p>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className={labelClasses}>School Name</label>
                        <input
                            type="text"
                            className={inputClasses}
                            value={settings.schoolName}
                            onChange={e => onUpdate({ schoolName: e.target.value.toUpperCase() })}
                            placeholder="e.g. SAINT MARY'S COLLEGE"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className={labelClasses}>Address / P.O Box</label>
                        <input
                            type="text"
                            className={inputClasses}
                            value={settings.addressBox}
                            onChange={e => onUpdate({ addressBox: e.target.value.toUpperCase() })}
                            placeholder="e.g. P.O. BOX 1234, KAMPALA"
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>Contact Phones</label>
                        <input
                            type="text"
                            className={inputClasses}
                            value={settings.contactPhones}
                            onChange={e => onUpdate({ contactPhones: e.target.value })}
                            placeholder="e.g. 0772 123 456"
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>Motto</label>
                        <input
                            type="text"
                            className={inputClasses}
                            value={settings.motto}
                            onChange={e => onUpdate({ motto: e.target.value.toUpperCase() })}
                            placeholder="e.g. EDUCATION FOR EXCELLENCE"
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>Registration Number</label>
                        <input
                            type="text"
                            className={inputClasses}
                            value={settings.regNumber}
                            onChange={e => onUpdate({ regNumber: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>Centre Number</label>
                        <input
                            type="text"
                            className={inputClasses}
                            value={settings.centreNumber}
                            onChange={e => onUpdate({ centreNumber: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Branding</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Upload your school badge or logo.
                </p>

                <div className="flex items-start gap-8">
                    <div className={`flex-shrink-0 h-32 w-32 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        {settings.logoBase64 ? (
                            <img src={settings.logoBase64} alt="Logo" className="h-full w-full object-contain p-2" />
                        ) : (
                            <SchoolSettingsIcon className={`w-12 h-12 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleLogoUpload}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark
                                        ? 'bg-primary-600 hover:bg-primary-500 text-white'
                                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                                    }`}
                            >
                                <Upload className="w-4 h-4" />
                                Upload New Logo
                            </button>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Recommended size: 200x200px. formats: PNG, JPG.
                            </p>
                        </div>

                        {settings.logoBase64 && (
                            <button
                                type="button"
                                onClick={() => onUpdate({ logoBase64: undefined })}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-danger-200 text-danger-600 hover:bg-danger-50 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Remove Logo
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {/* 
      <div className="flex justify-end pt-4">
          Unsaved changes alert and save button are handled in parent layout usually, 
          but here passing isSaving props might be needed if we want local save buttons.
          For now adhering to current design where save is global.
      </div> */}
        </div>
    );
};

// Placeholder icon if needed
const SchoolSettingsIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);
