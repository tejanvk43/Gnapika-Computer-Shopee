/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // Speed up production builds on Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // Speed up production builds on Vercel
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/signup',
        destination: '/auth/signup',
        permanent: false,
      },
      {
        source: '/login',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/dashboard/products',
        destination: '/dashboard/purchases',
        permanent: false,
      },
      {
        source: '/dashboard/products/new',
        destination: '/dashboard/purchases',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
