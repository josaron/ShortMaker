/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle ONNX runtime - only include in client bundle
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('onnxruntime-web');
    }
    
    // Add fallbacks for node modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    return config;
  },
  // Enable experimental features for server actions
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
};

export default nextConfig;
