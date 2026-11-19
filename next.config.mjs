/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let remotePatterns = [];

if (supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    remotePatterns = [{ protocol: "https", hostname }];
  } catch {
    remotePatterns = [];
  }
}

const nextConfig = {
  images: { remotePatterns },
};

export default nextConfig;
