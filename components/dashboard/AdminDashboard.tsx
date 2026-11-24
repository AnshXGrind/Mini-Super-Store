"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/auth/LogoutButton";
import ProductBulkImport from "@/components/dashboard/ProductBulkImport";
import SeasonalCollectionsManager, {
  type SeasonalProductOption,
} from "@/components/dashboard/SeasonalCollectionsManager";
import StoreLogo from "@/components/store/StoreLogo";
import { auditCatalogue } from "@/lib/catalogue-audit";
import { shouldLoadProductImageDirectly } from "@/lib/product-image";

type Category = {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  description: string | null;
  description_hi: string | null;
  is_active: boolean;
  sort_order: number;
};

type Product = {
  id: string;
  category_id: string | null;
  sku: string | null;
  name: string;
  name_hi: string | null;
  brand: string | null;
  subcategory: string | null;
  unit: string | null;
  mrp: number | null;
  quantity: number | null;
  barcode: string | null;
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
  description_hi: string | null;
  is_active: boolean;
};

type AdminOrder = {
  id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  fulfilment_type: "pickup" | "delivery";
  delivery_address: string | null;
  total_amount: number;
  created_at: string;
  assigned_staff_id: string | null;
  order_items: Array<{ product_name_snapshot: string; quantity: number }>;
};

type StaffMember = {
  id: string;
  full_name: string | null;
};

const blankProduct = {
  category_id: "",
  sku: "",
  name: "",
  name_hi: "",
  brand: "",
  subcategory: "",
  unit: "",
  mrp: "",
  description: "",
  description_hi: "",
  price: "",
  quantity: "",
  barcode: "",
  stock_status: "available" as Product["stock_status"],
  is_published: true,
};

const blankCategory = {
  slug: "",
  name: "",
  name_hi: "",
  description: "",
  description_hi: "",
  is_active: true,
  sort_order: "0",
};

const activeOrderStatuses = new Set(["confirmed", "preparing", "ready_for_pickup", "out_for_delivery"]);

const orderActionErrors: Record<string, string> = {
  ORDER_ALREADY_FINAL: "This order is already closed and cannot be changed.",
  INVALID_ADMIN_STATUS_TRANSITION: "That status change is not allowed for this order.",
  INVALID_STAFF_STATUS_TRANSITION: "That status change is not allowed for this order.",
  ORDER_NOT_FOUND: "This order no longer exists. Refresh the order list.",
  STAFF_OR_ADMIN_REQUIRED: "Your account no longer has permission to change orders.",
};

function getOrderActionError(caught: unknown, fallback: string) {
  const message = caught instanceof Error ? caught.message : "";
  const code = Object.keys(orderActionErrors).find((key) => message.includes(key));
  return code ? orderActionErrors[code] : (message || fallback);
}

export default function AdminDashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffSelections, setStaffSelections] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(blankProduct);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [categoryForm, setCategoryForm] = useState(blankCategory);
  const [offerForm, setOfferForm] = useState({ title: "", title_hi: "", description: "", description_hi: "", is_active: true });
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
      let hasSession = false;
      try {
        const { data: claimsData } = await supabase.auth.getClaims();
        if (claimsData?.claims) hasSession = true;
      } catch {}
      if (!hasSession) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) hasSession = true;
      }
      if (!hasSession) throw new Error("Your session has expired.");

      const [categoriesResult, productsResult, offersResult, ordersResult, staffRolesResult] = await Promise.all([
        supabase.from("categories").select("id, slug, name, name_hi, description, description_hi, is_active, sort_order").order("sort_order"),
        supabase.from("products").select("id, category_id, sku, name, name_hi, brand, subcategory, unit, mrp, price, quantity, barcode, description, description_hi, stock_status, image_url, is_published", { count: "exact" }).order("sort_order"),
        supabase.from("offers").select("id, title, title_hi, description, description_hi, is_active").order("created_at", { ascending: false }),
        supabase.from("orders").select("id, status, customer_name, customer_phone, fulfilment_type, delivery_address, total_amount, created_at, assigned_staff_id, order_items(product_name_snapshot, quantity)").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id").eq("role", "staff"),
      ]);
      if (categoriesResult.error) throw categoriesResult.error;
      if (productsResult.error) throw productsResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (staffRolesResult.error) throw staffRolesResult.error;

      setCategories(categoriesResult.data ?? []);
      setProducts((productsResult.data ?? []).map((product) => ({
        ...product,
        price: product.price === null ? null : Number(product.price),
        mrp: product.mrp === null ? null : Number(product.mrp),
        quantity: product.quantity === null ? null : Number(product.quantity),
      })) as Product[]);
      setProductCount(productsResult.count ?? productsResult.data?.length ?? 0);
      if (offersResult.error && offersResult.error.code !== "42P01") throw offersResult.error;
      setOffers((offersResult.data ?? []) as Offer[]);
      setOrders((ordersResult.data ?? []).map((order) => ({
        ...order,
        total_amount: Number(order.total_amount),
        order_items: order.order_items ?? [],
      })) as AdminOrder[]);

      const staffIds = (staffRolesResult.data ?? []).map((row) => row.user_id);
      if (staffIds.length > 0) {
        const { data: staffProfiles, error: staffProfilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", staffIds);
        if (staffProfilesError) throw staffProfilesError;
        setStaff((staffProfiles ?? []).map((profile) => ({
          id: profile.id,
          full_name: profile.full_name,
        })) as StaffMember[]);
      } else {
        setStaff([]);
      }
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
      brand: product.brand ?? "",
      subcategory: product.subcategory ?? "",
      unit: product.unit ?? "",
      mrp: product.mrp === null ? "" : String(product.mrp),
      description: product.description ?? "",
      description_hi: product.description_hi ?? "",
      price: product.price === null ? "" : String(product.price),
      quantity: product.quantity === null ? "" : String(product.quantity),
      barcode: product.barcode ?? "",
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

  function editCategory(category: Category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      slug: category.slug,
      name: category.name,
      name_hi: category.name_hi ?? "",
      description: category.description ?? "",
      description_hi: category.description_hi ?? "",
      is_active: category.is_active,
      sort_order: String(category.sort_order),
    });
    setSuccess("");
  }

  function resetCategoryForm() {
    setEditingCategoryId("");
    setCategoryForm(blankCategory);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const name = categoryForm.name.trim();
      const slug = (categoryForm.slug.trim() || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const sortOrder = Number(categoryForm.sort_order);
      if (!name) throw new Error("Category name is required.");
      if (!slug) throw new Error("Enter an English category name or slug.");
      if (!Number.isInteger(sortOrder)) throw new Error("Sort order must be a whole number.");

      const payload = {
        slug,
        name,
        name_hi: categoryForm.name_hi.trim() || null,
        description: categoryForm.description.trim() || null,
        description_hi: categoryForm.description_hi.trim() || null,
        is_active: categoryForm.is_active,
        sort_order: sortOrder,
      };
      const supabase = createClient();
      const result = editingCategoryId
        ? await supabase.from("categories").update(payload).eq("id", editingCategoryId)
        : await supabase.from("categories").insert(payload);
      if (result.error) throw result.error;
      setSuccess(editingCategoryId ? "Category updated." : "Category created.");
      resetCategoryForm();
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Category could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(category: Category) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await createClient()
        .from("categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);
      if (updateError) throw updateError;
      setSuccess(category.is_active ? "Category deactivated." : "Category activated.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Category status could not be changed.");
    } finally {
      setBusy(false);
    }
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
    return { url: data.publicUrl, path };
  }

  async function removeStoredImage(supabase: ReturnType<typeof createClient>, publicUrl: string) {
    const marker = "/product-images/";
    const index = publicUrl.indexOf(marker);
    if (index === -1) return;
    const path = decodeURIComponent(publicUrl.slice(index + marker.length).split("?")[0]);
    if (!path) return;
    // Best effort: a failed cleanup must not block saving the product.
    await supabase.storage.from("product-images").remove([path]);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const name = form.name.trim();
      if (!name) throw new Error("Product name is required.");

      const supabase = createClient();
      const price = form.price.trim() === "" ? null : Number(form.price);
      if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error("Enter a valid non-negative price.");
      const mrp = form.mrp.trim() === "" ? null : Number(form.mrp);
      if (mrp !== null && (!Number.isFinite(mrp) || mrp < 0)) throw new Error("Enter a valid non-negative MRP.");
      if (price !== null && mrp !== null && price > mrp) throw new Error("Selling price cannot be higher than MRP.");
      const quantity = form.quantity.trim() === "" ? null : Number(form.quantity);
      if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0)) throw new Error("Enter a whole-number quantity of zero or more.");
      if (quantity === 0 && form.stock_status !== "out_of_stock") {
        throw new Error("Set stock status to out of stock when quantity is zero.");
      }

      const productId = editingId || crypto.randomUUID();
      const upload = await uploadProductImage(supabase, productId);
      const payload = {
        category_id: form.category_id || null,
        sku: form.sku.trim() || null,
        name,
        name_hi: form.name_hi.trim() || null,
        brand: form.brand.trim() || null,
        subcategory: form.subcategory.trim() || null,
        unit: form.unit.trim() || null,
        mrp,
        description: form.description.trim() || null,
        description_hi: form.description_hi.trim() || null,
        price,
        quantity,
        barcode: form.barcode.trim() || null,
        stock_status: form.stock_status,
        is_published: form.is_published,
        ...(upload ? { image_url: upload.url } : {}),
      };

      let committed = false;
      try {
        const result = editingId
          ? await supabase.from("products").update(payload).eq("id", editingId)
          : await supabase.from("products").insert({ id: productId, ...payload });
        if (result.error) throw result.error;
        committed = true;
      } finally {
        if (!committed && upload) await removeStoredImage(supabase, upload.url);
      }

      if (editingId && upload) {
        const previousUrl = products.find((product) => product.id === editingId)?.image_url;
        if (previousUrl) await removeStoredImage(supabase, previousUrl);
      }

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
        description_hi: offerForm.description_hi.trim() || null,
        is_active: offerForm.is_active,
      });
      if (insertError) throw insertError;
      setOfferForm({ title: "", title_hi: "", description: "", description_hi: "", is_active: true });
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

  async function confirmAndAssignOrder(order: AdminOrder) {
    const staffId = staffSelections[order.id];
    if (!staffId) {
      setError("Choose a staff member before confirming this order.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("orders")
        .update({ status: "confirmed", assigned_staff_id: staffId })
        .eq("id", order.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("This order is no longer pending. Refresh the order list.");
      setSuccess("Order confirmed and assigned to staff.");
      await loadData();
    } catch (caught) {
      setError(getOrderActionError(caught, "Order could not be confirmed."));
    } finally {
      setBusy(false);
    }
  }

  async function cancelPendingOrder(order: AdminOrder) {
    if (!window.confirm(`Cancel order ${order.id.slice(0, 8).toUpperCase()}?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("This order is no longer pending. Refresh the order list.");
      setSuccess("Order cancelled.");
      await loadData();
    } catch (caught) {
      setError(getOrderActionError(caught, "Order could not be cancelled."));
    } finally {
      setBusy(false);
    }
  }

  async function reassignOrder(order: AdminOrder) {
    const staffId = staffSelections[order.id] ?? order.assigned_staff_id ?? "";
    if (!staffId) {
      setError("Choose a staff member before reassigning this order.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("orders")
        .update({ assigned_staff_id: staffId })
        .eq("id", order.id)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("This order could not be reassigned. Refresh the order list.");
      setSuccess("Order reassigned.");
      await loadData();
    } catch (caught) {
      setError(getOrderActionError(caught, "Order could not be reassigned."));
    } finally {
      setBusy(false);
    }
  }

  async function cancelActiveOrder(order: AdminOrder) {
    if (!window.confirm(`Cancel order ${order.id.slice(0, 8).toUpperCase()}?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("update_store_order_status", {
        p_order_id: order.id,
        p_status: "cancelled",
        p_staff_note: null,
      });
      if (rpcError) throw rpcError;
      setSuccess("Order cancelled.");
      await loadData();
    } catch (caught) {
      setError(getOrderActionError(caught, "Order could not be cancelled."));
    } finally {
      setBusy(false);
    }
  }

  const catalogueAudit = useMemo(() => auditCatalogue(products), [products]);
  const seasonalProducts = useMemo<SeasonalProductOption[]>(
    () =>
      products
        .filter((product) => product.is_published)
        .map(({ id, name, brand, unit }) => ({ id, name, brand, unit })),
    [products],
  );

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="auth-brand" href="/">
          <StoreLogo size={36} />
          <span className="auth-brand-wordmark">MINI <span>SUPER</span> STORE</span>
        </Link>
        <div><Link href="/">View store</Link><LogoutButton /></div>
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
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.is_active ? "" : " (inactive)"}</option>)}
                </select>
              </label>
              <label>Product name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required maxLength={160} /></label>
              <label>Hindi name<input value={form.name_hi} onChange={(event) => setForm((current) => ({ ...current, name_hi: event.target.value }))} maxLength={160} /></label>
              <label>SKU<input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} maxLength={100} /></label>
              <label>Brand<input value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} maxLength={160} /></label>
              <label>Subcategory<input value={form.subcategory} onChange={(event) => setForm((current) => ({ ...current, subcategory: event.target.value }))} maxLength={160} /></label>
              <label>Pack size / unit<input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} maxLength={80} /></label>
              <label>MRP (₹)<input type="number" min="0" step="0.01" value={form.mrp} onChange={(event) => setForm((current) => ({ ...current, mrp: event.target.value }))} /></label>
              <label>Selling price (₹)<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} /></label>
              <label>Quantity<input type="number" min="0" step="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} /></label>
              <label>Barcode<input value={form.barcode} onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))} maxLength={100} /></label>
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
              <section className="admin-category-management" aria-labelledby="admin-category-title">
                <h2 id="admin-category-title">Categories</h2>
                <form className="admin-category-form" onSubmit={saveCategory}>
                  <h3>{editingCategoryId ? "Edit category" : "Add category"}</h3>
                  <label>Name<input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} required maxLength={160} /></label>
                  <label>Slug<input value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} maxLength={160} placeholder="Generated from the English name if blank" /></label>
                  <label>Hindi name<input value={categoryForm.name_hi} onChange={(event) => setCategoryForm((current) => ({ ...current, name_hi: event.target.value }))} maxLength={160} /></label>
                  <label>Description<textarea value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} /></label>
                  <label>Hindi description<textarea value={categoryForm.description_hi} onChange={(event) => setCategoryForm((current) => ({ ...current, description_hi: event.target.value }))} maxLength={500} /></label>
                  <label>Sort order<input type="number" step="1" value={categoryForm.sort_order} onChange={(event) => setCategoryForm((current) => ({ ...current, sort_order: event.target.value }))} /></label>
                  <label className="admin-checkbox"><input type="checkbox" checked={categoryForm.is_active} onChange={(event) => setCategoryForm((current) => ({ ...current, is_active: event.target.checked }))} /> Active on website</label>
                  <div className="admin-form-actions">
                    <button type="submit" disabled={busy}>{busy ? "Saving…" : editingCategoryId ? "Save category" : "Add category"}</button>
                    {editingCategoryId && <button type="button" className="admin-secondary" onClick={resetCategoryForm}>Cancel</button>}
                  </div>
                </form>
                <div className="admin-category-list">
                  {categories.map((category) => (
                    <article key={category.id}>
                      <div><strong>{category.name}</strong><small>{category.slug}</small></div>
                      <span className={category.is_active ? "admin-published" : "admin-draft"}>{category.is_active ? "Active" : "Inactive"}</span>
                      <div className="admin-product-actions">
                        <button type="button" onClick={() => editCategory(category)}>Edit</button>
                        <button type="button" onClick={() => void toggleCategory(category)} disabled={busy}>{category.is_active ? "Deactivate" : "Activate"}</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <ProductBulkImport onImported={loadData} />
              <section className="catalogue-audit" aria-labelledby="catalogue-audit-title">
                <h2 id="catalogue-audit-title">Catalogue checks</h2>
                <p>{catalogueAudit.duplicateSkuGroups.length} duplicate SKU groups · {catalogueAudit.incompleteProducts.length} incomplete product records</p>
                {catalogueAudit.duplicateSkuGroups.length > 0 && (
                  <ul>
                    {catalogueAudit.duplicateSkuGroups.map((group) => (
                      <li key={group.sku}>{group.sku}: {group.products.map((product) => product.name).join(", ")}</li>
                    ))}
                  </ul>
                )}
                {catalogueAudit.incompleteProducts.length > 0 && (
                  <details>
                    <summary>Review incomplete records</summary>
                    <ul>
                      {catalogueAudit.incompleteProducts.slice(0, 100).map(({ product, missingFields }) => (
                        <li key={product.id}>
                          <button type="button" onClick={() => {
                            const record = products.find((item) => item.id === product.id);
                            if (record) editProduct(record);
                          }}>
                            {product.name}
                          </button>
                          <span> — missing {missingFields.join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                    {catalogueAudit.incompleteProducts.length > 100 && <small>Showing the first 100 incomplete records.</small>}
                  </details>
                )}
              </section>

              <h2>Products <span>{productCount}</span></h2>
              {products.length === 0 ? <p className="dashboard-empty-copy">No products have been added.</p> : (
                <div className="admin-product-list">
                  {products.map((product) => (
                    <article key={product.id}>
                      {product.image_url ? (
                        <Image src={product.image_url} alt="" width={108} height={108} sizes="54px" unoptimized={shouldLoadProductImageDirectly(product.image_url)} />
                      ) : <span className="admin-product-placeholder">M</span>}
                      <div>
                        <strong>{product.name}</strong>
                        <small>
                          {[product.brand, product.unit, product.price === null ? "No selling price" : `₹${product.price.toFixed(2)}`, product.stock_status.replaceAll("_", " ")]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </div>
                      <span className={product.is_published ? "admin-published" : "admin-draft"}>{product.is_published ? "Published" : "Draft"}</span>
                      <div className="admin-product-actions">
                        <button type="button" onClick={() => editProduct(product)}>Edit</button>
                        <button type="button" onClick={() => void deleteProduct(product)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <SeasonalCollectionsManager products={seasonalProducts} />

              <section className="admin-orders" aria-labelledby="admin-orders-title">
                <div className="admin-orders-heading">
                  <h2 id="admin-orders-title">Customer orders <span>{orders.filter((order) => order.status === "pending").length} pending</span></h2>
                  <p>Confirm pending requests and assign them to a staff member.</p>
                </div>
                {orders.length === 0 ? (
                  <p className="dashboard-empty-copy">No customer orders have been received yet.</p>
                ) : (
                  <div className="admin-order-list">
                    {orders.map((order) => {
                      const assignedStaff = staff.find((member) => member.id === order.assigned_staff_id);
                      return (
                        <article className="admin-order-card" key={order.id}>
                          <header>
                            <div>
                              <strong>Order {order.id.slice(0, 8).toUpperCase()}</strong>
                              <small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(order.created_at))}</small>
                            </div>
                            <span className={`order-status status-${order.status}`}>{order.status.replaceAll("_", " ")}</span>
                          </header>
                          <div className="admin-order-summary">
                            <div>
                              <strong>{order.customer_name}</strong>
                              <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
                              <small>{order.fulfilment_type === "delivery" ? "Delivery" : "Store pickup"}{order.delivery_address ? ` · ${order.delivery_address}` : ""}</small>
                            </div>
                            <div className="admin-order-items">
                              {order.order_items.map((item, index) => (
                                <span key={`${order.id}-${index}`}>{item.quantity} × {item.product_name_snapshot}</span>
                              ))}
                            </div>
                            <strong>₹{order.total_amount.toFixed(2)}</strong>
                          </div>
                          {order.status === "pending" && (
                            <div className="admin-order-actions">
                              <label>
                                Assign staff
                                <select
                                  value={staffSelections[order.id] ?? ""}
                                  onChange={(event) => setStaffSelections((current) => ({ ...current, [order.id]: event.target.value }))}
                                  disabled={busy || staff.length === 0}
                                >
                                  <option value="">Choose staff member</option>
                                  {staff.map((member) => (
                                    <option value={member.id} key={member.id}>{member.full_name || `Staff ${member.id.slice(0, 8)}`}</option>
                                  ))}
                                </select>
                              </label>
                              <button type="button" onClick={() => void confirmAndAssignOrder(order)} disabled={busy || staff.length === 0}>
                                Confirm and assign
                              </button>
                              <button type="button" className="admin-cancel-order" onClick={() => void cancelPendingOrder(order)} disabled={busy}>
                                Cancel order
                              </button>
                              {staff.length === 0 && <small className="admin-no-staff">Create a staff account and assign its staff role before confirming orders.</small>}
                            </div>
                          )}
                          {activeOrderStatuses.has(order.status) && (
                            <div className="admin-order-actions">
                              <label>
                                Reassign staff
                                <select
                                  value={staffSelections[order.id] ?? order.assigned_staff_id ?? ""}
                                  onChange={(event) => setStaffSelections((current) => ({ ...current, [order.id]: event.target.value }))}
                                  disabled={busy || staff.length === 0}
                                >
                                  <option value="">Choose staff member</option>
                                  {staff.map((member) => (
                                    <option value={member.id} key={member.id}>{member.full_name || `Staff ${member.id.slice(0, 8)}`}</option>
                                  ))}
                                </select>
                              </label>
                              <button type="button" onClick={() => void reassignOrder(order)} disabled={busy || staff.length === 0}>
                                Reassign
                              </button>
                              <button type="button" className="admin-cancel-order" onClick={() => void cancelActiveOrder(order)} disabled={busy}>
                                Cancel order
                              </button>
                            </div>
                          )}
                          {order.assigned_staff_id && (
                            <p className="admin-assignee">Assigned to: {assignedStaff?.full_name || "Staff member"}</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <form className="admin-offer-form" onSubmit={saveOffer}>
                <h2>Store offers</h2>
                <label>Title<input value={offerForm.title} onChange={(event) => setOfferForm((current) => ({ ...current, title: event.target.value }))} required maxLength={160} /></label>
                <label>Hindi title<input value={offerForm.title_hi} onChange={(event) => setOfferForm((current) => ({ ...current, title_hi: event.target.value }))} maxLength={160} /></label>
                <label>Description<textarea value={offerForm.description} onChange={(event) => setOfferForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} /></label>
                <label>Hindi description<textarea value={offerForm.description_hi} onChange={(event) => setOfferForm((current) => ({ ...current, description_hi: event.target.value }))} maxLength={500} /></label>
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
