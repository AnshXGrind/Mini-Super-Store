"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductImportRow } from "@/lib/product-import";
import { createClient } from "@/lib/supabase/client";

type ImportJob = {
  id: string;
  status: "staging" | "queued" | "processing" | "completed" | "failed";
  total_rows: number;
  processed_rows: number;
  added_rows: number;
  updated_rows: number;
  skipped_rows: number;
  failed_rows: number;
  last_error: string | null;
};

type ImportIssue = {
  row_number: number;
  status: string;
  error: string | null;
};

type ProductBulkImportProps = {
  onImported: () => Promise<void>;
};

const stagingBatchSize = 500;
const previewLimit = 25;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || "The background import could not be started.";
}

export default function ProductBulkImport({ onImported }: ProductBulkImportProps) {
  const rowsRef = useRef<ProductImportRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ProductImportRow[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [validationErrors, setValidationErrors] = useState(0);
  const [duplicateRows, setDuplicateRows] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [previewIssues, setPreviewIssues] = useState<ProductImportRow[]>([]);
  const [parseBusy, setParseBusy] = useState(false);
  const [stagingBusy, setStagingBusy] = useState(false);
  const [stageProgress, setStageProgress] = useState(0);
  const [monitoring, setMonitoring] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [issueCount, setIssueCount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function restoreActiveJob() {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("product_import_jobs")
          .select("id, status, total_rows, processed_rows, added_rows, updated_rows, skipped_rows, failed_rows, last_error")
          .in("status", ["queued", "processing", "completed", "failed"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (queryError) throw queryError;
        if (!active || !data) return;
        const restoredJob = data as ImportJob;
        setJob(restoredJob);
        if (restoredJob.status === "completed" || restoredJob.status === "failed") {
          const { data: issueRows, count, error: issuesError } = await supabase
            .from("product_import_rows")
            .select("row_number, status, error", { count: "exact" })
            .eq("job_id", restoredJob.id)
            .in("status", ["failed", "skipped"])
            .order("row_number")
            .limit(200);
          if (issuesError) throw issuesError;
          if (!active) return;
          setIssues((issueRows ?? []) as ImportIssue[]);
          setIssueCount(count ?? 0);
          if (restoredJob.status === "failed") {
            setError(restoredJob.last_error || "The product import failed.");
          }
        }
      } catch {
        if (active) setError("Could not check for a previous product import.");
      }
    }
    void restoreActiveJob();
    return () => {
      active = false;
    };
  }, []);

  async function previewFile() {
    if (!file) return;
    setParseBusy(true);
    setError("");
    setMessage("");
    setJob(null);
    setIssues([]);
    try {
      if (file.size > 100 * 1024 * 1024) {
        throw new Error("The selected file is larger than the 100 MB import limit.");
      }
      const { readProductImportFile } = await import("@/lib/product-import-file");
      const rows = await readProductImportFile(file);
      if (rows.length === 0) throw new Error("The selected file has no product rows.");
      rowsRef.current = rows;
      setRowCount(rows.length);
      setPreviewRows(rows.slice(0, previewLimit));
      setValidationErrors(rows.filter((row) => row.validationError).length);
      setDuplicateRows(rows.filter((row) => row.skipReason).length);
      setWarnings(rows.filter((row) => row.warning).length);
      setPreviewIssues(rows.filter((row) => row.validationError || row.skipReason).slice(0, 200));
      setMessage(`Preview ready: ${rows.length.toLocaleString()} product rows.`);
    } catch (caught) {
      rowsRef.current = [];
      setRowCount(0);
      setPreviewRows([]);
      setValidationErrors(0);
      setDuplicateRows(0);
      setWarnings(0);
      setPreviewIssues([]);
      setError(caught instanceof Error ? caught.message : "The selected file could not be read.");
    } finally {
      setParseBusy(false);
    }
  }

  async function readJob(jobId: string) {
    const { data, error: queryError } = await createClient()
      .from("product_import_jobs")
      .select("id, status, total_rows, processed_rows, added_rows, updated_rows, skipped_rows, failed_rows, last_error")
      .eq("id", jobId)
      .single();
    if (queryError) throw queryError;
    const currentJob = data as ImportJob;
    setJob(currentJob);
    return currentJob;
  }

  async function loadIssues(jobId: string) {
    const { data, count, error: queryError } = await createClient()
      .from("product_import_rows")
      .select("row_number, status, error", { count: "exact" })
      .eq("job_id", jobId)
      .in("status", ["failed", "skipped"])
      .order("row_number")
      .limit(200);
    if (queryError) throw queryError;
    setIssues((data ?? []) as ImportIssue[]);
    setIssueCount(count ?? 0);
  }

  async function monitorJob(jobId: string) {
    setMonitoring(true);
    setError("");
    try {
      for (let attempt = 0; attempt < 300; attempt += 1) {
        await wait(1000);
        const currentJob = await readJob(jobId);
        if (currentJob.status === "completed" || currentJob.status === "failed") {
          await loadIssues(jobId);
          if (currentJob.status === "completed") {
            setMessage("Product import finished.");
            await onImported();
          } else {
            setError(currentJob.last_error || "The product import failed.");
          }
          return;
        }
      }
      setMessage("The import is still running in the background. You can leave this page and resume it later.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import status could not be loaded.");
    } finally {
      setMonitoring(false);
    }
  }

  async function startWorker(jobId: string) {
    setError("");
    const response = await fetch(`/api/admin/product-imports/${jobId}/start`, {
      method: "POST",
    });
    if (!response.ok) throw new Error(await responseError(response));
    setMessage("Import is processing in background batches.");
    await monitorJob(jobId);
  }

  async function importProducts() {
    const rows = rowsRef.current;
    if (!rows.length) return;
    setStagingBusy(true);
    setStageProgress(0);
    setError("");
    setMessage("");
    let jobId: string | null = null;
    let finalized = false;

    try {
      const supabase = createClient();
      const { data, error: createError } = await supabase.rpc("create_product_import_job", {
        p_total_rows: rows.length,
      });
      if (createError) throw createError;
      if (typeof data !== "string") throw new Error("The import job could not be created.");
      jobId = data;
      setJob({
        id: jobId,
        status: "staging",
        total_rows: rows.length,
        processed_rows: 0,
        added_rows: 0,
        updated_rows: 0,
        skipped_rows: 0,
        failed_rows: 0,
        last_error: null,
      });

      for (let offset = 0; offset < rows.length; offset += stagingBatchSize) {
        const batch = rows.slice(offset, offset + stagingBatchSize).map((row) => ({
          row_number: row.rowNumber,
          payload: row.payload,
          validation_error: row.validationError ?? null,
          skip_reason: row.skipReason ?? null,
        }));
        const { error: stageError } = await supabase.rpc("stage_product_import_rows", {
          p_job_id: jobId,
          p_rows: batch,
        });
        if (stageError) throw stageError;
        setStageProgress(Math.min(offset + batch.length, rows.length));
      }

      const { error: finalizeError } = await supabase.rpc("finalize_product_import_job", {
        p_job_id: jobId,
      });
      if (finalizeError) throw finalizeError;
      finalized = true;
      setJob((current) => current ? { ...current, status: "queued" } : current);
      setMessage("Import rows are staged. Starting the background worker…");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Product rows could not be staged.";
      setError(message);
      if (jobId && !finalized) {
        try {
          const { error: failError } = await createClient().rpc("fail_product_import_job", {
            p_job_id: jobId,
            p_error: message,
          });
          if (failError) console.error("Could not mark incomplete product import as failed", failError);
        } catch (failError) {
          console.error("Could not mark incomplete product import as failed", failError);
        }
        setJob((current) => current ? { ...current, status: "failed", last_error: message } : current);
      }
      return;
    } finally {
      setStagingBusy(false);
    }

    if (jobId) {
      try {
        await startWorker(jobId);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The background import could not be started.");
      }
    }
  }

  async function resumeJob() {
    if (!job) return;
    try {
      await startWorker(job.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The background import could not be resumed.");
    }
  }

  const previewIssueCount = validationErrors + duplicateRows;

  return (
    <section className="product-bulk-import" aria-labelledby="product-import-heading">
      <div className="product-bulk-heading">
        <div>
          <h2 id="product-import-heading">Bulk product tools</h2>
          <p>Preview and import .xlsx or .csv catalogues. Large imports run in resumable background batches.</p>
        </div>
        <a className="admin-secondary product-export-link" href="/api/admin/products/export">
          Download Excel catalogue
        </a>
      </div>

      <div className="product-import-controls">
        <label>
          Product file
          <input
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              rowsRef.current = [];
              setPreviewRows([]);
              setRowCount(0);
              setValidationErrors(0);
              setDuplicateRows(0);
              setWarnings(0);
              setPreviewIssues([]);
              setMessage("");
              setError("");
            }}
          />
        </label>
        <button type="button" onClick={() => void previewFile()} disabled={!file || parseBusy || stagingBusy}>
          {parseBusy ? "Reading file…" : "Preview"}
        </button>
        <button
          type="button"
          onClick={() => void importProducts()}
          disabled={
            !rowCount ||
            parseBusy ||
            stagingBusy ||
            monitoring ||
            job?.status === "queued" ||
            job?.status === "processing"
          }
        >
          {stagingBusy ? "Staging rows…" : "Import products"}
        </button>
      </div>

      {parseBusy && <p className="product-import-progress" role="status">Reading and validating the selected file…</p>}
      {stagingBusy && (
        <p className="product-import-progress" role="status">
          Staging {stageProgress.toLocaleString()} of {rowCount.toLocaleString()} rows…
        </p>
      )}
      {message && <p className="dashboard-success" role="status">{message}</p>}
      {error && <p className="dashboard-error" role="alert">{error}</p>}

      {rowCount > 0 && (
        <>
          <p className="product-import-counts">
            {rowCount.toLocaleString()} rows · {validationErrors} validation errors · {duplicateRows} duplicate rows to skip · {warnings} image warnings
          </p>
          <div className="product-import-preview">
            <table>
              <thead>
                <tr><th>Excel row</th><th>Product ID / SKU</th><th>Product name</th><th>Category</th><th>Price</th><th>Validation</th></tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.payload?.identifier || row.payload?.external_id || row.payload?.sku || "—"}</td>
                    <td>{row.payload?.name || "—"}</td>
                    <td>{row.payload?.category || "—"}</td>
                    <td>{row.payload?.price === undefined ? "—" : row.payload.price.toFixed(2)}</td>
                    <td className={row.validationError || row.skipReason ? "product-import-invalid" : row.warning ? "product-import-warning" : ""}>
                      {row.validationError || row.skipReason || row.warning || "Ready"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rowCount > previewRows.length && <p>Showing the first {previewRows.length} product rows.</p>}
          </div>
        </>
      )}

      {previewIssues.length > 0 && (
        <div className="product-import-issues">
          <h3>Validation issues before import</h3>
          <ul>
            {previewIssues.map((row) => (
              <li key={row.rowNumber}>{row.validationError || row.skipReason}</li>
            ))}
          </ul>
          {previewIssueCount > previewIssues.length && (
            <p>Showing {previewIssues.length} of {previewIssueCount} invalid or duplicate rows.</p>
          )}
        </div>
      )}

      {job && (
        <div className="product-import-job" role="status">
          <strong>Import status: {job.status}</strong>
          <span>
            {job.processed_rows.toLocaleString()} / {job.total_rows.toLocaleString()} processed ·
            {" "}Added {job.added_rows} · Updated {job.updated_rows} · Skipped {job.skipped_rows} · Failed {job.failed_rows}
          </span>
          {job.status === "queued" || job.status === "processing" ? (
            <button type="button" onClick={() => void resumeJob()} disabled={monitoring || stagingBusy}>
              {monitoring ? "Processing…" : "Resume background import"}
            </button>
          ) : null}
        </div>
      )}

      {issues.length > 0 && (
        <div className="product-import-issues">
          <h3>Import row results</h3>
          <ul>
            {issues.map((issue) => (
              <li key={`${issue.row_number}-${issue.status}`}>
                Row {issue.row_number} ({issue.status}): {issue.error || issue.status}
              </li>
            ))}
          </ul>
          {issueCount > issues.length && <p>Showing {issues.length} of {issueCount} skipped or failed rows.</p>}
        </div>
      )}
    </section>
  );
}
