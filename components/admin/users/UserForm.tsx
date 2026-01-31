import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../Button';

// We might need to import AdminUser type if we move it to a shared type file. 
// For now, defining local schema compatible with it.

const userSchema = z.object({
    name: z.string().min(2, "Name is required"),
    username: z.string().min(3, "Username is required").regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric only"),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    phone: z.string().optional(),
    role: z.enum(['admin', 'teacher']), // Simplified roles for now
    isSuperAdmin: z.boolean().default(false),
    password: z.string().min(6, "Password must be at least 6 characters").optional(), // Optional for edit
});

export type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
    initialData?: any; // typed as any for flexibility during migration, ideally AdminUser
    onSubmit: (data: UserFormData) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
    isEdit?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({ initialData, onSubmit, onCancel, isLoading, isEdit = false }) => {
    const { register, handleSubmit, formState: { errors }, watch } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            name: initialData?.name || '',
            username: initialData?.username || '',
            email: initialData?.email || '',
            phone: initialData?.phone || '',
            role: initialData?.role || 'teacher',
            isSuperAdmin: initialData?.isSuperAdmin || false,
        },
    });

    const isSuperAdmin = watch('isSuperAdmin');

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                    {...register('name')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input
                    {...register('username')}
                    disabled={isEdit}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border ${isEdit ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}`}
                />
                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input
                        {...register('email')}
                        type="email"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <input
                        {...register('phone')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                    />
                </div>
            </div>

            {!isEdit && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <input
                        {...register('password')}
                        type="password"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                <select
                    {...register('role')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Primary role in the system.</p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <input
                    type="checkbox"
                    {...register('isSuperAdmin')}
                    id="isSuperAdmin"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="isSuperAdmin" className="text-sm font-medium text-gray-900 dark:text-white select-none">
                    Super Administrator Access
                </label>
            </div>
            {isSuperAdmin && (
                <p className="text-xs text-amber-600 dark:text-amber-400 ml-1">
                    ⚠️ Grants full access to all schools and system settings.
                </p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
                </Button>
            </div>
        </form>
    );
};
