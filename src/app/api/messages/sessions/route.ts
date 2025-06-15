import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { messageApi } from '@/lib/bilibili-api';

// 获取私信会话列表
export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    message: '缺少用户ID',
                },
                { status: 400 }
            );
        }

        // 获取用户信息
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.cookies) {
            return NextResponse.json(
                {
                    success: false,
                    message: '用户未登录或登录已过期',
                },
                { status: 401 }
            );
        }

        // 获取会话列表
        const sessionListData = await messageApi.getSessionList(user.cookies);

        if (sessionListData.code === 0) {
            return NextResponse.json({
                success: true,
                data: sessionListData.data.session_list || [],
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: sessionListData.message || '获取会话列表失败',
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('获取私信会话列表失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: '获取私信会话列表时发生错误',
            },
            { status: 500 }
        );
    }
}
