/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export',
    images: { unoptimized: true }, // Required for static export
    transpilePackages: ['@antigravity/ui']
};

export default nextConfig;
