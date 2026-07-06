'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { crmApi } from '@/lib/api-client';

type RewardType = 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'FREE_ITEM' | 'CASHBACK';

interface Reward {
  id: string;
  name: string;
  description?: string;
  type: RewardType;
  pointsRequired: number;
  discountPercentage?: number;
  discountAmount?: number;
  freeItemName?: string;
  cashbackAmount?: number;
  isActive: boolean;
  maxRedemptions?: number;
  totalRedemptions: number;
  createdAt: string;
}

export default function RewardsPage() {
  const { user, loading } = useRequireAuth();
  const { token } = useAuth();
  const router = useRouter();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'DISCOUNT_PERCENTAGE' as RewardType,
    pointsRequired: 10,
    discountPercentage: undefined as number | undefined,
    discountAmount: undefined as number | undefined,
    freeItemName: '',
    cashbackAmount: undefined as number | undefined,
    minOrderValue: undefined as number | undefined,
    maxDiscountAmount: undefined as number | undefined,
    isActive: true,
    maxRedemptions: undefined as number | undefined,
  });

  useEffect(() => {
    if (token && !loading && user) {
      loadRewards();
    }
  }, [token, loading, user]);

  const loadRewards = async () => {
    if (!token) return;
    setFetching(true);
    setError(null);
    try {
      const data = await crmApi.getRewards(token);
      setRewards(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load rewards');
      }
    } finally {
      setFetching(false);
    }
  };

  const handleCreate = () => {
    setEditingReward(null);
    setFormData({
      name: '',
      description: '',
      type: 'DISCOUNT_PERCENTAGE',
      pointsRequired: 10,
      discountPercentage: undefined,
      discountAmount: undefined,
      freeItemName: '',
      cashbackAmount: undefined,
      minOrderValue: undefined,
      maxDiscountAmount: undefined,
      isActive: true,
      maxRedemptions: undefined,
    });
    setShowCreateModal(true);
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || '',
      type: reward.type,
      pointsRequired: reward.pointsRequired,
      discountPercentage: reward.discountPercentage || undefined,
      discountAmount: reward.discountAmount || undefined,
      freeItemName: reward.freeItemName || '',
      cashbackAmount: reward.cashbackAmount || undefined,
      minOrderValue: (reward as any).minOrderValue || undefined,
      maxDiscountAmount: (reward as any).maxDiscountAmount || undefined,
      isActive: reward.isActive,
      maxRedemptions: reward.maxRedemptions || undefined,
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        pointsRequired: formData.pointsRequired,
        isActive: formData.isActive,
        maxRedemptions: formData.maxRedemptions || undefined,
      };

      if (formData.type === 'DISCOUNT_PERCENTAGE') {
        payload.discountPercentage = formData.discountPercentage;
        payload.maxDiscountAmount = formData.maxDiscountAmount;
        if (formData.minOrderValue) {
          payload.minOrderValue = formData.minOrderValue;
        }
      } else if (formData.type === 'DISCOUNT_FIXED') {
        payload.discountAmount = formData.discountAmount;
        payload.maxDiscountAmount = formData.maxDiscountAmount;
        if (formData.minOrderValue) {
          payload.minOrderValue = formData.minOrderValue;
        }
      } else if (formData.type === 'FREE_ITEM') {
        payload.freeItemName = formData.freeItemName;
      } else if (formData.type === 'CASHBACK') {
        payload.cashbackAmount = formData.cashbackAmount;
      }

      if (editingReward) {
        await crmApi.updateReward(token, editingReward.id, payload);
      } else {
        await crmApi.createReward(token, payload);
      }

      setShowCreateModal(false);
      loadRewards();
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Failed to save reward');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      await crmApi.deleteReward(token, id);
      loadRewards();
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Failed to delete reward');
      }
    }
  };

  const getRewardDescription = (reward: Reward): string => {
    switch (reward.type) {
      case 'DISCOUNT_PERCENTAGE':
        return `${reward.discountPercentage}% discount`;
      case 'DISCOUNT_FIXED':
        return `₹${reward.discountAmount} off`;
      case 'FREE_ITEM':
        return `Free ${reward.freeItemName}`;
      case 'CASHBACK':
        return `₹${reward.cashbackAmount} cashback`;
      default:
        return '';
    }
  };

  if (loading || !user || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink">Rewards Catalog</h1>
            <p className="mt-2 text-sm text-muted">
              Create and manage rewards that customers can redeem with loyalty points
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-light"
          >
            + Create Reward
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {fetching ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted">Loading rewards…</p>
          </div>
        ) : rewards.length === 0 ? (
          <div className="rounded-lg bg-surface p-12 text-center shadow-sm">
            <p className="text-muted">No rewards created yet</p>
            <button
              onClick={handleCreate}
              className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-light"
            >
              Create Your First Reward
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`rounded-lg border p-6 shadow-sm ${
                  reward.isActive ? 'border-border bg-surface' : 'border-border bg-paper opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-ink">{reward.name}</h3>
                    {reward.description && (
                      <p className="mt-1 text-sm text-muted">{reward.description}</p>
                    )}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Type:</span>
                        <span className="font-medium text-ink">{getRewardDescription(reward)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Points Required:</span>
                        <span className="font-medium text-ink">{reward.pointsRequired}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Redemptions:</span>
                        <span className="font-medium text-ink">
                          {reward.totalRedemptions}
                          {reward.maxRedemptions ? ` / ${reward.maxRedemptions}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Status:</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            reward.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-paper text-ink'
                          }`}
                        >
                          {reward.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(reward)}
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:bg-paper"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="rounded-lg border border-red-300 bg-surface px-3 py-2 text-sm font-medium text-danger hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] rounded-lg bg-surface shadow-xl flex flex-col">
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <h2 className="text-xl font-semibold text-ink">
                  {editingReward ? 'Edit Reward' : 'Create Reward'}
                </h2>
              </div>
              <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as RewardType })}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="DISCOUNT_PERCENTAGE">Discount Percentage</option>
                    <option value="DISCOUNT_FIXED">Fixed Discount</option>
                    <option value="FREE_ITEM">Free Item</option>
                    <option value="CASHBACK">Cashback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted">Points Required *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.pointsRequired}
                    onChange={(e) => setFormData({ ...formData, pointsRequired: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>

                {formData.type === 'DISCOUNT_PERCENTAGE' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-muted">Discount Percentage *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        value={formData.discountPercentage || ''}
                        onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || undefined })}
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted">Maximum Discount Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.maxDiscountAmount || ''}
                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseFloat(e.target.value) || undefined })}
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-muted">Maximum discount that can be applied regardless of percentage</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted">Minimum Order Value (₹) (Optional)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minOrderValue || ''}
                        onChange={(e) => setFormData({ ...formData, minOrderValue: parseFloat(e.target.value) || undefined })}
                        placeholder="Leave empty for no minimum"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {formData.type === 'DISCOUNT_FIXED' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-muted">Discount Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.discountAmount || ''}
                        onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || undefined })}
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted">Maximum Discount Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.maxDiscountAmount || ''}
                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseFloat(e.target.value) || undefined })}
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-muted">Maximum discount that can be applied</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted">Minimum Order Value (₹) (Optional)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minOrderValue || ''}
                        onChange={(e) => setFormData({ ...formData, minOrderValue: parseFloat(e.target.value) || undefined })}
                        placeholder="Leave empty for no minimum"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {formData.type === 'FREE_ITEM' && (
                  <div>
                    <label className="block text-sm font-medium text-muted">Free Item Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.freeItemName}
                      onChange={(e) => setFormData({ ...formData, freeItemName: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                )}

                {formData.type === 'CASHBACK' && (
                  <div>
                    <label className="block text-sm font-medium text-muted">Cashback Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.cashbackAmount || ''}
                      onChange={(e) => setFormData({ ...formData, cashbackAmount: parseFloat(e.target.value) || undefined })}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted">Max Redemptions (optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxRedemptions || ''}
                    onChange={(e) => setFormData({ ...formData, maxRedemptions: parseInt(e.target.value) || undefined })}
                    placeholder="Leave empty for unlimited"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-ink focus:ring-accent"
                  />
                  <label className="text-sm font-medium text-muted">Active</label>
                </div>

              </form>
              <div className="px-6 py-4 border-t border-border flex gap-3 bg-surface">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-paper"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (formRef.current) {
                      formRef.current.requestSubmit();
                    }
                  }}
                  className="flex-1 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-light"
                >
                  {editingReward ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

