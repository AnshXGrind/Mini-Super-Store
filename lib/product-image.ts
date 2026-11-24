export function shouldLoadProductImageDirectly(source: string): boolean {
  try {
    const imageUrl = new URL(source);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return true;
    const storageUrl = new URL(supabaseUrl);
    return imageUrl.protocol !== "https:" || imageUrl.hostname !== storageUrl.hostname;
  } catch {
    return true;
  }
}
