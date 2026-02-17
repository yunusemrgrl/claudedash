/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // Static export only for production build
  ...(isDev ? {} : { output: 'export', distDir: '../dist/public' }),
  trailingSlash: true,
  // Dev mode: proxy API requests to Fastify server on port 4317
  async rewrites() {
    return [
      {
        source: '/snapshot/',
        destination: 'http://localhost:4317/snapshot',
      },
      {
        source: '/health/',
        destination: 'http://localhost:4317/health',
      },
      {
        source: '/sessions/',
        destination: 'http://localhost:4317/sessions',
      },
      {
        source: '/sessions/:id/',
        destination: 'http://localhost:4317/sessions/:id',
      },
      {
        source: '/events/',
        destination: 'http://localhost:4317/events',
      },
      // Without trailing slash (fallback)
      {
        source: '/snapshot',
        destination: 'http://localhost:4317/snapshot',
      },
      {
        source: '/health',
        destination: 'http://localhost:4317/health',
      },
      {
        source: '/sessions',
        destination: 'http://localhost:4317/sessions',
      },
      {
        source: '/sessions/:id',
        destination: 'http://localhost:4317/sessions/:id',
      },
      {
        source: '/events',
        destination: 'http://localhost:4317/events',
      },
    ];
  },
};

export default nextConfig;
