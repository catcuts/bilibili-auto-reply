import axios from 'axios';
import prisma from './prisma';

// 创建一个axios实例用于B站API请求
const biliApi = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

// 创建一个axios实例用于代理API请求
const createProxyClient = async () => {
  // 检查是否在浏览器环境
  const isBrowser = typeof window !== 'undefined';
  
  // 在服务器端需要完整URL，在浏览器端可以使用相对URL
  const baseURL = isBrowser 
    ? '/api/proxy' 
    : 'http://localhost:3000/api/proxy';
  
  console.log('创建代理客户端，baseURL:', baseURL, '环境:', isBrowser ? '浏览器' : '服务器');
  
  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

// 检查是否应该使用代理
export const shouldUseProxy = async () => {
  try {
    // 获取全局代理配置
    const proxyConfig = await prisma.proxyConfig.findFirst();
    return proxyConfig?.enabled || false;
  } catch (error) {
    console.error('检查代理配置失败:', error);
    return false;
  }
};

// 通过代理发送请求
// 通过代理发送请求
export const sendRequestViaProxy = async (requestConfig) => {
  try {
    // 添加详细日志，记录请求配置
    console.log('代理请求配置:', JSON.stringify({
      url: requestConfig.url,
      method: requestConfig.method,
      params: requestConfig.params
    }, null, 2));
    
    const proxyClient = await createProxyClient();
    
    const response = await proxyClient.post('', {
      ...requestConfig
    });
    
    if (response.data.success) {
      return response.data.data.data;
    } else {
      console.error('代理请求返回错误:', response.data.message);
      throw new Error(response.data.message || '代理请求失败');
    }
  } catch (error) {
    console.error('代理请求失败:', error);
    console.error('错误详情:', error.message);
    console.error('请求配置:', JSON.stringify(requestConfig, null, 2));
    throw error;
  }
};

// 处理API错误
export const handleApiError = (error, defaultMessage = '请求失败') => {
  if (axios.isAxiosError(error) && error.response) {
    // 如果是B站API返回的错误
    const biliError = error.response.data;
    if (biliError && biliError.code !== 0) {
      return {
        code: biliError.code || -1,
        message: biliError.message || defaultMessage,
        data: null
      };
    }
  }
  
  // 默认错误响应
  return {
    code: -1,
    message: error.message || defaultMessage,
    data: null
  };
};

// 登录相关API
export const loginApi = {
  // 获取登录二维码
  getLoginQrCode: async () => {
    try {
      // 检查是否应该使用代理
      const useProxy = await shouldUseProxy();
      
      if (useProxy) {
        console.log('通过代理获取登录二维码');
        return await sendRequestViaProxy({
          url: 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
          method: 'GET'
        });
      } else {
        const response = await biliApi.get(
          'https://passport.bilibili.com/x/passport-login/web/qrcode/generate'
        );
        return response.data;
      }
    } catch (error) {
      console.error('获取登录二维码失败:', error);
      return handleApiError(error, '获取登录二维码失败');
    }
  },
  
  // 检查二维码扫描状态
  checkQrCodeStatus: async (qrcode_key) => {
    try {
      if (!qrcode_key) {
        return {
          code: -1,
          message: '缺少二维码密钥',
          data: null
        };
      }
      
      // 检查是否应该使用代理
      const useProxy = await shouldUseProxy();
      
      if (useProxy) {
        console.log('通过代理检查二维码状态');
        return await sendRequestViaProxy({
          url: 'https://passport.bilibili.com/x/passport-login/web/qrcode/poll',
          method: 'GET',
          params: { qrcode_key }
        });
      } else {
        const response = await biliApi.get(
          'https://passport.bilibili.com/x/passport-login/web/qrcode/poll',
          { params: { qrcode_key } }
        );
        return response.data;
      }
    } catch (error) {
      console.error('检查二维码状态失败:', error);
      return handleApiError(error, '检查二维码状态失败');
    }
  },
  
  // 获取用户信息
  getUserInfo: async (cookies) => {
    try {
      if (!cookies) {
        return {
          code: -1,
          message: '缺少cookies',
          data: null
        };
      }
      
      // 检查是否应该使用代理
      const useProxy = await shouldUseProxy();
      
      if (useProxy) {
        console.log('通过代理获取用户信息');
        return await sendRequestViaProxy({
          url: 'https://api.bilibili.com/x/web-interface/nav',
          method: 'GET',
          headers: {
            Cookie: cookies
          }
        });
      } else {
        const response = await biliApi.get(
          'https://api.bilibili.com/x/web-interface/nav',
          {
            headers: {
              Cookie: cookies
            }
          }
        );
        return response.data;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return handleApiError(error, '获取用户信息失败');
    }
  }
};

// 私信相关API
export const messageApi = {
  // 获取私信会话列表
  getSessionList: async (cookies) => {
    try {
      console.log('获取私信会话列表请求开始，cookies长度:', cookies?.length);
      
      // 检查是否应该使用代理
      const useProxy = await shouldUseProxy();
      
      if (useProxy) {
        console.log('通过代理获取私信会话列表');
        return await sendRequestViaProxy({
          url: 'https://api.vc.bilibili.com/session_svr/v1/session_svr/get_sessions',
          method: 'GET',
          params: {
            session_type: 1,
            group_fold: 1,
            unfollow_fold: 0,
            sort_rule: 2,
            build: 0,
            mobi_app: 'web'
          },
          headers: {
            Cookie: cookies
          }
        });
      } else {
        const response = await biliApi.get(
          'https://api.vc.bilibili.com/session_svr/v1/session_svr/get_sessions',
          {
            params: {
              session_type: 1,
              group_fold: 1,
              unfollow_fold: 0,
              sort_rule: 2,
              build: 0,
              mobi_app: 'web'
            },
            headers: {
              Cookie: cookies
            }
          }
        );
        
        console.log('获取私信会话列表响应:', {
          code: response.data.code,
          message: response.data.message,
          hasData: !!response.data.data,
          sessionCount: response.data.data?.session_list?.length || 0
        });
        
        return response.data;
      }
    } catch (error) {
      console.error('获取私信会话列表失败:', error);
      if (error.response) {
        console.error('B站API错误响应:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return handleApiError(error, '获取私信会话列表失败，请稍后再试');
    }
  },
  
  // 获取与特定用户的私信内容
  getSessionMessages: async (cookies, talkerId) => {
    try {
      console.log('获取私信内容请求开始:', {
        talkerId,
        cookiesLength: cookies?.length
      });
      
      // 检查talkerId是否有效
      if (!talkerId || talkerId === 'undefined') {
        console.error('无效的talkerId:', talkerId);
        return {
          code: -1,
          message: '无效的会话ID',
          data: { messages: [] }
        };
      }
      
      console.log('发送API请求获取私信内容，参数:', {
        talker_id: talkerId,
        session_type: 1,
        hasCookies: !!cookies,
        cookiesLength: cookies?.length
      });
      
      // 检查是否应该使用代理
      const useProxy = await shouldUseProxy();
      
      // 定义一个响应对象，用于存储最终结果
      let finalResponse = {
        code: -1,
        message: '所有API请求均失败',
        data: { messages: [] }
      };
      
      if (useProxy) {
        console.log('通过代理获取私信内容');
        return await sendRequestViaProxy({
          url: 'https://api.vc.bilibili.com/svr_sync/v1/svr_sync/fetch_session_msgs',
          method: 'GET',
          params: {
            talker_id: talkerId,
            session_type: 1
          },
          headers: {
            Cookie: cookies
          }
        });
      } else {
        const response = await biliApi.get(
          'https://api.vc.bilibili.com/svr_sync/v1/svr_sync/fetch_session_msgs',
          {
            params: {
              talker_id: talkerId,
              session_type: 1
            },
            headers: {
              Cookie: cookies
            }
          }
        );
        
        console.log('获取私信内容响应:', {
          code: response.data.code,
          message: response.data.message,
          hasData: !!response.data.data,
          messageCount: response.data.data?.messages?.length || 0
        });
        
        return response.data;
      }
    } catch (error) {
      console.error('获取私信内容失败:', error);
      if (error.response) {
        console.error('B站API错误响应:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return handleApiError(error, '获取私信内容失败，请稍后再试');
    }
  },
  
  // 发送私信
  sendMessage: async (cookies, receiverId, content) => {
    try {
      if (!cookies || !receiverId || !content) {
        return {
          code: -1,
          message: '缺少必要参数',
          data: null
        };
      }
      
      // 检查是否应该使用代理
      const useProxy = await shouldUseProxy();
      
      if (useProxy) {
        console.log('通过代理发送私信');
        return await sendRequestViaProxy({
          url: 'https://api.vc.bilibili.com/web_im/v1/web_im/send_msg',
          method: 'POST',
          headers: {
            Cookie: cookies,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: new URLSearchParams({
            'msg[sender_uid]': '0',
            'msg[receiver_id]': receiverId,
            'msg[receiver_type]': '1',
            'msg[msg_type]': '1',
            'msg[msg_status]': '0',
            'msg[content]': JSON.stringify({ content }),
            'csrf': cookies.match(/bili_jct=([^;]+)/)?.[1] || ''
          }).toString()
        });
      } else {
        const response = await biliApi.post(
          'https://api.vc.bilibili.com/web_im/v1/web_im/send_msg',
          new URLSearchParams({
            'msg[sender_uid]': '0',
            'msg[receiver_id]': receiverId,
            'msg[receiver_type]': '1',
            'msg[msg_type]': '1',
            'msg[msg_status]': '0',
            'msg[content]': JSON.stringify({ content }),
            'csrf': cookies.match(/bili_jct=([^;]+)/)?.[1] || ''
          }).toString(),
          {
            headers: {
              Cookie: cookies,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        return response.data;
      }
    } catch (error) {
      console.error('发送私信失败:', error);
      return handleApiError(error, '发送私信失败');
    }
  }
};


// 工具函数API
export const utilApi = {
  // 从Cookie中提取CSRF令牌
  extractCsrfFromCookie: (cookies) => {
    if (!cookies) return null;
    const match = cookies.match(/bili_jct=([^;]+)/);
    return match ? match[1] : null;
  }
};