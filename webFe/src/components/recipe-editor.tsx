'use client';

/**
 * Recipe editor — lightweight side drawer for editing a dish's recipe.
 *
 * Design choices:
 *  - Uses the existing <Drawer/> so it never blocks the whole page; staff
 *    can cancel fast if they tapped the wrong row.
 *  - One row per ingredient with inline ingredient search, numeric qty,
 *    unit dropdown, and a remove button. "Enter" jumps to the next field
 *    so keyboard-first editing is fast.
 *  - "Duplicate from another dish" copies items from an existing recipe —
 *    the common case when two dishes share a base (e.g. masala curries).
 *  - Never force all fields: empty rows are dropped on save, so staff can
 *    start a recipe with 1 ingredient and expand later.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/states';
import { recipesApi } from '@/lib/api-client';
import type { Product } from '@/types/product';
import type { Recipe, RecipeItemDraft, RecipeUnit } from '@/types/recipe';
import { RECIPE_UNITS } from '@/types/recipe';

type RecipeEditorProps = {
  open: boolean;
  onClose: () => void;
  token: string;
  /** The dish whose recipe we're editing (must have inventoryType === 'RECIPE'). */
  product: Product;
  /** All products loaded by the parent; used to look up ingredient names & autosuggest. */
  allProducts: Product[];
  /** Optional selected outlet id to scope the recipe to; null => global recipe. */
  outletId?: string | null;
  /** Fired after a successful save so the parent can refresh its cache. */
  onSaved?: (recipe: Recipe) => void;
};

/** An ingredient candidate is any product that isn't a RECIPE dish (nested
 * recipes are rejected by the backend) and isn't the dish itself. */
function isIngredientCandidate(candidate: Product, dishId: string): boolean {
  if (candidate.id === dishId) {
    return false;
  }
  const inv = candidate.inventoryType ?? 'SIMPLE';
  return inv !== 'RECIPE';
}

const emptyRow = (): RecipeItemDraft => ({
  ingredientProductId: '',
  quantity: '',
  unit: 'g',
});

export function RecipeEditor({
  open,
  onClose,
  token,
  product,
  allProducts,
  outletId,
  onSaved,
}: RecipeEditorProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [rows, setRows] = useState<RecipeItemDraft[]>([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // "Duplicate from" — list of other RECIPE products to copy items from.
  const [duplicateSource, setDuplicateSource] = useState<string>('');
  const [loadingDuplicate, setLoadingDuplicate] = useState(false);

  // Product list available as ingredients. Dish itself and other RECIPE items are excluded.
  const ingredientOptions = useMemo(
    () => allProducts.filter((p) => isIngredientCandidate(p, product.id)),
    [allProducts, product.id],
  );

  const recipeSources = useMemo(
    () =>
      allProducts.filter(
        (p) => p.id !== product.id && (p.inventoryType ?? 'SIMPLE') === 'RECIPE',
      ),
    [allProducts, product.id],
  );

  const productNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    allProducts.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [allProducts]);

  // ---------------------------------------------------------------------------
  // Load existing recipe when the drawer opens. Fetch is lazy — we don't keep a
  // recipe cache upfront because most products never have one (backend costs).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setStatus(null);
      try {
        const existing = await recipesApi.getByProduct(token, product.id);
        if (cancelled) {
          return;
        }
        setRecipe(existing);
        if (existing && existing.items.length > 0) {
          setRows(
            existing.items.map((item) => ({
              id: item.id,
              ingredientProductId: item.ingredientProductId,
              quantity: Number(item.quantity),
              unit: item.unit,
            })),
          );
        } else {
          setRows([emptyRow()]);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to load recipe.');
        setRows([emptyRow()]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, token, product.id]);

  // ---------------------------------------------------------------------------
  // Row mutations. Kept minimal: add, update one field, remove. We avoid a
  // reducer because the state is shallow and the drawer is short-lived.
  // ---------------------------------------------------------------------------
  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const updateRow = useCallback(
    <K extends keyof RecipeItemDraft>(index: number, field: K, value: RecipeItemDraft[K]) => {
      setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    },
    [],
  );

  const removeRow = useCallback((index: number) => {
    setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)));
  }, []);

  // Focus management: when staff presses Enter in qty, focus the ingredient
  // field of the next row (or add a new empty row). Refs keyed by row index.
  const qtyRefs = useRef<Array<HTMLInputElement | null>>([]);
  const ingredientRefs = useRef<Array<HTMLSelectElement | null>>([]);

  const handleQtyKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') {
      return;
    }
    e.preventDefault();
    if (index === rows.length - 1) {
      addRow();
      setTimeout(() => ingredientRefs.current[index + 1]?.focus(), 0);
    } else {
      ingredientRefs.current[index + 1]?.focus();
    }
  };

  // ---------------------------------------------------------------------------
  // Duplicate-from-another-dish. We pull the source recipe on demand rather
  // than preloading all recipes.
  // ---------------------------------------------------------------------------
  const handleDuplicate = async () => {
    if (!duplicateSource) {
      return;
    }
    setLoadingDuplicate(true);
    setError(null);
    try {
      const src = await recipesApi.getByProduct(token, duplicateSource);
      if (!src || src.items.length === 0) {
        setError('Selected dish has no recipe to copy.');
        return;
      }
      setRows(
        src.items.map((item) => ({
          ingredientProductId: item.ingredientProductId,
          quantity: Number(item.quantity),
          unit: item.unit,
        })),
      );
      setStatus(`Copied ${src.items.length} ingredient(s). Review and save.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to copy recipe.');
    } finally {
      setLoadingDuplicate(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Persist. We drop incomplete rows (no ingredient / zero qty) silently so
  // staff isn't punished for partial edits — they just don't get saved.
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    setError(null);
    setStatus(null);

    const cleaned = rows
      .filter((row) => row.ingredientProductId && Number(row.quantity) > 0)
      .map((row) => ({
        ingredientProductId: row.ingredientProductId,
        quantity: Number(row.quantity),
        unit: row.unit as RecipeUnit,
      }));

    if (cleaned.length === 0) {
      setError('Add at least one ingredient with a positive quantity.');
      return;
    }

    // Dedup guard: the backend also rejects duplicates, but failing fast here
    // is a better UX than a 400.
    const seen = new Set<string>();
    for (const item of cleaned) {
      if (seen.has(item.ingredientProductId)) {
        const name = productNameLookup.get(item.ingredientProductId) ?? 'ingredient';
        setError(`"${name}" is listed twice. Combine into a single row.`);
        return;
      }
      seen.add(item.ingredientProductId);
    }

    setSaving(true);
    try {
      const saved = recipe
        ? await recipesApi.update(token, recipe.id, { items: cleaned })
        : await recipesApi.create(token, {
            productId: product.id,
            outletId: outletId ?? undefined,
            items: cleaned,
          });
      setRecipe(saved);
      setStatus(recipe ? 'Recipe updated.' : 'Recipe created.');
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save recipe.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe) {
      return;
    }
    const ok = window.confirm(
      `Remove recipe for "${product.name}"? Sales of this dish will stop deducting ingredients.`,
    );
    if (!ok) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await recipesApi.remove(token, recipe.id);
      setRecipe(null);
      setRows([emptyRow()]);
      setStatus('Recipe removed. Dish reverted to simple inventory.');
      // Parent refresh via onSaved callback pattern — emit a synthetic "empty"
      // recipe is awkward; instead we rely on the parent to re-fetch when the
      // drawer closes. Callers should treat a closed drawer as a cache bust.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove recipe.');
    } finally {
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Auto-suggest: when starting a brand new recipe, propose ingredient names
  // that appear in the dish name (e.g. "Paneer Tikka" → Paneer).
  // ---------------------------------------------------------------------------
  const suggestedIngredients = useMemo(() => {
    if (recipe) {
      return [] as Product[];
    }
    const tokens = product.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3);
    if (tokens.length === 0) {
      return [];
    }
    const current = new Set(rows.map((r) => r.ingredientProductId).filter(Boolean));
    return ingredientOptions
      .filter((p) => !current.has(p.id))
      .filter((p) => tokens.some((t) => p.name.toLowerCase().includes(t)))
      .slice(0, 4);
  }, [recipe, product.name, ingredientOptions, rows]);

  const applySuggestion = (p: Product) => {
    setRows((prev) => {
      // Fill the first empty row, else append.
      const emptyIdx = prev.findIndex((r) => !r.ingredientProductId);
      if (emptyIdx >= 0) {
        const next = [...prev];
        next[emptyIdx] = { ...next[emptyIdx], ingredientProductId: p.id };
        return next;
      }
      return [...prev, { ingredientProductId: p.id, quantity: '', unit: 'g' }];
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Recipe · ${product.name}`}
      className="max-w-lg"
    >
      {loading ? (
        <p className="text-sm text-zinc-600">Loading recipe…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-zinc-600">
            Selling this dish will deduct the listed raw materials from stock.
            Incomplete rows are ignored on save.
          </p>

          {/* Duplicate-from-another-dish shortcut. Hidden when there's no other
              RECIPE dish to copy from. */}
          {recipeSources.length > 0 && (
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Duplicate from another dish
              </label>
              <div className="mt-2 flex gap-2">
                <select
                  value={duplicateSource}
                  onChange={(e) => setDuplicateSource(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
                >
                  <option value="">Select dish…</option>
                  {recipeSources.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDuplicate}
                  disabled={!duplicateSource || loadingDuplicate}
                >
                  {loadingDuplicate ? 'Copying…' : 'Copy'}
                </Button>
              </div>
            </div>
          )}

          {suggestedIngredients.length > 0 && (
            <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Suggested from dish name
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestedIngredients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applySuggestion(p)}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs text-brand-700 hover:bg-brand-100"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <InlineAlert tone="danger">{error}</InlineAlert>}
          {status && <InlineAlert tone="success">{status}</InlineAlert>}

          <div className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <div
                key={row.id ?? `draft-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_80px_80px_32px] items-center gap-2"
              >
                <select
                  ref={(el) => {
                    ingredientRefs.current[index] = el;
                  }}
                  value={row.ingredientProductId}
                  onChange={(e) => updateRow(index, 'ingredientProductId', e.target.value)}
                  className="min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
                >
                  <option value="">Ingredient…</option>
                  {ingredientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  ref={(el) => {
                    qtyRefs.current[index] = el;
                  }}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateRow(index, 'quantity', value === '' ? '' : Number(value));
                  }}
                  onKeyDown={(e) => handleQtyKeyDown(index, e)}
                  className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                />
                <select
                  value={row.unit}
                  onChange={(e) => updateRow(index, 'unit', e.target.value as RecipeUnit)}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
                >
                  {RECIPE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-lg text-sm text-zinc-500 hover:bg-zinc-100"
                  aria-label="Remove ingredient"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <Button type="button" variant="secondary" size="sm" onClick={addRow}>
            + Add ingredient
          </Button>

          <div className="mt-2 flex flex-col gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : recipe ? 'Save changes' : 'Create recipe'}
            </Button>
            {recipe && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Removing…' : 'Remove recipe'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
