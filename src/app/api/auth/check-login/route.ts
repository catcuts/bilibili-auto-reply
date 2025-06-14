import { NextRequest, NextResponse } from 'next/server';
import { loginApi, utilApi } from '@/lib/bilibili-api';
import prisma from '@/lib/prisma';

// 检查登录状态
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrcodeKey } = body;
    
    if (!qrcodeKey) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数'
      }, { status: 400 });
    }
    
    const loginInfo = await loginApi.checkLoginStatus(qrcodeKey);
    
    // 检查是否有错误代码
    if (loginInfo.code !== 0 || !loginInfo.data) {
      return NextResponse.json({
        success: false,
        message: loginInfo.message || '检查登录状态失败'
      }, { status: loginInfo.code === -1 ? 503 : 400 });
    }
    
    // 检查扫码状态
    if (loginInfo.data.code === 0) { // 登录成功
      console.log('登录成功，获取到的数据:', JSON.stringify(loginInfo.data));
      
      // B站新版API不直接返回cookie，而是返回一个包含cookie信息的URL
      // 我们需要从URL中提取cookie信息
      const url = loginInfo.data.url;
      if (!url) {
        console.error('登录成功但缺少URL信息:', JSON.stringify(loginInfo.data));
        return NextResponse.json({
          success: false,
          message: '解析登录信息失败，缺少URL数据'
        }, { status: 400 });
      }
      
      // 从URL中提取cookie信息
      // URL格式: https://passport.biligame.com/x/passport-login/web/crossDomain?DedeUserID=xxx&DedeUserID__ckMd5=xxx&Expires=xxx&SESSDATA=xxx&bili_jct=xxx
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      // 构建cookie字符串
      const dedeUserID = params.get('DedeUserID');
      const sessdata = params.get('SESSDATA');
      const biliJct = params.get('bili_jct');
      
      if (!dedeUserID || !sessdata || !biliJct) {
        console.error('URL中缺少必要的cookie参数:', url);
        return NextResponse.json({
          success: false,
          message: '解析登录信息失败，URL中缺少必要的cookie参数'
        }, { status: 400 });
      }
      
      // 构建cookie字符串
      const cookieStr = `DedeUserID=${dedeUserID}; SESSDATA=${sessdata}; bili_jct=${biliJct};`;
      console.log('从URL提取的cookie:', cookieStr);
      
      // 获取用户信息
      const userInfo = await loginApi.getUserInfo(cookieStr);
      
      if (userInfo.code === 0) {
        const userData = userInfo.data;
        
        // 确保用户名不为undefined
        const username = userData.name || `用户${userData.mid}`;
        console.log('获取到的用户信息:', { mid: userData.mid, name: username, face: userData.face });
        
        // 在数据库中创建或更新用户
        const user = await prisma.user.upsert({
          where: { biliUserId: userData.mid.toString() },
          update: {
            biliUsername: username,
            avatarUrl: userData.face, // 保存用户头像URL
            cookies: cookieStr,
            lastLoginAt: new Date()
          },
          create: {
            biliUserId: userData.mid.toString(),
            biliUsername: username,
            avatarUrl: userData.face, // 保存用户头像URL
            cookies: cookieStr,
            lastLoginAt: new Date()
          }
        });
        console.log('用户数据保存成功:', { id: user.id, biliUserId: user.biliUserId, biliUsername: user.biliUsername });
        
        // 创建响应对象
        const response = NextResponse.json({
          success: true,
          data: {
            userId: user.id,
            biliUserId: user.biliUserId,
            biliUsername: user.biliUsername,
            avatarUrl: user.avatarUrl || '/default-avatar.svg' // 返回头像URL，如果没有则使用默认头像
          }
        });
        
        // 设置B站cookies到浏览器
        response.cookies.set('DedeUserID', dedeUserID, { path: '/' });
        response.cookies.set('SESSDATA', sessdata, { path: '/' });
        response.cookies.set('bili_jct', biliJct, { path: '/' });
        
        return response;
      } else {
        return NextResponse.json({
          success: false,
          message: userInfo.message || '获取用户信息失败'
        }, { status: userInfo.code === -1 ? 503 : 400 });
      }
    } else {
      // 登录未完成或失败
      return NextResponse.json({
        success: false,
        data: {
          code: loginInfo.data.code,
          message: loginInfo.data.message || '登录未完成'
        }
      });
    }
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return NextResponse.json({
      success: false,
      message: '检查登录状态时发生错误'
    }, { status: 500 });
  }
}