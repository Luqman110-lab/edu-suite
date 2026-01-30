import { db } from "../db";
import { mobileMoneyTransactions, feePayments, invoices, planInstallments } from "../../shared/schema";
import { eq } from "drizzle-orm";

interface PaymentRequest {
    phoneNumber: string;
    amount: number;
    provider: 'mtn' | 'airtel';
    reference: string; // Internal reference
    description: string;
    schoolId: number;
    entityType?: 'invoice' | 'plan_installment' | 'general_payment';
    entityId?: number;
    paymentId?: number; // Linked internal payment record if created
}

export class MobileMoneyService {

    // Simulate payment initiation
    static async initiatePayment(request: PaymentRequest) {
        console.log(`[MoMo Service] Initiating ${request.provider.toUpperCase()} payment for ${request.phoneNumber}: ${request.amount} UGX`);

        // Create transaction record
        const [transaction] = await db.insert(mobileMoneyTransactions).values({
            schoolId: request.schoolId,
            paymentId: request.paymentId,
            provider: request.provider,
            phoneNumber: request.phoneNumber,
            amount: request.amount,
            status: 'pending',
            externalReference: `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            description: request.description,
            entityType: request.entityType,
            entityId: request.entityId,
        }).returning();

        // Simulate Async Callback (Mocking the real world delay)
        this.simulateCallback(transaction.id, transaction.externalReference!, request.amount);

        return transaction;
    }

    // Checking status (Polling)
    static async checkStatus(transactionId: number) {
        const transaction = await db.query.mobileMoneyTransactions.findFirst({
            where: eq(mobileMoneyTransactions.id, transactionId)
        });
        return transaction;
    }

    // Internal Simulation of Provider Callback
    private static async simulateCallback(transactionId: number, externalRef: string, amount: number) {
        setTimeout(async () => {
            const success = Math.random() > 0.1; // 90% success rate
            const status = success ? 'success' : 'failed';

            console.log(`[MoMo Mock Callback] Transaction ${externalRef} -> ${status}`);

            await db.update(mobileMoneyTransactions).set({
                status: status,
                callbackReceivedAt: new Date(),
                rawCallbackData: {
                    message: success ? "Transaction successful" : "Insufficient funds (Simulated)",
                    code: success ? "200" : "500"
                }
            }).where(eq(mobileMoneyTransactions.id, transactionId));

            if (success) {
                await this.handleSuccessfulPayment(transactionId);
            }

        }, 5000); // 5 seconds delay
    }

    // Handle business logic after successful payment
    private static async handleSuccessfulPayment(transactionId: number) {
        const transaction = await db.query.mobileMoneyTransactions.findFirst({
            where: eq(mobileMoneyTransactions.id, transactionId)
        });

        if (!transaction) return;

        // 1. If linked to an Invoice -> Update Invoice
        if (transaction.entityType === 'invoice' && transaction.entityId) {
            const invoice = await db.query.invoices.findFirst({
                where: eq(invoices.id, transaction.entityId)
            });
            if (invoice) {
                const newPaid = (invoice.amountPaid || 0) + transaction.amount;
                const newBalance = (invoice.totalAmount || 0) - newPaid;
                await db.update(invoices).set({
                    amountPaid: newPaid,
                    balance: newBalance,
                    status: newBalance <= 0 ? 'paid' : 'partial'
                }).where(eq(invoices.id, invoice.id));
                console.log(`[MoMo] Updated Invoice #${invoice.invoiceNumber}`);
            }
        }

        // 2. If linked to Plan Installment -> Update Installment
        if (transaction.entityType === 'plan_installment' && transaction.entityId) {
            const installment = await db.query.planInstallments.findFirst({
                where: eq(planInstallments.id, transaction.entityId)
            });
            if (installment) {
                const newPaid = (installment.paidAmount || 0) + transaction.amount;
                await db.update(planInstallments).set({
                    paidAmount: newPaid,
                    paidAt: new Date(),
                    status: newPaid >= installment.amount ? 'paid' : 'partial'
                }).where(eq(planInstallments.id, installment.id));
                console.log(`[MoMo] Updated Installment #${installment.installmentNumber}`);
            }
        }

        // 3. Mark the internal Payment record as completed if linked
        if (transaction.paymentId) {
            await db.update(feePayments).set({
                status: 'completed', // Assuming feePayments has a status column or used notes
                notes: `Paid via ${transaction.provider.toUpperCase()} (Ref: ${transaction.externalReference})`
            }).where(eq(feePayments.id, transaction.paymentId));
        }
    }
}
