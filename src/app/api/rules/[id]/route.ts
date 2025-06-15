import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 获取单个规则
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const ruleId = params.id;

        const rule = await prisma.rule.findUnique({
            where: { id: ruleId },
        });

        if (!rule) {
            return NextResponse.json(
                {
                    success: false,
                    message: '规则不存在',
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: rule,
        });
    } catch (error) {
        console.error('获取规则详情失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: '获取规则详情时发生错误',
            },
            { status: 500 }
        );
    }
}

// 更新规则
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const ruleId = params.id;
        const body = await request.json();
        const { name, keywords, responseTemplate, priority, isActive, type } = body;

        // 检查规则是否存在
        const existingRule = await prisma.rule.findUnique({
            where: { id: ruleId },
        });

        if (!existingRule) {
            return NextResponse.json(
                {
                    success: false,
                    message: '规则不存在',
                },
                { status: 404 }
            );
        }

        // 更新规则
        const updatedRule = await prisma.rule.update({
            where: { id: ruleId },
            data: {
                name: name !== undefined ? name : undefined,
                keywords: keywords !== undefined ? keywords : undefined,
                responseTemplate: responseTemplate !== undefined ? responseTemplate : undefined,
                priority: priority !== undefined ? priority : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
                type: type !== undefined ? type : undefined,
            },
        });

        return NextResponse.json({
            success: true,
            data: updatedRule,
        });
    } catch (error) {
        console.error('更新规则失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: '更新规则时发生错误',
            },
            { status: 500 }
        );
    }
}

// 删除规则
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const ruleId = params.id;

        // 检查规则是否存在
        const existingRule = await prisma.rule.findUnique({
            where: { id: ruleId },
        });

        if (!existingRule) {
            return NextResponse.json(
                {
                    success: false,
                    message: '规则不存在',
                },
                { status: 404 }
            );
        }

        // 删除规则
        await prisma.rule.delete({
            where: { id: ruleId },
        });

        return NextResponse.json({
            success: true,
            message: '规则已删除',
        });
    } catch (error) {
        console.error('删除规则失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: '删除规则时发生错误',
            },
            { status: 500 }
        );
    }
}
