import { Router } from "express";
import { SickbayService } from "../services/SickbayService";
import { insertMedicalRecordSchema, insertSickbayVisitSchema, insertSickbayInventorySchema, insertSickbayInventoryTransactionSchema } from "../../shared/schema";

const router = Router();

// Middleware to ensure user has appropriate role for modifying sickbay data
// Currently we assume the generic auth middleware `requireAuth` is used before this route is mounted,
// but we could optionally add stronger role checks here for 'School Nurse' or 'Admin'.
// The application mounts this route with `requireStaff` in `routes.ts`, meaning general staff can view, 
// but we'll add extra safety checks for writes if needed.

// --- Medical Records ---

router.get("/records/student/:studentId", async (req, res, next) => {
    try {
        const studentId = parseInt(req.params.studentId);
        if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });
        const record = await SickbayService.getMedicalRecordByStudent(studentId);
        res.json(record || {}); // Return empty object if no record to simplify frontend
    } catch (err) {
        next(err);
    }
});

router.get("/records/staff/:userSchoolId", async (req, res, next) => {
    try {
        const userSchoolId = parseInt(req.params.userSchoolId);
        if (isNaN(userSchoolId)) return res.status(400).json({ message: "Invalid staff ID" });
        const record = await SickbayService.getMedicalRecordByStaff(userSchoolId);
        res.json(record || {});
    } catch (err) {
        next(err);
    }
});

router.post("/records", async (req, res, next) => {
    try {
        const result = insertMedicalRecordSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ message: "Invalid medical record data", errors: result.error.format() });
        }
        const record = await SickbayService.upsertMedicalRecord(result.data);
        res.json(record);
    } catch (err) {
        next(err);
    }
});

// --- Visits ---

router.get("/visits", async (req, res, next) => {
    try {
        const schoolId = req.user?.activeSchoolId;
        if (!schoolId) return res.status(400).json({ message: "School context missing" });

        const limit = parseInt(req.query.limit as string) || 50;
        const visits = await SickbayService.getVisitsBySchool(schoolId, limit);
        res.json(visits);
    } catch (err) {
        next(err);
    }
});

router.get("/visits/patient/:patientId", async (req, res, next) => {
    try {
        const patientId = parseInt(req.params.patientId);
        const type = req.query.type as 'student' | 'staff';

        if (isNaN(patientId)) return res.status(400).json({ message: "Invalid patient ID" });
        if (type !== 'student' && type !== 'staff') return res.status(400).json({ message: "Type must be 'student' or 'staff'" });

        const visits = await SickbayService.getVisitsByPatient(patientId, type);
        res.json(visits);
    } catch (err) {
        next(err);
    }
});

router.post("/visits", async (req, res, next) => {
    try {
        const schoolId = req.user?.activeSchoolId;
        if (!schoolId) return res.status(400).json({ message: "School context missing" });

        const visitData = {
            ...req.body,
            schoolId,
            handledByUserId: req.user?.id
        };

        const result = insertSickbayVisitSchema.safeParse(visitData);
        if (!result.success) {
            return res.status(400).json({ message: "Invalid visit data", errors: result.error.format() });
        }

        const visit = await SickbayService.recordVisit(result.data);
        res.status(201).json(visit);
    } catch (err) {
        next(err);
    }
});

router.patch("/visits/:id/status", async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { status, treatmentGiven, medicationPrescribed } = req.body;

        if (isNaN(id)) return res.status(400).json({ message: "Invalid visit ID" });
        if (!status) return res.status(400).json({ message: "Status is required" });

        const updated = await SickbayService.updateVisitStatus(id, status, treatmentGiven, medicationPrescribed);
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// --- Inventory ---

router.get("/inventory", async (req, res, next) => {
    try {
        const schoolId = req.user?.activeSchoolId;
        if (!schoolId) return res.status(400).json({ message: "School context missing" });

        const inventory = await SickbayService.getInventory(schoolId);
        res.json(inventory);
    } catch (err) {
        next(err);
    }
});

router.post("/inventory", async (req, res, next) => {
    try {
        const schoolId = req.user?.activeSchoolId;
        if (!schoolId) return res.status(400).json({ message: "School context missing" });

        const itemData = { ...req.body, schoolId };
        const result = insertSickbayInventorySchema.safeParse(itemData);
        if (!result.success) return res.status(400).json({ message: "Invalid inventory object", errors: result.error.format() });

        const inserted = await SickbayService.addInventoryItem(result.data);
        res.status(201).json(inserted);
    } catch (err) {
        next(err);
    }
});

router.patch("/inventory/:id", async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid item ID" });

        // We do not require full validation here because it's a partial update
        const updated = await SickbayService.updateInventoryItem(id, req.body);
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

router.get("/inventory/transactions", async (req, res, next) => {
    try {
        const schoolId = req.user?.activeSchoolId;
        if (!schoolId) return res.status(400).json({ message: "School context missing" });

        const transactions = await SickbayService.getInventoryTransactions(schoolId);
        res.json(transactions);
    } catch (err) {
        next(err);
    }
});

router.post("/inventory/transactions", async (req, res, next) => {
    try {
        const transactionData = {
            ...req.body,
            recordedByUserId: req.user?.id
        };

        const result = insertSickbayInventoryTransactionSchema.safeParse(transactionData);
        if (!result.success) return res.status(400).json({ message: "Invalid transaction data", errors: result.error.format() });

        const transaction = await SickbayService.recordInventoryTransaction(result.data);
        res.status(201).json(transaction);
    } catch (err) {
        next(err);
    }
});

export default router;
