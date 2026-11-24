import { after, NextResponse } from "next/server";
import { getCurrentStoreUserResult } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

type ImportJobSummary = {
  status: string;
};

async function processImportInBackground(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
) {
  try {
    while (true) {
      const { data, error } = await supabase.rpc("process_product_import_batch", {
        p_job_id: jobId,
      });
      if (error) throw error;

      const job = data as ImportJobSummary | null;
      if (!job) throw new Error("The import worker returned no job status.");
      if (job.status === "completed" || job.status === "failed") return;
      if (job.status !== "processing") {
        throw new Error(`Unexpected product import status: ${job.status}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product import worker failed.";
    console.error("Product import background job failed", { jobId, message });
    try {
      const { error: failError } = await supabase.rpc("fail_product_import_job", {
        p_job_id: jobId,
        p_error: message,
      });
      if (failError) {
        console.error("Could not mark product import as failed", { jobId, error: failError });
      }
    } catch (failError) {
      console.error("Could not mark product import as failed", { jobId, error: failError });
    }
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }

  const result = await getCurrentStoreUserResult();
  if (result.status === "unavailable") {
    return NextResponse.json({ error: "Authentication service is unavailable." }, { status: 503 });
  }
  if (result.status !== "authenticated" || result.user.role !== "admin") {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const { jobId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
    return NextResponse.json({ error: "Invalid import job ID." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("product_import_jobs")
    .select("id, status, created_by")
    .eq("id", jobId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Could not read the import job." }, { status: 500 });
  }
  if (
    !job ||
    job.created_by !== result.user.id ||
    !["queued", "processing"].includes(job.status)
  ) {
    return NextResponse.json({ error: "The import job is not ready to process." }, { status: 409 });
  }

  after(() => processImportInBackground(supabase, jobId));
  return NextResponse.json({ status: "processing" }, { status: 202 });
}
