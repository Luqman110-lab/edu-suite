import { Router } from "express";
import { leaveService } from "../services/LeaveService";
import { dutyRosterService } from "../services/DutyRosterService";
import { contractService } from "../services/ContractService";
import { documentService } from "../services/DocumentService";
import {
  insertStaffLeaveSchema,
  insertDutyRosterSchema,
  insertTeacherContractSchema,
  insertTeacherDocumentSchema
} from "../../shared/schema";

const router = Router();

// ==================== STAFF LEAVE ROUTES ====================

// Get all leave requests for a school
router.get("/leave", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    // Optional teacherId filter
    const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined;

    let leaves;
    if (teacherId) {
      leaves = await leaveService.getTeacherLeaveRequests(schoolId, teacherId);
    } else {
      leaves = await leaveService.getLeaveRequests(schoolId);
    }

    res.json(leaves);
  } catch (error) {
    console.error("Error fetching staff leave:", error);
    res.status(500).json({ message: "Failed to fetch staff leave" });
  }
});

// Create a leave request
router.post("/leave", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    const validatedData = insertStaffLeaveSchema.parse(req.body);
    const leave = await leaveService.createLeaveRequest(schoolId, validatedData);
    res.status(201).json(leave);
  } catch (error) {
    console.error("Error creating leave request:", error);
    res.status(400).json({ message: "Invalid leave request data" });
  }
});

// Update leave status (Approve/Reject)
router.patch("/leave/:id/status", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    // Only admins/headteachers should approve, assuming basic check here
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const leaveId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be Approved or Rejected" });
    }

    const updatedLeave = await leaveService.updateLeaveStatus(leaveId, status as 'Approved' | 'Rejected', userId);
    res.json(updatedLeave);
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({ message: "Failed to update leave status" });
  }
});

// ==================== DUTY ROSTER ROUTES ====================

// Get all duty rosters for a school
router.get("/duty-roster", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    // Optional teacherId filter
    const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined;

    let rosters;
    if (teacherId) {
      rosters = await dutyRosterService.getTeacherDutyRosters(schoolId, teacherId);
    } else {
      rosters = await dutyRosterService.getDutyRosters(schoolId);
    }

    res.json(rosters);
  } catch (error) {
    console.error("Error fetching duty rosters:", error);
    res.status(500).json({ message: "Failed to fetch duty rosters" });
  }
});

// Create a duty roster assignment
router.post("/duty-roster", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    const validatedData = insertDutyRosterSchema.parse(req.body);
    const roster = await dutyRosterService.createDutyRoster(schoolId, validatedData);
    res.status(201).json(roster);
  } catch (error) {
    console.error("Error creating duty roster:", error);
    res.status(400).json({ message: "Invalid duty roster data" });
  }
});

// Delete a duty roster assignment
router.delete("/duty-roster/:id", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    const rosterId = parseInt(req.params.id);
    await dutyRosterService.deleteDutyRoster(rosterId, schoolId);

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting duty roster:", error);
    res.status(500).json({ message: "Failed to delete duty roster" });
  }
});

// ==================== CONTRACT ROUTES ====================

router.get("/contracts", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined;

    let contracts;
    if (teacherId) {
      contracts = await contractService.getTeacherContracts(schoolId, teacherId);
    } else {
      contracts = await contractService.getContracts(schoolId);
    }
    res.json(contracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ message: "Failed to fetch contracts" });
  }
});

router.post("/contracts", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    const validatedData = insertTeacherContractSchema.parse(req.body);
    const contract = await contractService.createContract(schoolId, validatedData);
    res.status(201).json(contract);
  } catch (error) {
    console.error("Error creating contract:", error);
    res.status(400).json({ message: "Invalid contract data" });
  }
});

router.patch("/contracts/:id/status", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    const contractId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['Active', 'Expired', 'Terminated'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await contractService.updateContractStatus(contractId, schoolId, status as any);
    res.json(updated);
  } catch (error) {
    console.error("Error updating contract status:", error);
    res.status(500).json({ message: "Failed to update contract status" });
  }
});

// ==================== DOCUMENT ROUTES ====================

router.get("/documents", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string) : undefined;

    let docs;
    if (teacherId) {
      docs = await documentService.getTeacherDocuments(schoolId, teacherId);
    } else {
      docs = await documentService.getDocuments(schoolId);
    }
    res.json(docs);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

router.post("/documents", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    const validatedData = insertTeacherDocumentSchema.parse(req.body);
    const doc = await documentService.createDocument(schoolId, validatedData);
    res.status(201).json(doc);
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(400).json({ message: "Invalid document data" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

    const docId = parseInt(req.params.id);
    await documentService.deleteDocument(docId, schoolId);

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ message: "Failed to delete document" });
  }
});

export default router;
