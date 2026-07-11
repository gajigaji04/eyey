/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 서비스워커/매니페스트를 public에서 그대로 서빙한다.
  headers: async () => [
    {
      source: '/firebase-messaging-sw.js',
      headers: [{ key: 'Service-Worker-Allowed', value: '/' }],
    },
  ],
};

module.exports = nextConfig;
