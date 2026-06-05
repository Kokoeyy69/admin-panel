"use strict";
/**
 * Audit logging utilities for NeoPay
 * All transaction state changes must be logged atomically
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
exports.validateAdminRole = validateAdminRole;
const admin = __importStar(require("firebase-admin"));
/**
 * Creates an audit log entry atomically within a transaction
 * CRITICAL: This must be called inside a Firestore transaction to ensure atomicity
 *
 * @param transaction - Firestore transaction object
 * @param txId - Transaction ID being modified
 * @param adminUid - UID of admin performing the action
 * @param adminEmail - Email of admin performing the action
 * @param action - Type of action being performed
 * @param previousState - Transaction status before the action
 * @param newState - Transaction status after the action (optional for reveal actions)
 * @param reason - Reason provided by admin
 * @param context - Optional context (IP, user agent)
 */
function createAuditLog(transaction, txId, adminUid, adminEmail, action, previousState, newState, reason, context) {
    const db = admin.firestore();
    const auditLogRef = db.collection('audit_logs').doc();
    const auditLog = {
        txId,
        adminUid,
        adminEmail,
        action,
        timestamp: admin.firestore.Timestamp.now(),
        reason,
        previousState,
        newState,
        ipAddress: context === null || context === void 0 ? void 0 : context.ipAddress,
        userAgent: context === null || context === void 0 ? void 0 : context.userAgent,
    };
    transaction.set(auditLogRef, auditLog);
}
/**
 * Validates that an admin has the required role
 *
 * @param adminUid - UID of admin to validate
 * @param requiredRoles - Array of acceptable roles
 * @returns Promise resolving to admin's email if authorized
 * @throws Error if admin lacks required permissions
 */
async function validateAdminRole(adminUid, requiredRoles) {
    try {
        const userRecord = await admin.auth().getUser(adminUid);
        const customClaims = userRecord.customClaims || {};
        const userRole = customClaims.role;
        if (!userRole || !requiredRoles.includes(userRole)) {
            throw new Error(`Unauthorized: User role '${userRole || 'none'}' is not in [${requiredRoles.join(', ')}]`);
        }
        return userRecord.email || 'unknown@neopay.com';
    }
    catch (error) {
        console.error('Role validation error:', error);
        throw new Error('Authorization failed');
    }
}
//# sourceMappingURL=audit.js.map