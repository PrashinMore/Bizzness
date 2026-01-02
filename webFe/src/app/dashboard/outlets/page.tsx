'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { outletsApi } from '@/lib/api-client';
import type { Outlet } from '@/types/outlet';

interface CreateOutletFormState {
  name: string;
  address: string;
  contactNumber: string;
  isPrimary: boolean;
}

interface EditFormState {
  name: string;
  address: string;
  contactNumber: string;
  isActive: boolean;
  isPrimary: boolean;
}

const initialCreateState: CreateOutletFormState = {
  name: '',
  address: '',
  contactNumber: '',
  isPrimary: false,
};

export default function OutletsManagementPage() {
  const { user, loading } = useRequireAuth('admin');
  const { token } = useAuth();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createState, setCreateState] = useState<CreateOutletFormState>(initialCreateState);
  const [creating, setCreating] = useState(false);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, EditFormState>>({});
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOutlets() {
      if (!token) {
        return;
      }
      setFetching(true);
      setError(null);
      try {
        const data = await outletsApi.list(token);
        setOutlets(data);
        const mapped = Object.fromEntries(
          data.map((outlet) => [
            outlet.id,
            {
              name: outlet.name,
              address: outlet.address || '',
              contactNumber: outlet.contactNumber || '',
              isActive: outlet.isActive,
              isPrimary: outlet.isPrimary,
            },
          ]),
        );
        setEditForms(mapped);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load outlets.');
        }
      } finally {
        setFetching(false);
      }
    }

    if (!loading && user && token) {
      loadOutlets();
    }
  }, [loading, user, token]);

  const handleCreateOutlet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCreating(true);
    setStatusMessage(null);
    setError(null);

    try {
      const created = await outletsApi.create(token, {
        name: createState.name.trim(),
        address: createState.address.trim() || undefined,
        contactNumber: createState.contactNumber.trim() || undefined,
        isPrimary: createState.isPrimary,
      });
      setOutlets((prev) => [...prev, created]);
      setEditForms((prev) => ({
        ...prev,
        [created.id]: {
          name: created.name,
          address: created.address || '',
          contactNumber: created.contactNumber || '',
          isActive: created.isActive,
          isPrimary: created.isPrimary,
        },
      }));
      setCreateState(initialCreateState);
      setStatusMessage(`Outlet ${created.name} created successfully.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to create outlet.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleEditChange = (
    id: string,
    field: keyof EditFormState,
    value: string | boolean,
  ) => {
    setEditForms((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleUpdateOutlet = async (id: string) => {
    if (!token) {
      return;
    }

    const payload = editForms[id];
    if (!payload) {
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setError(null);

    try {
      const updated = await outletsApi.update(token, id, {
        name: payload.name.trim(),
        address: payload.address.trim() || undefined,
        contactNumber: payload.contactNumber.trim() || undefined,
        isActive: payload.isActive,
        isPrimary: payload.isPrimary,
      });
      setOutlets((prev) => prev.map((o) => (o.id === id ? updated : o)));
      setEditForms((prev) => ({
        ...prev,
        [id]: {
          name: updated.name,
          address: updated.address || '',
          contactNumber: updated.contactNumber || '',
          isActive: updated.isActive,
          isPrimary: updated.isPrimary,
        },
      }));
      setSelectedOutletId(null);
      setStatusMessage(`Outlet ${updated.name} updated.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to update outlet.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOutlet = async (id: string) => {
    if (!token) {
      return;
    }

    const target = outlets.find((o) => o.id === id);
    if (!target) return;

    const confirmed = window.confirm(
      `Delete outlet ${target.name}? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await outletsApi.remove(token, id);
      setOutlets((prev) => prev.filter((o) => o.id !== id));
      setStatusMessage(`Outlet ${target.name} removed.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to delete outlet.');
      }
    }
  };

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-700">Loading outlet management…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Outlet Management
          </h1>
          <p className="mt-2 text-sm text-zinc-700">
            Create and manage outlets for your organization.
          </p>
        </header>

        {error && (
          <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="rounded-md border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-600">
            {statusMessage}
          </div>
        )}

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Create a new outlet
          </h2>
          <form
            className="mt-4 grid gap-4 md:grid-cols-2"
            onSubmit={handleCreateOutlet}
          >
            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-zinc-700"
                htmlFor="create-name"
              >
                Outlet Name
              </label>
              <input
                id="create-name"
                required
                value={createState.name}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-zinc-700"
                htmlFor="create-contact"
              >
                Contact Number (optional)
              </label>
              <input
                id="create-contact"
                value={createState.contactNumber}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    contactNumber: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label
                className="block text-sm font-medium text-zinc-700"
                htmlFor="create-address"
              >
                Address (optional)
              </label>
              <textarea
                id="create-address"
                value={createState.address}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
                rows={2}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createState.isPrimary}
                  onChange={(e) =>
                    setCreateState((prev) => ({
                      ...prev,
                      isPrimary: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="text-sm font-medium text-zinc-900">
                  Set as primary outlet
                </span>
              </label>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Outlet'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Outlets ({outlets.length})
          </h2>
          {fetching ? (
            <p className="mt-4 text-sm text-zinc-700">Loading outlets…</p>
          ) : outlets.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-700">No outlets yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {outlets.map((outlet) => {
                const isEditing = selectedOutletId === outlet.id;
                const editForm = editForms[outlet.id];

                return (
                  <div
                    key={outlet.id}
                    className="rounded-lg border border-zinc-200 p-4"
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-700">
                              Name
                            </label>
                            <input
                              value={editForm?.name || ''}
                              onChange={(event) =>
                                handleEditChange(outlet.id, 'name', event.target.value)
                              }
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-700">
                              Contact Number
                            </label>
                            <input
                              value={editForm?.contactNumber || ''}
                              onChange={(event) =>
                                handleEditChange(
                                  outlet.id,
                                  'contactNumber',
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-medium text-zinc-700">
                              Address
                            </label>
                            <textarea
                              value={editForm?.address || ''}
                              onChange={(event) =>
                                handleEditChange(outlet.id, 'address', event.target.value)
                              }
                              rows={2}
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editForm?.isActive ?? true}
                                onChange={(e) =>
                                  handleEditChange(outlet.id, 'isActive', e.target.checked)
                                }
                                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                              />
                              <span className="text-sm font-medium text-zinc-900">
                                Active
                              </span>
                            </label>
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editForm?.isPrimary ?? false}
                                onChange={(e) =>
                                  handleEditChange(outlet.id, 'isPrimary', e.target.checked)
                                }
                                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                              />
                              <span className="text-sm font-medium text-zinc-900">
                                Primary
                              </span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateOutlet(outlet.id)}
                            disabled={saving}
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={() => setSelectedOutletId(null)}
                            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-zinc-900">
                                {outlet.name}
                              </h3>
                              {outlet.isPrimary && (
                                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                                  Primary
                                </span>
                              )}
                              {!outlet.isActive && (
                                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {outlet.address && (
                              <p className="mt-1 text-sm text-zinc-600">
                                {outlet.address}
                              </p>
                            )}
                            {outlet.contactNumber && (
                              <p className="mt-1 text-sm text-zinc-600">
                                {outlet.contactNumber}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-zinc-500">
                              Created: {new Date(outlet.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedOutletId(outlet.id)}
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteOutlet(outlet.id)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

