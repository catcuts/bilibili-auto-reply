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
    // 获取全局代理配置，包括时间段
    const proxyConfig = await prisma.proxyConfig.findFirst({
      include: {
        timeRanges: true
      }
    });
    
    // 如果代理未启用，直接返回false
    if (!proxyConfig?.enabled) {
      return false;
    }
    
    // 如果未启用时间段限制，则始终使用代理
    if (!proxyConfig.enableTimeRanges) {
      return true;
    }
    
    // 如果启用了时间段限制但没有配置时间段，则不使用代理
    if (proxyConfig.timeRanges.length === 0) {
      console.log('已启用时间段限制，但未配置任何时间段，不使用代理');
      return false;
    }
    
    // 检查当前时间是否在任一时间段内
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 转换为1-7表示周一到周日
    
    // 检查是否在任一时间段内
    const isInTimeRange = proxyConfig.timeRanges.some(range => {
      // 检查星期是否匹配
      const daysOfWeek = range.daysOfWeek.split(',').map(Number);
      const isDayMatch = daysOfWeek.includes(currentDayOfWeek);
      
      // 检查时间是否在范围内
      const isTimeMatch = currentTime >= range.startTime && currentTime <= range.endTime;
      
      return isDayMatch && isTimeMatch;
    });
    
    if (isInTimeRange) {
      console.log('当前时间在配置的代理时间段内，使用代理');
      return true;
    } else {
      console.log('当前时间不在任何配置的代理时间段内，不使用代理');
      return false;
    }
  } catch (error) {
    console.error('检查代理配置失败:', error);
    return false;
  }
};

// 通过代理发送请求
export const sendRequestViaProxy = async (requestConfig) => {
  try {
    // 添加详细日志，记录完整请求配置
    console.log('代理请求完整配置:', JSON.stringify({
      url: requestConfig.url,
      method: requestConfig.method,
      params: requestConfig.params,
      headers: requestConfig.headers ? Object.keys(requestConfig.headers) : [],
      data: requestConfig.data,
      fullRequestConfig: requestConfig
    }, null, 2));
    
    const proxyClient = await createProxyClient();
    
    console.log('发送代理请求到:', await proxyClient.getUri());
    
    const response = await proxyClient.post('', {
      ...requestConfig
    });
    
    console.log('代理请求响应状态:', response.status);
    console.log('代理请求响应头:', JSON.stringify(response.headers, null, 2));
    console.log('代理请求响应数据结构:', {
      success: response.data?.success,
      hasData: !!response.data?.data,
      hasNestedData: !!response.data?.data?.data,
      message: response.data?.message
    });
    
    if (response.data.success) {
      return response.data.data.data;
    } else {
      console.error('代理请求返回错误:', response.data.message);
      console.error('完整错误响应:', JSON.stringify(response.data, null, 2));
      throw new Error(response.data.message || '代理请求失败');
    }
  } catch (error) {
    console.error('代理请求失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('请求配置:', JSON.stringify(requestConfig, null, 2));
    
    if (error.response) {
      console.error('错误响应状态:', error.response.status);
      console.error('错误响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    
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
  
  // 检查登录状态（与checkQrCodeStatus相同，用于兼容性）
  checkLoginStatus: async (qrcode_key) => {
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
        console.log('通过代理检查登录状态');
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
      console.error('检查登录状态失败:', error);
      return handleApiError(error, '检查登录状态失败');
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
  getSessionMessages: async (cookies, talkerId, options = {}) => {
    try {
      console.log('获取私信内容请求开始:', {
        talkerId,
        cookiesLength: cookies?.length,
        options
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
      
      // 设置获取消息的数量，确保能获取到足够的消息
      const size = options.size || 20; // 根据B站API文档，添加size参数指定获取的消息数量
      
      // 构建API请求参数
      const apiParams = {
        talker_id: talkerId,
        session_type: 1,
        size: size,
        // 添加可选的序列号参数，用于分页获取消息
        ...(options.begin_seqno && { begin_seqno: options.begin_seqno }),
        ...(options.end_seqno && { end_seqno: options.end_seqno }),
        sender_device_id: 1,  // 根据API文档添加设备ID参数
        build: 0,
        mobi_app: 'web'
      };
      
      console.log('发送API请求获取私信内容，参数:', {
        ...apiParams,
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
          params: apiParams,
          headers: {
            Cookie: cookies
          }
        });
      } else {
        const response = await biliApi.get(
          'https://api.vc.bilibili.com/svr_sync/v1/svr_sync/fetch_session_msgs',
          {
            params: apiParams,
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
  sendMessage: async (cookies, senderUid, receiverId, content, csrfToken) => {
    try {
      if (!cookies || !receiverId || !content) {
        return {
          code: -1,
          message: '缺少必要参数',
          data: null
        };
      }
      
      // 使用传入的senderUid，如果没有则尝试获取
      console.log('使用发送者ID:', senderUid);
      let sender_uid = senderUid ? senderUid.toString() : '0'; // 使用传入的senderUid
      
      // 如果没有提供senderUid，则尝试从用户信息中获取
      if (!sender_uid || sender_uid === '0') {
        console.log('未提供发送者ID，尝试从用户信息获取');
        try {
          const userInfoResult = await loginApi.getUserInfo(cookies);
          if (userInfoResult.code === 0 && userInfoResult.data && userInfoResult.data.mid) {
            sender_uid = userInfoResult.data.mid.toString();
            console.log('成功获取用户ID:', sender_uid);
          } else {
            console.warn('获取用户ID失败，使用默认值0:', userInfoResult);
          }
        } catch (userInfoError) {
          console.error('获取用户ID时出错，使用默认值0:', userInfoError);
        }
      }
      
      // 生成UUID作为dev_id
      // 使用一个简单的UUID v4生成函数
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16).toUpperCase();
        });
      };
      
      const dev_id = generateUUID();
      const timestamp = Math.floor(Date.now() / 1000);
      // 使用传入的csrfToken，如果没有则从cookies中提取
      const csrf = csrfToken || cookies.match(/bili_jct=([^;]+)/)?.[1] || '';
      
      // 构建请求参数
      const formData = new URLSearchParams({
        'msg[sender_uid]': sender_uid,
        'msg[receiver_id]': receiverId, // 使用传入的receiverId作为接收者ID
        'msg[receiver_type]': '1',
        'msg[msg_type]': '1',
        'msg[msg_status]': '0',
        'msg[dev_id]': dev_id,
        'msg[timestamp]': timestamp.toString(),
        'msg[content]': JSON.stringify({ content }),
        'msg[new_face]': '0',
        'msg[up_selection]': '0',
        'msg[build]': '0',
        'msg[mobi_app]': 'web',
        'msg[canal_token]': '', // 添加canal_token参数，设置为空
        'csrf': csrf,
        'csrf_token': csrf
      });
      
      // 打印完整的请求参数
      console.log('发送私信，完整参数:', {
        senderUid: sender_uid,
        receiverId,
        dev_id,
        timestamp,
        hasCsrf: !!csrf,
        formDataString: formData.toString(),
        requestUrl: 'https://api.vc.bilibili.com/web_im/v1/web_im/send_msg'
      });
      
      // 检查是否应该使用代理
      const useProxy = await shouldUseProxy();
      
      if (useProxy) {
        console.log('通过代理发送私信');
        const proxyResult = await sendRequestViaProxy({
          url: 'https://api.vc.bilibili.com/web_im/v1/web_im/send_msg',
          method: 'POST',
          headers: {
            Cookie: cookies,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: formData.toString()
        });
        
        console.log('代理发送私信响应:', proxyResult);
        return proxyResult;
      } else {
        console.log('直接发送私信请求');
        const response = await biliApi.post(
          'https://api.vc.bilibili.com/web_im/v1/web_im/send_msg',
          formData.toString(),
          {
            headers: {
              Cookie: cookies,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        console.log('直接发送私信响应:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('发送私信失败:', error);
      if (error.response) {
        console.error('B站API错误响应:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return handleApiError(error, '发送私信失败');
    }
  },
  
  // 标记私信为已读
  markAsRead: async (cookies, talkerId, ackSeqno, csrf) => {
    try {
      if (!cookies || !talkerId || !ackSeqno) {
        return {
          code: -1,
          message: '缺少必要参数',
          data: null
        };
      }
      
      // 如果没有提供csrf，从cookies中提取
      if (!csrf) {
        csrf = cookies.match(/bili_jct=([^;]+)/)?.[1] || '';
      }
      
      console.log('标记私信为已读请求开始:', {
        talkerId,
        ackSeqno,
        hasCsrf: !!csrf,
        cookiesLength: cookies?.length
      });
      
      // 检查是否应该使用代理
      const useProxy = await shouldUseProxy();
      
      const requestData = new URLSearchParams({
        talker_id: talkerId,
        session_type: '1',
        ack_seqno: ackSeqno.toString(),
        csrf: csrf,
        csrf_token: csrf
      }).toString();
      
      if (useProxy) {
        console.log('通过代理标记私信为已读');
        return await sendRequestViaProxy({
          url: 'https://api.vc.bilibili.com/session_svr/v1/session_svr/update_ack',
          method: 'POST',
          headers: {
            Cookie: cookies,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: requestData
        });
      } else {
        const response = await biliApi.post(
          'https://api.vc.bilibili.com/session_svr/v1/session_svr/update_ack',
          requestData,
          {
            headers: {
              Cookie: cookies,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        console.log('标记私信为已读响应:', {
          code: response.data.code,
          message: response.data.message
        });
        
        return response.data;
      }
    } catch (error) {
      console.error('标记私信为已读失败:', error);
      if (error.response) {
        console.error('B站API错误响应:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return handleApiError(error, '标记私信为已读失败');
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