"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export type SeasonalProductOption = {
  id: string;
  name: string;
  brand: string | null;
  unit: string | null;
};

type SeasonalCollection = {
  id: string;
  title: string;
  title_hi: string | null;
  description: string | null;
  description_hi: string | null;
  starts_on: string;
  ends_on: string;
  is_active: boolean;
  manual_override: boolean;
  sort_order: number;
};

type CollectionForm = Omit<
  SeasonalCollection,
  "id" | "title_hi" | "description" | "description_hi"
> & {
  title_hi: string;
  description: string;
  description_hi: string;
};

const blankForm: CollectionForm = {
  title: "",
  title_hi: "",
  description: "",
  description_hi: "",
  starts_on: "",
  ends_on: "",
  is_active: false,
  manual_override: false,
  sort_order: 0,
};

async function fetchSeasonalCollections(): Promise<SeasonalCollection[]> {
  const { data, error } = await createClient()
    .from("seasonal_collections")
    .select("id, title, title_hi, description, description_hi, starts_on, ends_on, is_active, manual_override, sort_order")
    .order("sort_order", { ascending: true })
    .order("starts_on", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SeasonalCollection[];
}

export default function SeasonalCollectionsManager({
  products,
}: {
  products: SeasonalProductOption[];
}) {
  const [collections, setCollections] = useState<SeasonalCollection[]>([]);
  const [form, setForm] = useState<CollectionForm>(blankForm);
  const [editingId, setEditingId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const visibleProducts = useMemo(() => {
    const term = productSearch.trim().toLocaleLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.brand, product.unit]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(term),
    );
  }, [productSearch, products]);

  const loadCollections = useCallback(async () => {
    try {
      setCollections(await fetchSeasonalCollections());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Seasonal collections could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchSeasonalCollections()
      .then((result) => {
        if (active) setCollections(result);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Seasonal collections could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setEditingId("");
    setForm(blankForm);
    setSelectedProductIds([]);
    setProductSearch("");
  }

  async function editCollection(collection: SeasonalCollection) {
    setError("");
    setSuccess("");
    try {
      const { data, error: queryError } = await createClient()
        .from("seasonal_collection_products")
        .select("product_id")
        .eq("collection_id", collection.id);
      if (queryError) throw queryError;
      setEditingId(collection.id);
      setForm({
        title: collection.title,
        title_hi: collection.title_hi ?? "",
        description: collection.description ?? "",
        description_hi: collection.description_hi ?? "",
        starts_on: collection.starts_on,
        ends_on: collection.ends_on,
        is_active: collection.is_active,
        manual_override: collection.manual_override,
        sort_order: collection.sort_order,
      });
      setSelectedProductIds((data ?? []).map((row) => row.product_id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The seasonal collection could not be opened.");
    }
  }

  async function saveCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Collection title is required.");
      return;
    }
    if (!form.starts_on || !form.ends_on || form.ends_on < form.starts_on) {
      setError("Enter a valid start and end date. The end date must not be before the start date.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const payload = {
        ...form,
        title: form.title.trim(),
        title_hi: form.title_hi.trim() || null,
        description: form.description.trim() || null,
        description_hi: form.description_hi.trim() || null,
      };

      let collectionId = editingId;
      if (editingId) {
        const { error: updateError } = await supabase
          .from("seasonal_collections")
          .update(payload)
          .eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("seasonal_collections")
          .insert(payload)
          .select("id")
          .single();
        if (insertError) throw insertError;
        collectionId = data.id;
      }

      const { error: productsError } = await supabase.rpc(
        "set_seasonal_collection_products",
        {
          p_collection_id: collectionId,
          p_product_ids: selectedProductIds,
        },
      );
      if (productsError) throw productsError;

      setSuccess(editingId ? "Seasonal collection updated." : "Seasonal collection created.");
      resetForm();
      await loadCollections();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Seasonal collection could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(collection: SeasonalCollection) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await createClient()
        .from("seasonal_collections")
        .update({ is_active: !collection.is_active })
        .eq("id", collection.id);
      if (updateError) throw updateError;
      setSuccess(collection.is_active ? "Collection deactivated." : "Collection activated.");
      await loadCollections();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Collection status could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCollection(collection: SeasonalCollection) {
    if (!window.confirm(`Delete "${collection.title}"? Its product links will be removed; products will remain unchanged.`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const { error: deleteError } = await createClient()
        .from("seasonal_collections")
        .delete()
        .eq("id", collection.id);
      if (deleteError) throw deleteError;
      if (editingId === collection.id) resetForm();
      setSuccess("Seasonal collection deleted.");
      await loadCollections();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Seasonal collection could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  function toggleProduct(productId: string, checked: boolean) {
    setSelectedProductIds((current) =>
      checked
        ? Array.from(new Set([...current, productId]))
        : current.filter((id) => id !== productId),
    );
  }

  return (
    <section className="admin-seasonal" aria-labelledby="admin-seasonal-title">
      <div className="admin-seasonal-heading">
        <div>
          <h2 id="admin-seasonal-title">Seasonal collections</h2>
          <p>Schedule collections using India-local dates and link only published products.</p>
        </div>
      </div>
      {error && <p className="dashboard-error" role="alert">{error}</p>}
      {success && <p className="dashboard-success" role="status">{success}</p>}

      <form className="admin-seasonal-form" onSubmit={saveCollection}>
        <h3>{editingId ? "Edit collection" : "Create collection"}</h3>
        <label>Title<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required maxLength={160} /></label>
        <label>Hindi title<input value={form.title_hi} onChange={(event) => setForm((current) => ({ ...current, title_hi: event.target.value }))} maxLength={160} /></label>
        <label>Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} /></label>
        <label>Hindi description<textarea value={form.description_hi} onChange={(event) => setForm((current) => ({ ...current, description_hi: event.target.value }))} maxLength={500} /></label>
        <div className="admin-seasonal-dates">
          <label>Starts on<input type="date" value={form.starts_on} onChange={(event) => setForm((current) => ({ ...current, starts_on: event.target.value }))} required /></label>
          <label>Ends on<input type="date" value={form.ends_on} onChange={(event) => setForm((current) => ({ ...current, ends_on: event.target.value }))} required /></label>
        </div>
        <label>Sort order<input type="number" step="1" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} /></label>
        <label className="admin-checkbox"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /> Enabled</label>
        <label className="admin-checkbox"><input type="checkbox" checked={form.manual_override} onChange={(event) => setForm((current) => ({ ...current, manual_override: event.target.checked }))} /> Show outside the scheduled dates</label>

        <fieldset className="admin-seasonal-products">
          <legend>Published products ({selectedProductIds.length} selected)</legend>
          <label className="admin-seasonal-search">
            Search products
            <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
          </label>
          {products.length === 0 ? (
            <p className="dashboard-empty-copy">Publish products before adding them to a collection.</p>
          ) : (
            <div className="admin-seasonal-product-list">
              {visibleProducts.map((product) => (
                <label key={product.id}>
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={(event) => toggleProduct(product.id, event.target.checked)}
                  />
                  <span>{product.name}{product.unit ? ` · ${product.unit}` : ""}{product.brand ? ` · ${product.brand}` : ""}</span>
                </label>
              ))}
              {visibleProducts.length === 0 && <p className="dashboard-empty-copy">No published products match that search.</p>}
            </div>
          )}
        </fieldset>

        <div className="admin-form-actions">
          <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save collection" : "Create collection"}</button>
          {editingId && <button type="button" className="admin-secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <div className="admin-seasonal-list">
        <h3>Scheduled collections</h3>
        {loading ? (
          <p className="dashboard-loading" role="status">Loading collections…</p>
        ) : collections.length === 0 ? (
          <p className="dashboard-empty-copy">No seasonal collections have been configured.</p>
        ) : collections.map((collection) => (
          <article key={collection.id}>
            <div>
              <strong>{collection.title}</strong>
              <small>{collection.starts_on} – {collection.ends_on}{collection.manual_override ? " · Manual date override" : ""}</small>
            </div>
            <span className={collection.is_active ? "admin-published" : "admin-draft"}>
              {collection.is_active ? "Enabled" : "Disabled"}
            </span>
            <div className="admin-product-actions">
              <button type="button" onClick={() => void editCollection(collection)} disabled={busy}>Edit</button>
              <button type="button" onClick={() => void toggleActive(collection)} disabled={busy}>{collection.is_active ? "Disable" : "Enable"}</button>
              <button type="button" onClick={() => void deleteCollection(collection)} disabled={busy}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
