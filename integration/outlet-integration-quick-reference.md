# Outlet Management - Quick Integration Reference

## Backend Implementation Status

✅ **Complete** - All endpoints implemented and tested

### Endpoints Available

- `GET /api/outlets` - List all outlets
- `GET /api/outlets/:id` - Get outlet details
- `POST /api/outlets` - Create outlet
- `PATCH /api/outlets/:id` - Update outlet
- `DELETE /api/outlets/:id` - Delete outlet (soft delete)

### Outlet Context Integration

**Header Required:** `X-Outlet-Id: <outlet_uuid>`

**Applied to:**
- ✅ Sales operations (create, list)
- ✅ Expenses operations (create, list)
- ✅ Reports (filtered by outlet)

**Implementation:**
- Header is extracted in controllers
- Automatically filters data by outlet
- Validates outlet belongs to user's organization

## Frontend Implementation Status

✅ **Complete** - All components and context implemented

### Components Created

1. **OutletProvider** (`webFe/src/contexts/outlet-context.tsx`)
   - Manages selected outlet state
   - Auto-selects outlet on load
   - Persists selection in localStorage

2. **Outlet Management Page** (`webFe/src/app/dashboard/outlets/page.tsx`)
   - Full CRUD interface
   - Create, edit, delete outlets
   - Mark as primary

3. **Outlet Selector** (in SideNav)
   - Dropdown selector when multiple outlets exist
   - Shows current outlet
   - Quick switching

4. **API Client Integration** (`webFe/src/lib/api-client.ts`)
   - `outletsApi` with all CRUD methods
   - Automatic `X-Outlet-Id` header injection
   - Reads from localStorage

## Mobile App Integration

📱 **Ready** - See `outlet-management-mobile-api.md` for complete guide

### Key Points for Mobile

1. **Fetch outlets after login:**
   ```typescript
   GET /api/outlets
   Authorization: Bearer <token>
   ```

2. **Select outlet:**
   - Auto-select if only 1 outlet
   - Show selector if multiple
   - Store selection locally

3. **Include header in requests:**
   ```typescript
   X-Outlet-Id: <selected-outlet-id>
   ```

4. **Outlet-scoped operations:**
   - Sales: `POST /api/sales` (requires header)
   - Expenses: `POST /api/expenses` (requires header)
   - Reports: Filtered by outlet automatically

## Database Migration

📋 **Migration Script:** `be/migrations/003_add_outlets.sql`

**To Apply:**
1. Run the migration SQL script on your database
2. Existing data will be automatically backfilled
3. Default outlets created for existing organizations

## Testing Checklist

- [ ] Create outlet via API
- [ ] List outlets
- [ ] Update outlet
- [ ] Delete outlet (soft delete)
- [ ] Create sale with outlet context
- [ ] List sales filtered by outlet
- [ ] Create expense with outlet context
- [ ] Switch outlets and verify data isolation
- [ ] Test with multiple organizations

## Common Issues & Solutions

### Issue: "X-Outlet-Id header is required"
**Solution:** Ensure outlet is selected and header is included in request

### Issue: "You do not have access to this outlet"
**Solution:** Verify outlet belongs to user's organization

### Issue: Outlet not appearing in list
**Solution:** Check if outlet is active (`isActive: true`)

### Issue: Cannot delete outlet
**Solution:** Ensure it's not the last outlet in the organization

## Next Steps

1. ✅ Run database migration
2. ✅ Test outlet creation
3. ✅ Test outlet selection
4. ✅ Test data isolation
5. ✅ Integrate into mobile app

## Related Documentation

- **Full Mobile API Guide:** `integration/outlet-management-mobile-api.md`
- **Backend Spec:** `SBS/outlet_spec.md`
- **Frontend Implementation:** See outlet context and management page

