import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { messageApi, utilApi } from '@/lib/bilibili-api';

// 获取与特定用户的私信内容
export async function GET(request: NextRequest, { params }: { params: { talkerId: string } }) {
  try {
    const talkerId = params.talkerId;
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '缺少用户ID'
      }, { status: 400 });
    }
    
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.cookies) {
      return NextResponse.json({
        success: false,
        message: '用户未登录或登录已过期'
      }, { status: 401 });
    }
    
    // 获取私信内容
    const messagesData = await messageApi.getSessionMessages(user.cookies, talkerId);
    
    if (messagesData.code === 0) {
      // 将消息保存到数据库
      const messages = messagesData.data.messages || [];
      
      // 只处理最近的消息，避免数据库过大
      const recentMessages = messages.slice(0, 50);
      
      for (const msg of recentMessages) {
        // 只保存文本消息
        if (msg.msg_type === 1) {
          try {
            const content = JSON.parse(msg.content).content;
            
            await prisma.message.upsert({
              where: {
                messageId: msg.msg_key.toString()
              },
              update: {
                content,
                isRead: true,
                isProcessed: true // 标记为已处理，避免重复处理
              },
              create: {
                messageId: msg.msg_key.toString(),
                userId: user.id,
                senderId: msg.sender_uid.toString(),
                receiverId: msg.receiver_id.toString(),
                content,
                sentAt: new Date(msg.timestamp * 1000),
                isRead: true,
                isProcessed: true
              }
            });
          } catch (e) {
            console.error('解析消息内容失败:', e);
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        data: messages
      });
    } else {
      return NextResponse.json({
        success: false,
        message: messagesData.message || '获取私信内容失败'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('获取私信内容失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取私信内容时发生错误'
    }, { status: 500 });
  }
}

// 发送私信
export async function POST(request: NextRequest, { params }: { params: { talkerId: string } }) {
  try {
    const talkerId = params.talkerId;
    const body = await request.json();
    const { userId, content } = body;
    
    if (!userId || !content) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数'
      }, { status: 400 });
    }
    
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.cookies) {
      return NextResponse.json({
        success: false,
        message: '用户未登录或登录已过期'
      }, { status: 401 });
    }
    
    // 首先尝试从请求cookies中获取csrf令牌
    let csrf = request.cookies.get('bili_jct')?.value;
    
    // 如果请求cookies中没有，则从用户存储的cookies中提取
    if (!csrf) {
      csrf = utilApi.extractCsrfFromCookie(user.cookies);
    }
    
    if (!csrf) {
      return NextResponse.json({
        success: false,
        message: 'CSRF令牌无效，请重新登录'
      }, { status: 401 });
    }
    
    // 发送私信
    const sendResult = await messageApi.sendMessage(
      user.cookies,
      user.biliUid,
      talkerId,
      content,
      csrf
    );
    
    if (sendResult.code === 0) {
      // 保存发送的消息到数据库
      const messageId = sendResult.data.msg_key.toString();
      
      await prisma.message.create({
        data: {
          messageId,
          userId: user.id,
          senderId: user.biliUid,
          receiverId: talkerId,
          content,
          sentAt: new Date(),
          isRead: true,
          isProcessed: true,
          isAutoReply: false // 这是用户手动发送的消息
        }
      });
      
      return NextResponse.json({
        success: true,
        data: {
          messageId,
          content
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: sendResult.message || '发送私信失败'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('发送私信失败:', error);
    return NextResponse.json({
      success: false,
      message: '发送私信时发生错误'
    }, { status: 500 });
  }
}