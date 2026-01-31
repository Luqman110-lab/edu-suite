import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { School } from '../../../types';
import { Button } from '../../Button'; // Assuming this path is correct based on folder structure

const schoolSchema = z.object({
    name: z.string().min(2, "Name is required"),
    code: z.string().min(2, "Code is required").toUpperCase(),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    contactPhones: z.string().optional(),
    addressBox: z.string().optional(),
    motto: z.string().optional(),
    isActive: z.boolean().default(true),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

interface SchoolFormProps {
    initialData?: School | null;
    onSubmit: (data: SchoolFormData) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

export const SchoolForm: React.FC<SchoolFormProps> = ({ initialData, onSubmit, onCancel, isLoading }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<SchoolFormData>({
        resolver: zodResolver(schoolSchema),
        defaultValues: {
            name: initialData?.name || '',
            code: initialData?.code || '',
            email: initialData?.email || '',
            contactPhones: initialData?.contactPhones || '',
            addressBox: initialData?.addressBox || '',
            motto: initialData?.motto || '',
            isActive: initialData?.isActive ?? true,
        },
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">School Name</label>
                <input
                    {...register('name')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code</label>
                    <input
                        {...register('code')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                    />
                    {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Phones</label>
                    <input
                        {...register('contactPhones')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                    {...register('email')}
                    type="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    {...register('isActive')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Status</label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save School'}
                </Button>
            </div>
        </form>
    );
};
