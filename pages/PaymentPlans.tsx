import React from 'react';
import { Card, Spinner } from '../components/UIComponents';
import { Button } from '../components/Button';
import { Construction } from 'lucide-react';

export default function PaymentPlans() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Payment Plans</h2>
                <Button>
                    Create New Plan
                </Button>
            </div>

            <Card>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Construction className="w-16 h-16 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-bold mb-2">Under Construction</h3>
                    <p className="text-gray-500 max-w-md">
                        The Payment Plans module is currently being implemented. Check back soon for installment management features.
                    </p>
                </div>
            </Card>
        </div>
    );
}
