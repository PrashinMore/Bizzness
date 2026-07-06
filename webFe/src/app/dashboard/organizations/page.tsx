'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useOutlet } from '@/contexts/outlet-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { organizationsApi, usersApi } from '@/lib/api-client';
import type { Organization } from '@/types/organization';
import type { User } from '@/types/user';
import { userHasOrganization } from '@/types/user';

interface CreateOrganizationFormState {
  name: string;
  description: string;
}

interface EditFormState {
  name: string;
  description: string;
}

const initialCreateState: CreateOrganizationFormState = {
  name: '',
  description: '',
};

export default function OrganizationsManagementPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();
  const { token, refreshProfile } = useAuth();
  const { refreshOutlets, setSelectedOutlet } = useOutlet();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createState, setCreateState] =
    useState<CreateOrganizationFormState>(initialCreateState);
  const [creating, setCreating] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, EditFormState>>({});
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

  const sortedOrganizations = useMemo(
    () =>
      [...organizations].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [organizations],
  );

  const needsOnboarding = Boolean(user && !userHasOrganization(user));

  useEffect(() => {
    if (!loading && user && needsOnboarding && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [loading, user, needsOnboarding, router]);

  useEffect(() => {
    async function loadData() {
      if (!token) {
        return;
      }
      setFetching(true);
      setError(null);
      try {
        const orgsData = await organizationsApi.list(token);
        setOrganizations(orgsData);

        if (!needsOnboarding) {
          const usersData = await usersApi.list(token);
          setUsers(usersData);
        } else {
          setUsers([]);
        }

        const mapped = Object.fromEntries(
          orgsData.map((org) => [
            org.id,
            {
              name: org.name,
              description: org.description || '',
            },
          ]),
        );
        setEditForms(mapped);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load organizations.');
        }
      } finally {
        setFetching(false);
      }
    }

    if (!loading && user && token) {
      loadData();
    }
  }, [loading, user, token, needsOnboarding]);

  const handleCreateOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCreating(true);
    setStatusMessage(null);
    setError(null);

    try {
      const wasFirstOrganization = organizations.length === 0;
      const created = await organizationsApi.create(token, {
        name: createState.name.trim(),
        description: createState.description.trim() || null,
      });
      setOrganizations((prev) => [...prev, created]);
      setEditForms((prev) => ({
        ...prev,
        [created.id]: {
          name: created.name,
          description: created.description || '',
        },
      }));
      setCreateState(initialCreateState);
      setStatusMessage(`Organization ${created.name} created successfully.`);

      await refreshProfile();
      if (created.defaultOutlet) {
        setSelectedOutlet(created.defaultOutlet);
      }
      await refreshOutlets();

      if (wasFirstOrganization) {
        router.replace('/dashboard');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to create organization.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleEditChange = (
    id: string,
    field: keyof EditFormState,
    value: string,
  ) => {
    setEditForms((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleUpdateOrganization = async (id: string) => {
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
      const updated = await organizationsApi.update(token, id, {
        name: payload.name.trim(),
        description: payload.description.trim() || null,
      });
      setOrganizations((prev) =>
        prev.map((org) => (org.id === id ? updated : org)),
      );
      setEditForms((prev) => ({
        ...prev,
        [id]: {
          name: updated.name,
          description: updated.description || '',
        },
      }));
      setSelectedOrgId(null);
      setStatusMessage(`Organization ${updated.name} updated.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to update organization.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async (id: string) => {
    if (!token) {
      return;
    }

    const target = organizations.find((org) => org.id === id);
    if (!target) return;

    const confirmed = window.confirm(
      `Delete organization ${target.name}? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await organizationsApi.remove(token, id);
      setOrganizations((prev) => prev.filter((org) => org.id !== id));
      setStatusMessage(`Organization ${target.name} removed.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to delete organization.');
      }
    }
  };

  const handleAssignUser = async (organizationId: string, userId: string) => {
    if (!token) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      const updated = await organizationsApi.assignUser(token, organizationId, userId);
      setOrganizations((prev) =>
        prev.map((org) => (org.id === organizationId ? updated : org)),
      );
      setStatusMessage('User assigned successfully.');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to assign user.');
      }
    }
  };

  const handleRemoveUser = async (organizationId: string, userId: string) => {
    if (!token) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      const updated = await organizationsApi.removeUser(token, organizationId, userId);
      setOrganizations((prev) =>
        prev.map((org) => (org.id === organizationId ? updated : org)),
      );
      setStatusMessage('User removed successfully.');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to remove user.');
      }
    }
  };

  const loadOrganizationDetails = async (id: string) => {
    if (!token) return;
    try {
      const org = await organizationsApi.get(token, id);
      setOrganizations((prev) =>
        prev.map((o) => (o.id === id ? org : o)),
      );
    } catch (err) {
      console.error('Failed to load organization details:', err);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedOrgId === id) {
      setExpandedOrgId(null);
    } else {
      setExpandedOrgId(id);
      loadOrganizationDetails(id);
    }
  };

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-muted">Loading organization management…</p>
      </main>
    );
  }

  if (needsOnboarding && user.role !== 'admin') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6">
        <p className="max-w-md text-center text-sm text-muted">
          Your account is not assigned to an organization yet. Please ask an administrator to invite you.
        </p>
      </main>
    );
  }

  if (needsOnboarding) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="pointer-events-auto relative z-[202] w-full max-w-lg rounded-panel bg-surface p-8 shadow-2xl">
          <h1 className="text-2xl font-semibold text-ink">
            Create your organization
          </h1>
          <p className="mt-2 text-sm text-muted">
            You need an organization before you can use the app. Complete this step to continue.
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleCreateOrganization}>
            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-muted"
                htmlFor="create-name"
              >
                Organization name
              </label>
              <input
                id="create-name"
                required
                autoFocus
                value={createState.name}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-muted"
                htmlFor="create-description"
              >
                Description (optional)
              </label>
              <input
                id="create-description"
                value={createState.description}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create organization and continue'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      {user.role !== 'admin' ? (
        <div className="mx-auto max-w-lg rounded-panel bg-surface p-8 text-center shadow-sm">
          <p className="text-sm text-muted">
            Only administrators can manage organizations.
          </p>
        </div>
      ) : (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="rounded-panel bg-surface p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">
            Organization management
          </h1>
          <p className="mt-2 text-sm text-muted">
            Create organizations, assign users, and manage your organizational structure.
          </p>
        </header>

        {error && (
          <div className="rounded-md border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="rounded-md border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-600">
            {statusMessage}
          </div>
        )}

        <section className="rounded-panel bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">
            Create a new organization
          </h2>
          <form
            className="mt-4 grid gap-4 md:grid-cols-2"
            onSubmit={handleCreateOrganization}
          >
            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-muted"
                htmlFor="create-name"
              >
                Organization name
              </label>
              <input
                id="create-name"
                required
                value={createState.name}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-muted"
                htmlFor="create-description"
              >
                Description (optional)
              </label>
              <input
                id="create-description"
                value={createState.description}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create organization'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-panel bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">
            Organizations ({sortedOrganizations.length})
          </h2>
          {fetching ? (
            <p className="mt-4 text-sm text-muted">Loading organizations…</p>
          ) : sortedOrganizations.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No organizations yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {sortedOrganizations.map((org) => {
                const isEditing = selectedOrgId === org.id;
                const isExpanded = expandedOrgId === org.id;
                const editForm = editForms[org.id];
                const orgUsers = org.users || [];

                return (
                  <div
                    key={org.id}
                    className="rounded-lg border border-border p-4"
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-muted">
                              Name
                            </label>
                            <input
                              value={editForm?.name || ''}
                              onChange={(event) =>
                                handleEditChange(org.id, 'name', event.target.value)
                              }
                              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-muted">
                              Description
                            </label>
                            <input
                              value={editForm?.description || ''}
                              onChange={(event) =>
                                handleEditChange(
                                  org.id,
                                  'description',
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateOrganization(org.id)}
                            disabled={saving}
                            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={() => setSelectedOrgId(null)}
                            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:bg-paper"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-ink">
                              {org.name}
                            </h3>
                            {org.description && (
                              <p className="mt-1 text-sm text-muted">
                                {org.description}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted">
                              Created: {new Date(org.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted">
                              Users: {orgUsers.length}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleExpand(org.id)}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-paper"
                            >
                              {isExpanded ? 'Hide' : 'View'} Users
                            </button>
                            <button
                              onClick={() => setSelectedOrgId(org.id)}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-paper"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteOrganization(org.id)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 space-y-4 rounded-lg border border-border bg-paper p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-ink">
                                Assigned Users ({orgUsers.length})
                              </h4>
                            </div>

                            {orgUsers.length > 0 ? (
                              <div className="space-y-2">
                                {orgUsers.map((user) => (
                                  <div
                                    key={user.id}
                                    className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-ink">
                                        {user.name}
                                      </p>
                                      <p className="text-xs text-muted">
                                        {user.email} • {user.role}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleRemoveUser(org.id, user.id)
                                      }
                                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-danger transition hover:bg-red-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted">
                                No users assigned to this organization.
                              </p>
                            )}

                            <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                Assign User
                              </h5>
                              <div className="space-y-2">
                                {users
                                  .filter(
                                    (u) => !orgUsers.some((ou) => ou.id === u.id),
                                  )
                                  .map((user) => (
                                    <div
                                      key={user.id}
                                      className="flex items-center justify-between rounded-lg border border-border p-2"
                                    >
                                      <div>
                                        <p className="text-sm font-medium text-ink">
                                          {user.name}
                                        </p>
                                        <p className="text-xs text-muted">
                                          {user.email} • {user.role}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleAssignUser(org.id, user.id)
                                        }
                                        className="rounded-lg bg-ink px-3 py-1 text-xs font-medium text-white transition hover:bg-ink-light"
                                      >
                                        Assign
                                      </button>
                                    </div>
                                  ))}
                                {users.filter(
                                  (u) => !orgUsers.some((ou) => ou.id === u.id),
                                ).length === 0 && (
                                  <p className="text-xs text-muted">
                                    All users are already assigned to this organization.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      )}
    </main>
  );
}

