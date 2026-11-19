"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/auth/LogoutButton";

type Category = {
  id: string;
  name: string;
  name_hi: string | null;
};

type Product = {
  id: string;
  category_id: string | null;
  sku: string | null;
  name: string;
  name_hi: string | null;
  description: string | null;
  description_hi: string | null;
  price: number | null;
  stock_status: "available" | "limited" | "out_of_stock";
  image_url: string | null;
  is_published: boolean;
};

type Offer = {
  id: string;
  title: string;
  title_hi: string | null;
  description: string | null;
  is_active: boolean;
};

const blankProduct = {
  category_id: "",
  sku: "",
  name: "",
  name_hi: "",
  description: "",
  description_hi: "",
  price: "",
  stock_status: "available" as Product["stock_status"],
  is_published: true,
};

export default function AdminDashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(blankProduct);
  const [offerForm, setOfferForm] = useState({ title: "", title_hi: "", description: "", is_active: true });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
      if (claimsError || !claimsData?.claims) throw new Error("Your session has expired.");

      const [categoriesResult, productsResult, offersResult] = await Promise.all([
        supabase.from("categories").select("id, name, name_hi").order("sort_order"),
        supabase.from("products").select("id, category_id, sku, name, name_hi, description, description_hi, price, stock_status, image_url, is_published").order("sort_order"),
        supabase.from("offers").select("id, title, title_hi, description, is_active").order("created_at", { ascending: false }),
      ]);
      if (categoriesResult.error) throw categoriesResult.error;
      if (productsResult.error) throw productsResult.error;

      setCategories(categoriesResult.data ?? []);
      setProducts((productsResult.data ?? []).map((product) => ({
        ...product,
        price: product.price === null ? null : Number(product.price),
      })) as Product[]);
      if (offersResult.error && offersResult.error.code !== "42P01") throw offersResult.error;
      setOffers((offersResult.data ?? []) as Offer[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Owner data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  function editProduct(product: Product) {
    setEditingId(product.id);
    setForm({
      category_id: product.category_id ?? "",
      sku: product.sku ?? "",
      name: product.name,
      name_hi: product.name_hi ?? "",
      description: product.description ?? "",
      description_hi: product.description_hi ?? "",
      price: product.price === null ? "" : String(product.price),
      stock_status: product.stock_status,
      is_published: product.is_published,
    });
    setImageFile(null);
    setSuccess("");
  }

  function resetProductForm() {
    setEditingId("");
    setForm(blankProduct);
    setImageFile(null);
  }

  async function uploadProductImage(supabase: ReturnType<typeof createClient>, productId: string) {
    if (!imageFile) return null;
    if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
      throw new Error("Use a JPG, PNG or WebP image.");
    }
    if (imageFile.size > 5 * 1024 * 1024) throw new Error("Image must be smaller than 5 MB.");

    const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, imageFile, { cacheControl: "3600", upsert: false, contentType: imageFile.type });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const price = form.price.trim() === "" ? null : Number(form.price);
      if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error("Enter a valid non-negative price.");

      const productId = editingId || crypto.randomUUID();
      const imageUrl = await uploadProductImage(supabase, productId);
      const payload = {
        category_id: form.category_id || null,
        sku: form.sku.trim() || null,
        name: form.name.trim(),
        name_hi: form.name_hi.trim() || null,
        description: form.description.trim() || null,
        description_hi: form.description_hi.trim() || null,
        price,
        stock_status: form.stock_status,
        is_published: form.is_published,
        ...(imageUrl ? { image_url: imageUrl } : {}),
      };

      if (!payload.name) throw new Error("Product name is required.");
      const result = editingId
        ? await supabase.from("products").update(payload).eq("id", editingId)
        : await supabase.from("products").insert({ id: productId, ...payload });
      if (result.error) throw result.error;
      setSuccess(editingId ? "Product updated." : "Product created.");
      resetProductForm();
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Product could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete "${product.name}"? Existing order items remain preserved.`)) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("products").delete().eq("id", product.id);
      if (deleteError) throw deleteError;
      setSuccess("Product deleted.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Product could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function saveOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      if (!offerForm.title.trim()) throw new Error("Offer title is required.");
      const { error: insertError } = await supabase.from("offers").insert({
        title: offerForm.title.trim(),
        title_hi: offerForm.title_hi.trim() || null,
        description: offerForm.description.trim() || null,
        is_active: offerForm.is_active,
      });
      if (insertError) throw insertError;
      setOfferForm({ title: "", title_hi: "", description: "", is_active: true });
      setSuccess("Offer created.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Offer could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleOffer(offer: Offer) {
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("offers")
        .update({ is_active: !offer.is_active })
        .eq("id", offer.id);
      if (updateError) throw updateError;
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Offer could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="auth-brand" href="/">MINI <span>SUPER</span> STORE</Link>
        <div><Link href="/staff">Staff workspace</Link><LogoutButton /></div>
      </header>
      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div><p className="auth-eyebrow">OWNER WORKSPACE</p><h1>Catalogue management</h1></div>
          <button type="button" className="dashboard-refresh" onClick={() => void loadData()} disabled={loading}>Refresh</button>
        </div>
        {error && <p className="dashboard-error" role="alert">{error}</p>}
        {success && <p className="dashboard-success" role="status">{success}</p>}
        {loading ? <div className="dashboard-loading" role="status">Loading catalogue…</div> : (
          <div className="admin-grid">
            <form className="admin-product-form" onSubmit={saveProduct}>
              <h2>{editingId ? "Edit product" : "Add product"}</h2>
              <label>Category
                <select value={form.category_id} onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}>
                  <option value="">Uncategorised</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label>Product name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required maxLength={160} /></label>
              <label>Hindi name<input value={form.name_hi} onChange={(event) => setForm((current) => ({ ...current, name_hi: event.target.value }))} maxLength={160} /></label>
              <label>SKU<input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} maxLength={100} /></label>
              <label>Price (₹)<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} /></label>
              <label>Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={1000} /></label>
              <label>Hindi description<textarea value={form.description_hi} onChange={(event) => setForm((current) => ({ ...current, description_hi: event.target.value }))} maxLength={1000} /></label>
              <label>Stock status
                <select value={form.stock_status} onChange={(event) => setForm((current) => ({ ...current, stock_status: event.target.value as Product["stock_status"] }))}>
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </label>
              <label>Product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>
              <label className="admin-checkbox"><input type="checkbox" checked={form.is_published} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))} /> Published on website</label>
              <div className="admin-form-actions">
                <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add product"}</button>
                {editingId && <button type="button" className="admin-secondary" onClick={resetProductForm}>Cancel</button>}
              </div>
            </form>

            <div className="admin-catalogue">
              <h2>Products <span>{products.length}</span></h2>
              {products.length === 0 ? <p className="dashboard-empty-copy">No products have been added.</p> : (
                <div className="admin-product-list">
                  {products.map((product) => (
                    <article key={product.id}>
                      {product.image_url ? (
                        <Image src={product.image_url} alt="" width={108} height={108} sizes="54px" />
                      ) : <span className="admin-product-placeholder">M</span>}
                      <div><strong>{product.name}</strong><small>{product.price === null ? "Ask for price" : `₹${product.price.toFixed(2)} · ${product.stock_status.replaceAll("_", " ")}`}</small></div>
                      <span className={product.is_published ? "admin-published" : "admin-draft"}>{product.is_published ? "Published" : "Draft"}</span>
                      <div className="admin-product-actions">
                        <button type="button" onClick={() => editProduct(product)}>Edit</button>
                        <button type="button" onClick={() => void deleteProduct(product)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <form className="admin-offer-form" onSubmit={saveOffer}>
                <h2>Store offers</h2>
                <label>Title<input value={offerForm.title} onChange={(event) => setOfferForm((current) => ({ ...current, title: event.target.value }))} required maxLength={160} /></label>
                <label>Hindi title<input value={offerForm.title_hi} onChange={(event) => setOfferForm((current) => ({ ...current, title_hi: event.target.value }))} maxLength={160} /></label>
                <label>Description<textarea value={offerForm.description} onChange={(event) => setOfferForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} /></label>
                <label className="admin-checkbox"><input type="checkbox" checked={offerForm.is_active} onChange={(event) => setOfferForm((current) => ({ ...current, is_active: event.target.checked }))} /> Active</label>
                <button type="submit" disabled={busy}>Create offer</button>
              </form>
              {offers.length > 0 && (
                <div className="admin-offer-list">
                  {offers.map((offer) => (
                    <article key={offer.id}>
                      <div><strong>{offer.title}</strong>{offer.description && <p>{offer.description}</p>}</div>
                      <button type="button" onClick={() => void toggleOffer(offer)}>{offer.is_active ? "Deactivate" : "Activate"}</button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
