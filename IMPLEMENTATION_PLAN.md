# NeoPay Command Center - Implementation Plan

## Current State Analysis
- ✅ Firebase client and admin SDK configured
- ✅ Basic authentication flow with Google Sign-in
- ✅ Dashboard layout with navigation structure
- ⚠️ Dashboard page is placeholder only
- ❌ No Cloud Functions for transaction operations
- ❌ No transaction management UI
- ❌ No audit logging system
- ❌ No RBAC implementation
- ❌ No PII masking components

## Implementation Phases

### Phase 1: Backend Infrastructure (Cloud Functions)
**Priority: CRITICAL - Must be completed first**

1. **Transaction Management Functions**
   - `approveTransaction`: Atomic approval with audit log
   - `rejectTransaction`: Atomic rejection with audit log
   - `flagTransactionFraud`: Fraud flagging with audit log
   - All functions must use `db.runTransaction` for atomicity
   - All functions must validate admin roles via custom claims

2. **Audit System**
   - Automatic audit log creation on every transaction state change
   - Schema: `txId`, `adminUid`, `action`, `timestamp`, `reason`, `previousState`, `newState`
   - Immutable logs (security rules must prevent updates/deletes)

3. **Security Rules**
   - Firestore rules enforcing read-only from client for transactions
   - RBAC validation in security rules
   - Audit logs must be write-protected

### Phase 2: Frontend Core Components
**Priority: HIGH**

4. **Transaction List Component**
   - Real-time Firestore subscription to transactions
   - Filter by status (PENDING, SUCCESS, REJECTED, FRAUD)
   - Pagination support
   - Loading states
   - Empty states

5. **Transaction Detail Modal**
   - Full transaction details display
   - PII masking by default (phone, email)
   - "Reveal" button with audit logging
   - Action buttons (Approve/Reject/Flag Fraud)
   - Loading states during Cloud Function calls
   - Error handling with user-friendly messages

6. **PII Masking Components**
   - `MaskedPhone`: Shows `***-***-1234`
   - `MaskedEmail`: Shows `j***@example.com`
   - Reveal mechanism with explicit user action
   - Audit log on reveal action

### Phase 3: Dashboard Features
**Priority: MEDIUM**

7. **KPI Summary Cards**
   - Total transactions count
   - Pending count (with alert indicator)
   - Success/Rejected/Fraud counts
   - Real-time updates

8. **Transaction Analytics**
   - Chart showing transaction volume by status
   - Time-based filtering (Today, Week, Month)
   - Transaction amount aggregation

9. **Audit Log Viewer**
   - Searchable/filterable audit history
   - Admin action tracking
   - Timestamp display
   - Reason field display

### Phase 4: Advanced Features
**Priority: LOW**

10. **Bulk Operations**
    - Select multiple pending transactions
    - Bulk approve/reject
    - Confirmation dialog with summary

11. **Export Functionality**
    - Export transactions to CSV
    - Export audit logs
    - Date range filtering

12. **User Management**
    - View admin users
    - Assign roles (requires super-admin)
    - Activity tracking

## Technical Requirements Checklist

### Security
- [ ] All data mutations via Cloud Functions only
- [ ] RBAC implemented with custom claims
- [ ] Audit logging on every state change
- [ ] PII masking by default
- [ ] Reveal actions are logged
- [ ] Firestore security rules prevent client writes
- [ ] Input validation on all Cloud Functions
- [ ] Rate limiting on sensitive operations

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] All functions properly typed
- [ ] Error boundaries for React components
- [ ] Comprehensive error handling
- [ ] Loading states for all async operations
- [ ] Empty states for lists
- [ ] Success/error toast notifications

### Testing
- [ ] Cloud Function unit tests
- [ ] Firestore security rules tests
- [ ] Component integration tests
- [ ] E2E tests for critical flows

## Recommended Implementation Order

1. **Start Here**: Cloud Functions (Phase 1)
   - Without these, the dashboard cannot perform any actions
   - Security foundation must be solid

2. **Next**: Core Components (Phase 2, items 4-6)
   - These enable basic transaction management
   - PII protection is critical for compliance

3. **Then**: Dashboard Features (Phase 3)
   - Enhances operational visibility
   - Improves admin efficiency

4. **Finally**: Advanced Features (Phase 4)
   - Nice-to-have improvements
   - Can be delivered incrementally

## Files to Create

### Cloud Functions (functions/ directory)
- `functions/src/index.ts` - Main exports
- `functions/src/transactions.ts` - Transaction management functions
- `functions/src/audit.ts` - Audit helper functions
- `functions/src/types.ts` - Shared TypeScript types
- `functions/package.json` - Dependencies
- `functions/tsconfig.json` - TypeScript config

### Frontend Components
- `components/transactions/TransactionList.tsx`
- `components/transactions/TransactionCard.tsx`
- `components/transactions/TransactionDetailModal.tsx`
- `components/transactions/TransactionFilters.tsx`
- `components/ui/MaskedPhone.tsx`
- `components/ui/MaskedEmail.tsx`
- `components/dashboard/KPICards.tsx`
- `components/dashboard/TransactionChart.tsx`
- `components/audit/AuditLogViewer.tsx`

### Types
- `types/transaction.ts` - Transaction types
- `types/audit.ts` - Audit log types
- `types/user.ts` - User/admin types

### Hooks
- `hooks/useTransactions.ts` - Transaction data fetching
- `hooks/useTransactionActions.ts` - Cloud Function calls
- `hooks/useAuditLogs.ts` - Audit log fetching

## Risk Mitigation

### Risk 1: Atomic Transaction Failure
**Mitigation**: Use Firestore transactions with retry logic and comprehensive error handling

### Risk 2: Audit Log Skipping
**Mitigation**: Make audit logging mandatory in transaction logic; transaction fails if audit fails

### Risk 3: Unauthorized Access
**Mitigation**: Defense in depth - custom claims validation in functions + Firestore security rules

### Risk 4: PII Exposure
**Mitigation**: Default-masked UI + explicit reveal with logging + security rules preventing unauthorized reads

### Risk 5: Race Conditions
**Mitigation**: Optimistic locking with version fields or timestamps in Firestore transactions

## Next Steps

Choose a starting point:
1. **Option A (Recommended)**: Start with Cloud Functions setup - creates the secure backend foundation
2. **Option B**: Create UI components first (mock data) then implement functions - faster visual progress but requires rework
3. **Option C**: Parallel development - split frontend/backend work if multiple developers

Which approach would you like to take?