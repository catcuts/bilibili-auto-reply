import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 获取当前登录用户信息
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '缺少用户ID'
      }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        biliUserId: true,
        biliUsername: true,
        avatarUrl: true, // 添加头像URL字段
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: '用户不存在'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取用户信息时发生错误'
    }, { status: 500 });
  }
}