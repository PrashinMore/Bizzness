'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { tablesApi, settingsApi } from '@/lib/api-client';
import { DiningTable, DiningTableWithOrders, TableStatus } from '@/types/table';
import { useRouter } from 'next/navigation';

type CreateTableState = {
  name: string;
  capacity: string;
  area: string;
};

const blankTable: CreateTableState = {
  name: '',
  capacity: '',
  area: '',
};

const statusColors: Record<TableStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-300',
  OCCUPIED: 'bg-red-100 text-red-800 border-red-300',
  RESERVED: 'bg-blue-100 text-blue-800 border-blue-300',
  CLEANING: 'bg-orange-100 text-orange-800 border-orange-300',
  BLOCKED: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusLabels: Record<TableStatus, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  CLEANING: 'Cleaning',
  BLOCKED: 'Blocked',
};

export default function TablesPage() {
  const { user, loading } = useRequireAuth('admin');
  const { token } = useAuth();
  const router = useRouter();

  const [tables, setTables] = useState<DiningTable[]>([]);
  const [tableDetails, setTableDetails] = useState<Map<string, DiningTableWithOrders>>(new Map());
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [tablesEnabled, setTablesEnabled] = useState(false);

  const [createState, setCreateState] = useState<CreateTableState>(blankTable);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editState, setEditState] = useState<CreateTableState>(blankTable);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadSettings();
    loadTables();
  }, [token]);

  const loadSettings = async () => {
    if (!token) return;
    try {
      const settings = await settingsApi.get(token);
      setTablesEnabled(settings.enableTables);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadTables = async () => {
    if (!token) return;
    setFetching(true);
    setError(null);
    try {
      const data = await tablesApi.list(token);
      setTables(data);
      
      // Load active sale details for occupied tables
      const detailsMap = new Map<string, DiningTableWithOrders>();
      for (const table of data) {
        if (table.status === 'OCCUPIED') {
          try {
            const details = await tablesApi.get(token, table.id);
            detailsMap.set(table.id, details);
          } catch (err) {
            // Ignore errors for individual table details
            console.error(`Failed to load details for table ${table.id}:`, err);
          }
        }
      }
      setTableDetails(detailsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
    } finally {
      setFetching(false);
    }
  };

  const handleTableClick = async (table: DiningTable) => {
    if (table.status !== 'OCCUPIED') return;
    
    if (!token) return;
    
    try {
      const activeSale = await tablesApi.getActiveSale(token, table.id);
      if (activeSale) {
        router.push(`/sales/${activeSale.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sale details');
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setCreating(true);
    setError(null);
    try {
      await tablesApi.create(token, {
        name: createState.name.trim(),
        capacity: parseInt(createState.capacity, 10),
        area: createState.area.trim() || undefined,
      });
      setCreateState(blankTable);
      setShowCreateForm(false);
      setStatusMessage('Table created successfully');
      setTimeout(() => setStatusMessage(null), 3000);
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (table: DiningTable) => {
    setEditingTableId(table.id);
    setEditState({
      name: table.name,
      capacity: table.capacity.toString(),
      area: table.area || '',
    });
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editingTableId) return;

    setSaving(true);
    setError(null);
    try {
      await tablesApi.update(token, editingTableId, {
        name: editState.name.trim(),
        capacity: parseInt(editState.capacity, 10),
        area: editState.area.trim() || undefined,
      });
      setEditingTableId(null);
      setEditState(blankTable);
      setStatusMessage('Table updated successfully');
      setTimeout(() => setStatusMessage(null), 3000);
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this table?')) return;

    setError(null);
    try {
      await tablesApi.remove(token, id);
      setStatusMessage('Table deleted successfully');
      setTimeout(() => setStatusMessage(null), 3000);
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table');
    }
  };

  const handleStatusChange = async (id: string, status: TableStatus) => {
    if (!token) return;

    setError(null);
    try {
      await tablesApi.updateStatus(token, id, status);
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table status');
    }
  };

  if (loading || fetching) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!tablesEnabled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Table Management Disabled</h2>
          <p className="text-yellow-700">
            Table management is not enabled for your organization. Please enable it in Settings to use this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tables</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : '+ Add Table'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
          {statusMessage}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Table</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Table Name</label>
              <input
                type="text"
                required
                value={createState.name}
                onChange={(e) => setCreateState({ ...createState, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., T1, Patio-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capacity</label>
              <input
                type="number"
                required
                min="1"
                value={createState.capacity}
                onChange={(e) => setCreateState({ ...createState, capacity: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Number of seats"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Area/Section (Optional)</label>
              <input
                type="text"
                value={createState.area}
                onChange={(e) => setCreateState({ ...createState, area: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Indoor, Outdoor"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Table'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => {
          const details = tableDetails.get(table.id);
          const activeSale = details?.activeOrder;
          const isOccupied = table.status === 'OCCUPIED';
          
          return (
            <div
            key={table.id}
            className={`border-2 rounded-lg p-4 ${statusColors[table.status]} ${isOccupied ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
            onClick={() => isOccupied && handleTableClick(table)}
          >
            {editingTableId === table.id ? (
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editState.name}
                    onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editState.capacity}
                    onChange={(e) => setEditState({ ...editState, capacity: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Area</label>
                  <input
                    type="text"
                    value={editState.area}
                    onChange={(e) => setEditState({ ...editState, area: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTableId(null);
                      setEditState(blankTable);
                    }}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{table.name}</h3>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-white/50">
                    {statusLabels[table.status]}
                  </span>
                </div>
                <div className="text-sm space-y-1 mb-3">
                  <div>Capacity: {table.capacity} seats</div>
                  {table.area && <div>Area: {table.area}</div>}
                  {isOccupied && activeSale && (
                    <div className="font-semibold text-red-700 mt-2">
                      Order Total: ₹{Number(activeSale.totalAmount).toFixed(2)}
                    </div>
                  )}
                  {isOccupied && (
                    <div className="text-xs text-gray-600 mt-1">
                      Click to view order
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(table)}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <select
                    value={table.status}
                    onChange={(e) => handleStatusChange(table.id, e.target.value as TableStatus)}
                    className="border rounded px-2 py-1 text-xs bg-white"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDelete(table.id)}
                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
          );
        })}
      </div>

      {tables.length === 0 && !fetching && (
        <div className="text-center py-12 text-gray-500">
          No tables found. Create your first table to get started.
        </div>
      )}
    </div>
  );
}
