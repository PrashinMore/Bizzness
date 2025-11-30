'use client';

import { FormEvent, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { usersApi, invitesApi, organizationsApi } from '@/lib/api-client';
import type { User, UserRole } from '@/types/user';
import type { OrganizationInvite } from '@/types/invite';
import type { Organization } from '@/types/organization';

interface CreateUserFormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface EditFormState {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

const initialCreateState: CreateUserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'staff',
};

export default function UsersManagementPage() {
  const { user, loading } = useRequireAuth('admin');
  const { token } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createState, setCreateState] =
    useState<CreateUserFormState>(initialCreateState);
  const [creating, setCreating] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, EditFormState>>({});
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Invite state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [emailSearchResults, setEmailSearchResults] = useState<User[]>([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [searchingEmails, setSearchingEmails] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [users],
  );

  useEffect(() => {
    async function loadUsers() {
      if (!token) {
        return;
      }
      setFetching(true);
      setError(null);
      try {
        const data = await usersApi.list(token);
        setUsers(data);
        const mapped = Object.fromEntries(
          data.map((u) => [
            u.id,
            { name: u.name, email: u.email, role: u.role, password: '' },
          ]),
        );
        setEditForms(mapped);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load users.');
        }
      } finally {
        setFetching(false);
      }
    }

    if (!loading && user && token) {
      loadUsers();
    }
  }, [loading, user, token]);

  // Load organizations
  useEffect(() => {
    async function loadOrganizations() {
      if (!token) {
        return;
      }
      try {
        const orgs = await organizationsApi.list(token);
        setOrganizations(orgs);
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      } catch (err) {
        console.error('Failed to load organizations', err);
      }
    }

    if (!loading && user && token) {
      loadOrganizations();
    }
  }, [loading, user, token, selectedOrgId]);

  // Email search with debounce
  const searchEmails = useCallback(
    async (query: string) => {
      if (!token || query.length < 2) {
        setEmailSearchResults([]);
        setShowEmailSuggestions(false);
        return;
      }

      setSearchingEmails(true);
      try {
        const results = await usersApi.list(token, query);
        setEmailSearchResults(results);
        setShowEmailSuggestions(true);
      } catch (err) {
        console.error('Failed to search emails', err);
        setEmailSearchResults([]);
      } finally {
        setSearchingEmails(false);
      }
    },
    [token],
  );

  // Debounced email search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchEmails(inviteEmail);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inviteEmail, searchEmails]);

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedOrgId || !inviteEmail.trim()) {
      return;
    }

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      await invitesApi.create(token, selectedOrgId, {
        email: inviteEmail.trim(),
      });
      setInviteEmail('');
      setEmailSearchResults([]);
      setShowEmailSuggestions(false);
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleEmailSelect = (email: string) => {
    setInviteEmail(email);
    setShowEmailSuggestions(false);
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCreating(true);
    setStatusMessage(null);
    setError(null);

    try {
      const created = await usersApi.create(token, {
        name: createState.name.trim(),
        email: createState.email.trim(),
        password: createState.password,
        role: createState.role,
      });
      setUsers((prev) => [...prev, created]);
      setEditForms((prev) => ({
        ...prev,
        [created.id]: {
          name: created.name,
          email: created.email,
          role: created.role,
          password: '',
        },
      }));
      setCreateState(initialCreateState);
      setStatusMessage(`User ${created.name} created successfully.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to create user.');
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
        [field]: field === 'role' ? (value as UserRole) : value,
      },
    }));
  };

  const handleUpdateUser = async (id: string) => {
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
      const updatePayload: Partial<{
        name: string;
        email: string;
        password: string;
        role: string;
      }> = {
        name: payload.name.trim(),
        email: payload.email.trim(),
        role: payload.role,
      };
      if (payload.password) {
        updatePayload.password = payload.password;
      }
      const updated = await usersApi.update(token, id, updatePayload);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updated } : u)),
      );
      setEditForms((prev) => ({
        ...prev,
        [id]: {
          name: updated.name,
          email: updated.email,
          role: updated.role,
          password: '',
        },
      }));
      setSelectedUserId(null);
      setStatusMessage(`User ${updated.name} updated.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to update user.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!token) {
      return;
    }

    const target = users.find((u) => u.id === id);
    if (!target) return;

    const confirmed = window.confirm(
      `Delete user ${target.name}? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await usersApi.remove(token, id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setStatusMessage(`User ${target.name} removed.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to delete user.');
      }
    }
  };

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-700">Loading user management…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Team management
          </h1>
          <p className="mt-2 text-sm text-zinc-700">
            Add staff, assign roles, reset passwords, and keep your roster up to
            date.
          </p>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Invite a new member
          </h2>
          <p className="mt-1 text-sm text-zinc-700">
            Search for existing users by email or enter any email address to send an invite.
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleInviteSubmit}>
            {organizations.length > 1 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700" htmlFor="invite-org">
                  Organization
                </label>
                <select
                  id="invite-org"
                  value={selectedOrgId || ''}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  required
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="invite-email">
                Email address
              </label>
              <div className="relative">
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null);
                  }}
                  onFocus={() => {
                    if (emailSearchResults.length > 0) {
                      setShowEmailSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow clicking on suggestions
                    setTimeout(() => setShowEmailSuggestions(false), 200);
                  }}
                  placeholder="Search by email or enter any email address"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
                {searchingEmails && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"></div>
                  </div>
                )}
                {showEmailSuggestions && emailSearchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg">
                    <ul className="max-h-48 overflow-y-auto">
                      {emailSearchResults.map((user) => (
                        <li
                          key={user.id}
                          onClick={() => handleEmailSelect(user.email)}
                          className="cursor-pointer px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          <div className="font-medium">{user.email}</div>
                          <div className="text-xs text-zinc-500">{user.name}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {inviteError && (
                <p className="text-sm text-red-600">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-sm text-emerald-600">Invite sent successfully!</p>
              )}
            </div>
            <button
              type="submit"
              disabled={inviting || !selectedOrgId}
              className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Create user account
          </h2>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="create-name">
                Full name
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
              <label className="block text-sm font-medium text-zinc-700" htmlFor="create-email">
                Email
              </label>
              <input
                id="create-email"
                type="email"
                required
                value={createState.email}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, email: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="create-password">
                Temporary password
              </label>
              <input
                id="create-password"
                type="password"
                required
                value={createState.password}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, password: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="create-role">
                Role
              </label>
              <select
                id="create-role"
                value={createState.role}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    role: event.target.value as UserRole,
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Current team members
            </h2>
            <span className="text-sm text-zinc-700">
              {fetching ? 'Loading…' : `${users.length} users`}
            </span>
          </div>

          {statusMessage ? (
            <p className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
              {statusMessage}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <div className="mt-6 space-y-4">
            {fetching ? (
              <p className="text-sm text-zinc-700">Loading users…</p>
            ) : sortedUsers.length === 0 ? (
              <p className="text-sm text-zinc-700">
                No users found. Create your first team member above.
              </p>
            ) : (
              sortedUsers.map((u) => {
                const form = editForms[u.id] ?? {
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  password: '',
                };
                const isEditing = selectedUserId === u.id;
                return (
                  <div
                    key={u.id}
                    className="rounded-2xl border border-zinc-100 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900">
                          {u.name}
                        </h3>
                        <p className="text-sm text-zinc-700">{u.email}</p>
                        <p className="text-xs uppercase tracking-wide text-zinc-700">
                          {u.role}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setSelectedUserId((prev) => (prev === u.id ? null : u.id))
                          }
                          className="rounded-full border border-zinc-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                        >
                          {isEditing ? 'Close' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="rounded-full border border-red-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:border-red-400 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-zinc-700">
                            Full name
                          </label>
                          <input
                            value={form.name}
                            onChange={(event) =>
                              handleEditChange(u.id, 'name', event.target.value)
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-zinc-700">
                            Email
                          </label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(event) =>
                              handleEditChange(u.id, 'email', event.target.value)
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-zinc-700">
                            Role
                          </label>
                          <select
                            value={form.role}
                            onChange={(event) =>
                              handleEditChange(u.id, 'role', event.target.value)
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                          >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-zinc-700">
                            Reset password (optional)
                          </label>
                          <input
                            type="password"
                            value={form.password}
                            placeholder="Leave blank to keep current password"
                            onChange={(event) =>
                              handleEditChange(u.id, 'password', event.target.value)
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <button
                            onClick={() => handleUpdateUser(u.id)}
                            disabled={saving}
                            className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {saving ? 'Saving…' : 'Save changes'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

