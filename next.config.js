/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.eu-central-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.eu-central-2.amazonaws.com',
      }
    ],
  },
}

module.exports = nextConfig
