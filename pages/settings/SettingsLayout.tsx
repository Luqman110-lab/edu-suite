import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import {
    School,
    GraduationCap,
    Calculator,
    Users,
    Shield,
    Database,
    Menu,
    X
} from 'lucide-react';

interface SettingsLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: any) => void;
    userRole?: string;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
    children,
    activeTab,
    onTabChange,
    userRole
}) => {
    const { isDark } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const menuItems = [
        { id: 'general', label: 'General', icon: School, description: 'School profile & branding' },
        { id: 'academic', label: 'Academic', icon: GraduationCap, description: 'Terms & streams' },
        { id: 'grading', label: 'Grading', icon: Calculator, description: 'Grading system' },
        { id: 'reports', label: 'Reports', icon: Database, description: 'Report card configuration' }, // Using Database as placeholder or maybe FileText
        ...(userRole === 'admin' ? [
            { id: 'users', label: 'Users', icon: Users, description: 'Manage access' },
            { id: 'security', label: 'Security', icon: Shield, description: 'Logs & permissions' },
        ] : []),
        { id: 'data', label: 'Data', icon: Database, description: 'Backup & restore' },
    ];

    return (
        <div className={`min-h-[calc(100vh-6rem)] ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <div className={`lg:w-64 flex-shrink-0 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
                    <div className={`rounded-xl border overflow-hidden sticky top-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <h2 className="font-semibold text-lg">Settings</h2>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage system configuration</p>
                        </div>
                        <nav className="p-2 space-y-1">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onTabChange(item.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${isActive
                                                ? isDark
                                                    ? 'bg-primary-900/30 text-primary-400'
                                                    : 'bg-primary-50 text-primary-700'
                                                : isDark
                                                    ? 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                                        <div>
                                            <div className="text-sm font-medium">{item.label}</div>
                                            {/* <div className="text-xs opacity-70">{item.description}</div> */}
                                        </div>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <div className="lg:hidden mb-4">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                            }`}
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        <span className="font-medium">Settings Menu</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="space-y-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
