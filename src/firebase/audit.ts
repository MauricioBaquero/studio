'use client';

import { addDoc, collection, serverTimestamp, Firestore } from 'firebase/firestore';

export interface AuditLogData {
    action: 'create' | 'update' | 'delete' | 'login';
    collectionName: string;
    docId: string;
    user: {
        uid: string;
        name: string;
    };
    timestamp?: any;
    newData?: any;
    previousData?: any;
}

/**
 * Logs an audit trail event to Firestore.
 * This is a non-blocking operation.
 * @param firestore The Firestore instance.
 * @param logData The data for the audit log entry.
 */
export function logAudit(firestore: Firestore, logData: Omit<AuditLogData, 'timestamp'>): void {
    if (!firestore) {
        console.error("Firestore instance is not available for audit logging.");
        return;
    }
    
    const auditLogsCollection = collection(firestore, 'auditLogs');
    const dataToLog = {
        ...logData,
        timestamp: serverTimestamp(),
    };

    // Non-blocking write
    addDoc(auditLogsCollection, dataToLog).catch(error => {
        console.error("Failed to write to audit log:", error);
        // Here we just log the error to the console, as we don't want to
        // interrupt the user's action just because logging failed.
    });
}
