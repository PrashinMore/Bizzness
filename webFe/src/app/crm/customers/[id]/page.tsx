'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { crmApi } from '@/lib/api-client';
import type { Customer, CustomerVisit, CustomerNote, CustomerFeedback } from '@/types/crm';

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { user, loading } = useRequireAuth();
  const { token } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'notes' | 'feedback'>('overview');
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    async function loadCustomer() {
      if (!token || !customerId) {
        return;
      }
      setFetching(true);
      setError(null);
      try {
        const [customerData, visitsData, notesData, feedbacksData] = await Promise.all([
          crmApi.getCustomer(token, customerId),
          crmApi.getCustomerVisits(token, customerId),
          crmApi.getCustomerNotes(token, customerId),
          crmApi.getCustomerFeedbacks(token, customerId),
        ]);
        setCustomer(customerData);
        setVisits(visitsData);
        setNotes(notesData);
        setFeedbacks(feedbacksData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load customer');
        }
      } finally {
        setFetching(false);
      }
    }

    loadCustomer();
  }, [token, customerId]);

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !newNote.trim()) return;

    setAddingNote(true);
    try {
      const note = await crmApi.createCustomerNote(token, customerId, { note: newNote });
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      setAddingNote(false);
    }
  };

  if (loading || fetching) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    );
  }

  if (error || !customer) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">{error || 'Customer not found'}</div>
          <button
            onClick={() => router.push('/crm/customers')}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-white"
          >
            Back to Customers
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <button
            onClick={() => router.push('/crm/customers')}
            className="text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Customers
          </button>
        </div>

        <header className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">{customer.name}</h1>
              <p className="mt-2 text-zinc-600">{customer.phone}</p>
              {customer.email && <p className="text-zinc-600">{customer.email}</p>}
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-600">Total Visits</div>
              <div className="text-2xl font-bold text-zinc-900">{customer.totalVisits}</div>
              <div className="mt-2 text-sm text-zinc-600">Total Spend</div>
              <div className="text-xl font-semibold text-zinc-900">₹{Number(customer.totalSpend).toFixed(2)}</div>
            </div>
          </div>

          {customer.tags.length > 0 && (
            <div className="mt-4 flex gap-2">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {customer.loyaltyAccount && (
            <div className="mt-4 rounded-lg bg-zinc-50 p-4">
              <div className="text-sm font-medium text-zinc-700">Loyalty Account</div>
              <div className="mt-1 text-lg font-semibold text-zinc-900">
                {customer.loyaltyAccount.points} points • {customer.loyaltyAccount.tier}
              </div>
            </div>
          )}
        </header>

        <div className="mb-6 rounded-lg bg-white shadow-sm">
          <div className="border-b border-zinc-200">
            <nav className="flex">
              {(['overview', 'visits', 'notes', 'feedback'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium capitalize ${
                    activeTab === tab
                      ? 'border-b-2 border-zinc-900 text-zinc-900'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-zinc-600">Average Order Value</div>
                    <div className="mt-1 text-2xl font-bold text-zinc-900">
                      ₹{Number(customer.avgOrderValue).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-600">Last Visit</div>
                    <div className="mt-1 text-lg text-zinc-900">
                      {customer.lastVisitAt
                        ? new Date(customer.lastVisitAt).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                </div>

                {customer.birthday && (
                  <div>
                    <div className="text-sm font-medium text-zinc-600">Birthday</div>
                    <div className="mt-1 text-zinc-900">
                      {new Date(customer.birthday).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {customer.gender && (
                  <div>
                    <div className="text-sm font-medium text-zinc-600">Gender</div>
                    <div className="mt-1 text-zinc-900">{customer.gender}</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'visits' && (
              <div>
                {visits.length === 0 ? (
                  <div className="text-center text-zinc-500">No visits recorded</div>
                ) : (
                  <div className="space-y-4">
                    {visits.map((visit) => (
                      <div
                        key={visit.id}
                        className="rounded-lg border border-zinc-200 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-zinc-900">
                              {new Date(visit.visitedAt).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-zinc-600">
                              {visit.visitType} • ₹{Number(visit.billAmount).toFixed(2)}
                            </div>
                          </div>
                          {visit.orderId && (
                            <button
                              onClick={() => router.push(`/sales/${visit.orderId}`)}
                              className="text-sm text-zinc-600 hover:text-zinc-900"
                            >
                              View Order
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                <form onSubmit={handleAddNote} className="rounded-lg border border-zinc-200 p-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this customer..."
                    rows={3}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                  <button
                    type="submit"
                    disabled={addingNote || !newNote.trim()}
                    className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </button>
                </form>

                {notes.length === 0 ? (
                  <div className="text-center text-zinc-500">No notes yet</div>
                ) : (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-zinc-200 p-4"
                      >
                        <div className="text-sm text-zinc-600">
                          {new Date(note.createdAt).toLocaleString()}
                          {note.createdBy && ` • ${note.createdBy.name}`}
                        </div>
                        <div className="mt-2 text-zinc-900">{note.note}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'feedback' && (
              <div>
                {feedbacks.length === 0 ? (
                  <div className="text-center text-zinc-500">No feedback yet</div>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.map((feedback) => (
                      <div
                        key={feedback.id}
                        className="rounded-lg border border-zinc-200 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-lg font-semibold text-zinc-900">
                                {'⭐'.repeat(feedback.rating)}
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  feedback.status === 'OPEN'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {feedback.status}
                              </span>
                            </div>
                            {feedback.comment && (
                              <div className="mt-2 text-zinc-700">{feedback.comment}</div>
                            )}
                            <div className="mt-2 text-sm text-zinc-600">
                              {new Date(feedback.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

