import { NextResponse } from 'next/server';
import { loginApi } from '@/lib/bilibili-api';

// 获取登录二维码
export async function GET() {
    try {
        console.log('开始获取B站登录二维码...');
        const qrCodeData = await loginApi.getLoginQrCode();

        console.log('B站二维码API返回数据:', JSON.stringify(qrCodeData));

        // 检查是否有错误代码
        if (qrCodeData.code === 0) {
            console.log('成功获取二维码URL:', qrCodeData.data.url);
            return NextResponse.json({
                success: true,
                data: {
                    url: qrCodeData.data.url,
                    qrcode_key: qrCodeData.data.qrcode_key, // 新版API使用qrcode_key
                },
            });
        } else {
            // 处理B站API返回的错误
            console.error('B站API返回错误:', qrCodeData.message);
            return NextResponse.json(
                {
                    success: false,
                    message: qrCodeData.message || '获取二维码失败',
                },
                { status: qrCodeData.code === -1 ? 503 : 400 }
            );
        }
    } catch (error) {
        console.error('获取登录二维码失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: '获取二维码时发生错误',
            },
            { status: 500 }
        );
    }
}
