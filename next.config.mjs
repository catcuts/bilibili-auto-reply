/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'account.bilibili.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.bilibili.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'api.qrserver.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i0.hdslb.com', // B站头像CDN域名
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i1.hdslb.com', // B站头像CDN域名
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i2.hdslb.com', // B站头像CDN域名
                port: '',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
