import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 获取所有规则
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

        const rules = await prisma.rule.findMany({
            where: { userId: userId },
            orderBy: { priority: 'desc' },
        });

        return NextResponse.json({
            success: true,
            data: rules,
        });
    } catch (error) {
        console.error('获取规则列表失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: '获取规则列表时发生错误',
            },
            { status: 500 }
        );
    }
}

// 创建新规则
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            userId,
            name,
            keywords,
            responseTemplate,
            priority = 0,
            isActive = true,
            type = 'general',
        } = body;

        if (!userId || !name || !keywords || !responseTemplate) {
            return NextResponse.json(
                {
                    success: false,
                    message: '缺少必要参数',
                },
                { status: 400 }
            );
        }

        const rule = await prisma.rule.create({
            data: {
                userId,
                name,
                keywords,
                responseTemplate,
                priority,
                isActive,
                type,
            },
        });

        return NextResponse.json({
            success: true,
            data: rule,
        });
    } catch (error) {
        console.error('创建规则失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: '创建规则时发生错误',
            },
            { status: 500 }
        );
    }
}
