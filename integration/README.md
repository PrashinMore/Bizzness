# Integration Documentation

This folder contains API integration documentation for the Bizzness application. All markdown documentation files related to API integration, frontend-backend communication, and external integrations are stored here.

## Documentation Files

### 1. Add Expense API
**File:** `add-expense-api.md`

Comprehensive documentation for the Add New Expense API endpoint, including:
- API endpoint details and authentication
- Request/response formats
- Frontend integration implementation
- Backend implementation details
- Usage examples and error handling
- Testing guidelines

**Related Files:**
- Frontend: `webFe/src/app/expenses/new/page.tsx`
- Backend: `be/src/expenses/expenses.controller.ts`
- API Client: `webFe/src/lib/api-client.ts`

### 2. Table Management API (Mobile)
**File:** `table_api_mobile_docs.md`

Complete API documentation for table management functionality for mobile app integration, including:
- Table status management
- Order assignment to tables
- Table operations (create, update, delete, merge)
- Workflow examples
- Mobile app integration patterns

### 3. Invoice Flow
**File:** `invoice-flow.md`

Technical implementation guide for the Invoice Module, including:
- Database schema design
- Invoice numbering algorithm
- PDF generation
- Backend API design
- Frontend implementation
- Storage and security considerations

## Adding New Documentation

When creating new API integration documentation:

1. **File Naming:** Use kebab-case (e.g., `api-name-integration.md`)
2. **Structure:** Follow the template used in `add-expense-api.md`:
   - Overview
   - Base URL and Authentication
   - API Endpoint details
   - Frontend Integration
   - Backend Implementation
   - Usage Examples
   - Error Handling
   - Testing
   - Related APIs
3. **Update this README** with the new documentation entry

## Documentation Standards

- Include both frontend and backend implementation details
- Provide code examples in TypeScript/JavaScript
- Document all request/response formats
- Include error handling scenarios
- Add testing guidelines
- Reference related files in the codebase

## Related Directories

- **Frontend Code:** `webFe/src/`
- **Backend Code:** `be/src/`
- **API Client:** `webFe/src/lib/api-client.ts`
- **Types:** `webFe/src/types/`

