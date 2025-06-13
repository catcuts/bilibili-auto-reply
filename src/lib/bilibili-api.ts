import axios from 'axios';
import { AxiosError } from 'axios';

// 创建axios实例
const biliApi = axios.create({
  timeout: 15000, // 增加超时时间
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.bilibili.com/',
    'Origin': 'https://www.bilibili.com',
  }
});

// 处理API错误
const handleApiError = (error: any, defaultMessage: string) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      // 服务器返回了错误状态码
      if (axiosError.response.status === 503) {
        return {
          code: -1,
          message: 'B站服务器暂时不可用，请稍后再试'
        };
      }
      return {
        code: -1,
        message: `请求失败: ${axiosError.response.status}`
      };
    } else if (axiosError.request) {
      // 请求已发送但没有收到响应
      return {
        code: -1,
        message: '无法连接到B站服务器，请检查网络连接'
      };
    }
  }
  
  return {
    code: -1,
    message: defaultMessage
  };
};

// 登录相关API
export const loginApi = {
  // 获取登录二维码 (新版API)
  getLoginQrCode: async () => {
    try {
      console.log('调用B站二维码生成API...');
      const response = await biliApi.get('https://passport.bilibili.com/x/passport-login/web/qrcode/generate');
      
      console.log('B站二维码API响应状态:', response.status);
      console.log('B站二维码API响应头:', JSON.stringify(response.headers));
      console.log('B站二维码API响应数据:', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      console.error('获取登录二维码失败:', error);
      if (error.response) {
        console.error('错误响应状态:', error.response.status);
        console.error('错误响应头:', JSON.stringify(error.response.headers));
        console.error('错误响应数据:', JSON.stringify(error.response.data));
      }
      return handleApiError(error, '获取二维码失败，请稍后再试');
    }
  },
  
  // 检查二维码扫描状态 (新版API)
  checkLoginStatus: async (qrcodeKey: string) => {
    try {
      console.log('开始检查登录状态，qrcode_key:', qrcodeKey);
      const response = await biliApi.get(
        'https://passport.bilibili.com/x/passport-login/web/qrcode/poll',
        {
          params: {
            qrcode_key: qrcodeKey
          }
        }
      );
      
      console.log('B站登录状态API响应状态:', response.status);
      console.log('B站登录状态API响应数据:', JSON.stringify(response.data));
      
      if (response.data.code === 0) {
        console.log('登录状态检查成功，状态码:', response.data.data?.code);
        if (response.data.data?.code === 0) {
          console.log('用户已成功登录，获取到的cookie信息长度:', 
            (response.data.data?.cookie?.length || 0));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      if (error.response) {
        console.error('错误响应状态:', error.response.status);
        console.error('错误响应数据:', JSON.stringify(error.response.data));
      }
      // 确保返回一个有效的JSON结构
      const errorResponse = handleApiError(error, '检查登录状态失败，请稍后再试');
      return {
        code: errorResponse.code,
        message: errorResponse.message,
        data: { code: -1, message: errorResponse.message }
      };
    }
  },
  
  // 获取用户信息
  getUserInfo: async (cookies: string) => {
    try {
      const response = await biliApi.get('https://api.bilibili.com/x/space/myinfo', {
        headers: {
          Cookie: cookies
        }
      });
      return response.data;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return handleApiError(error, '获取用户信息失败，请稍后再试');
    }
  }
};

// 私信相关API
export const messageApi = {
  // 获取私信会话列表
  getSessionList: async (cookies: string) => {
    try {
      console.log('获取私信会话列表请求开始，cookies长度:', cookies?.length);
      
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
  getSessionMessages: async (cookies: string, talkerId: string) => {
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
      
      // 定义一个响应对象，用于存储最终结果
      let finalResponse = {
        code: -1,
        message: '所有API请求均失败',
        data: { messages: [] }
      };
      
      let apiSuccess = false;
      
      // 尝试使用第一个API端点获取私信内容
      try {
        const response = await biliApi.get(
          'https://api.vc.bilibili.com/svr_sync/v1/svr_sync/fetch_session_msgs',
          {
            params: {
              talker_id: talkerId,
              session_type: 1,
              size: 50, // 增加获取消息数量
              build: 0,
              mobi_app: 'web'
            },
            headers: {
              Cookie: cookies
            }
          }
        );
        
        // 记录完整的响应数据结构
        console.log('获取私信内容完整响应(API1):', JSON.stringify(response.data).substring(0, 1000) + '...');
        
        console.log('获取私信内容响应(API1):', {
          code: response.data.code,
          message: response.data.message,
          hasData: !!response.data.data,
          messageCount: response.data.data?.messages?.length || 0
        });
        
        if (response.data.code === 0) {
          finalResponse = response.data;
          apiSuccess = true;
          
          // 检查是否有消息
          if (!finalResponse.data?.messages || 
              (Array.isArray(finalResponse.data.messages) && finalResponse.data.messages.length === 0)) {
            console.log('API1未返回消息，将尝试其他API');
            apiSuccess = false;
          }
        }
      } catch (error) {
        console.error('第一个API请求失败:', error.message);
      }
      
      // 如果第一个API失败或没有返回消息，尝试使用第二个API
      if (!apiSuccess) {
        try {
          console.log('尝试使用第二个API端点');
          const response2 = await biliApi.get(
            'https://api.vc.bilibili.com/web_im/v1/web_im/get_msg',
            {
              params: {
                talker_id: talkerId,
                session_type: 1,
                size: 50
              },
              headers: {
                Cookie: cookies
              }
            }
          );
          
          console.log('获取私信内容完整响应(API2):', JSON.stringify(response2.data).substring(0, 1000) + '...');
          
          console.log('获取私信内容响应(API2):', {
            code: response2.data.code,
            message: response2.data.message,
            hasData: !!response2.data.data,
            hasMessages: !!response2.data.data?.messages
          });
          
          // 如果第二个API成功返回数据
          if (response2.data.code === 0 && response2.data.data) {
            finalResponse = response2.data;
            apiSuccess = true;
            console.log('使用第二个API的响应结果');
            
            // 检查是否有消息
            if (!finalResponse.data?.messages || 
                (Array.isArray(finalResponse.data.messages) && finalResponse.data.messages.length === 0)) {
              console.log('API2未返回消息，将尝试其他API');
              apiSuccess = false;
            }
          }
        } catch (error) {
          console.error('第二个API请求失败:', error.message);
        }
      }
      
      // 如果前两个API都失败，尝试使用第三个API
      if (!apiSuccess) {
        try {
          console.log('尝试使用第三个API端点');
          const response3 = await biliApi.get(
            'https://api.vc.bilibili.com/svr_sync/v1/svr_sync/new_sync_msg',
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
          
          console.log('获取私信内容完整响应(API3):', JSON.stringify(response3.data).substring(0, 1000) + '...');
          
          console.log('获取私信内容响应(API3):', {
            code: response3.data.code,
            message: response3.data.message,
            hasData: !!response3.data.data,
            hasMessages: !!response3.data.data?.messages
          });
          
          // 如果第三个API成功返回数据
          if (response3.data.code === 0 && response3.data.data) {
            finalResponse = response3.data;
            apiSuccess = true;
            console.log('使用第三个API的响应结果');
            
            // 检查是否有消息
            if (!finalResponse.data?.messages || 
                (Array.isArray(finalResponse.data.messages) && finalResponse.data.messages.length === 0)) {
              console.log('API3未返回消息，将尝试其他API');
              apiSuccess = false;
            }
          }
        } catch (error) {
          console.error('第三个API请求失败:', error.message);
        }
      }
      
      // 如果前三个API都失败，尝试使用第四个API获取会话列表并提取最后一条消息
      if (!apiSuccess) {
        try {
          console.log('尝试使用第四个API端点获取会话列表');
          const response4 = await biliApi.get(
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
          
          console.log('获取会话列表完整响应(API4):', JSON.stringify(response4.data).substring(0, 1000) + '...');
          
          if (response4.data.code === 0 && response4.data.data) {
            // 查找对应的会话
            const session = response4.data.data.session_list?.find(s => s.talker_id.toString() === talkerId.toString());
            if (session) {
              console.log(`找到对应会话:`, {
                talker_id: session.talker_id,
                session_type: session.session_type,
                unread_count: session.unread_count,
                has_last_msg: !!session.last_msg
              });
              
              if (session.last_msg) {
                // 创建一个模拟的消息数组
                finalResponse = {
                  code: 0,
                  message: '0',
                  data: {
                    messages: [session.last_msg],
                    has_more: 0,
                    min_seqno: 0,
                    max_seqno: 0
                  }
                };
                apiSuccess = true;
                console.log(`从会话列表提取最后一条消息:`, JSON.stringify(session.last_msg).substring(0, 200) + '...');
              }
              
              // 如果有未读消息但没有last_msg，尝试获取所有未读消息
              if (session.unread_count > 0 && !session.last_msg) {
                console.log(`会话有${session.unread_count}条未读消息，但没有last_msg字段`);
              }
            } else {
              console.log(`在会话列表中未找到talker_id为${talkerId}的会话`);
            }
          }
        } catch (error) {
          console.error('第四个API请求失败:', error.message);
        }
      }
      
      // 处理最终响应数据
      if (finalResponse.code === 0) {
        console.log('最终私信内容响应详情:', {
          dataType: typeof finalResponse.data,
          hasMessages: Array.isArray(finalResponse.data?.messages),
          messagesLength: finalResponse.data?.messages?.length || 0,
          responseKeys: Object.keys(finalResponse).join(','),
          dataKeys: finalResponse.data ? Object.keys(finalResponse.data).join(','): 'none'
        });
        
        // 确保data对象存在
        finalResponse.data = finalResponse.data || {};
        
        // 检查是否有其他可能的消息数组字段
        const possibleMessageFields = ['messages', 'message_list', 'msg_list', 'msgs', 'items', 'data'];
        for (const field of possibleMessageFields) {
          if (finalResponse.data && Array.isArray(finalResponse.data[field]) && finalResponse.data[field].length > 0) {
            console.log(`找到可能的消息数组字段: ${field}，长度: ${finalResponse.data[field].length}`);
            // 如果找到其他消息字段，将其赋值给messages字段
            if (field !== 'messages') {
              finalResponse.data.messages = finalResponse.data[field];
              console.log(`已将 ${field} 字段赋值给 messages 字段`);
            }
            break;
          }
        }
        
        // 如果messages字段为null或不存在，初始化为空数组
        if (!finalResponse.data.messages) {
          finalResponse.data.messages = [];
          console.log('messages字段不存在或为null，已初始化为空数组');
        }
        
        // 检查嵌套的data字段
        if (finalResponse.data.data && typeof finalResponse.data.data === 'object') {
          console.log('检测到嵌套的data字段，尝试提取消息');
          
          for (const field of possibleMessageFields) {
            if (Array.isArray(finalResponse.data.data[field]) && finalResponse.data.data[field].length > 0) {
              console.log(`在嵌套data中找到可能的消息数组字段: ${field}，长度: ${finalResponse.data.data[field].length}`);
              finalResponse.data.messages = finalResponse.data.data[field];
              console.log(`已将嵌套data中的 ${field} 字段赋值给 messages 字段`);
              break;
            }
          }
        }
      }
      
      return finalResponse;
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
  sendMessage: async (cookies: string, senderUserId: string, receiverId: string, content: string, csrf: string) => {
    try {
      console.log('发送私信请求参数:', {
        senderUserId,
        receiverId,
        contentLength: content?.length,
        content: content?.substring(0, 30) + (content?.length > 30 ? '...' : ''), // 只显示部分内容
        csrf: csrf?.substring(0, 3) + '...' // 只显示部分csrf令牌，保护安全
      });
      
      // 构建消息数据
      const formData = new URLSearchParams();
      formData.append('msg[sender_uid]', senderUserId);
      formData.append('msg[receiver_id]', receiverId);
      formData.append('msg[receiver_type]', '1');
      formData.append('msg[msg_type]', '1');
      formData.append('msg[content]', JSON.stringify({content: content}));
      formData.append('msg[timestamp]', Math.floor(Date.now() / 1000).toString());
      formData.append('msg[msg_status]', '0');
      formData.append('msg[new_face_version]', '0');
      // 添加缺少的字段
      formData.append('msg[canal_token]', ''); // canal_token可以为空
      // 生成一个UUID作为设备ID
      const deviceId = generateDeviceId();
      formData.append('msg[dev_id]', deviceId);
      formData.append('csrf', csrf);
      formData.append('csrf_token', csrf);
      formData.append('from_firework', '0');
      formData.append('build', '0');
      formData.append('mobi_app', 'web');
      
      // 打印完整的请求体内容
      console.log('发送私信完整请求体:', formData.toString());
      
      // 打印完整的请求头
      const headers = {
        Cookie: cookies,
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      console.log('发送私信请求头:', JSON.stringify(headers, (key, value) => {
        // 对Cookie进行脱敏处理
        if (key === 'Cookie') return value.substring(0, 20) + '...';
        return value;
      }));
      
      console.log('发送私信请求体格式:', formData.toString());
      
      // 添加请求前的详细日志
      console.log('发送私信请求参数详细信息:', {
        url: 'https://api.vc.bilibili.com/web_im/v1/web_im/send_msg',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies?.substring(0, 20) + '...' // 脱敏处理
        },
        formData: formData.toString()
      });
      
      const response = await biliApi.post(
        'https://api.vc.bilibili.com/web_im/v1/web_im/send_msg',
        formData,
        {
          headers: headers
        }
      );
      
      // 打印完整的响应内容
      console.log('B站API发送私信完整响应:', JSON.stringify(response.data));
      
      console.log('B站API发送私信响应:', {
        code: response.data.code,
        message: response.data.message,
        data: response.data.data,
        fullResponse: JSON.stringify(response.data)
      });
      
      return response.data;
    } catch (error) {
      console.error('发送私信失败:', error);
      if (error.response) {
        console.error('B站API错误响应:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: JSON.stringify(error.response.data),
          headers: JSON.stringify(error.response.headers)
        });
      } else if (error.request) {
        console.error('B站API请求未收到响应:', error.request);
      } else {
        console.error('发送私信请求配置错误:', error.message);
      }
      return handleApiError(error, '发送私信失败，请稍后再试');
    }
  },
  
  // 标记私信已读
  markAsRead: async (cookies: string, talkerId: string, ackSeqno: string, csrf: string) => {
    try {
      console.log('标记私信已读请求参数:', {
        talkerId,
        ackSeqno,
        cookiesLength: cookies?.length,
        csrf: csrf?.substring(0, 3) + '...' // 只显示部分csrf令牌，保护安全
      });
      
      const formData = `talker_id=${talkerId}&session_type=1&ack_seqno=${ackSeqno}&csrf=${csrf}`;
      console.log('标记私信已读请求体:', formData);
      
      const response = await biliApi.post(
        'https://api.vc.bilibili.com/session_svr/v1/session_svr/update_ack',
        formData,
        {
          headers: {
            Cookie: cookies,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log('标记私信已读响应:', {
        code: response.data.code,
        message: response.data.message,
        data: response.data.data
      });
      
      return response.data;
    } catch (error) {
      console.error('标记私信已读失败:', error);
      if (error.response) {
        console.error('B站API错误响应:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: JSON.stringify(error.response.data)
        });
      }
      return handleApiError(error, '标记私信已读失败，请稍后再试');
    }
  }
};

// 辅助函数
export const utilApi = {
  // 从Cookie中提取CSRF令牌
  extractCsrfFromCookie: (cookies: string) => {
    console.log('从Cookie中提取CSRF令牌，cookies长度:', cookies?.length);
    
    if (!cookies) {
      console.error('提取CSRF令牌失败: cookies为空');
      return '';
    }
    
    const match = cookies.match(/bili_jct=([^;]+)/);
    
    if (match && match[1]) {
      console.log('成功提取CSRF令牌，长度:', match[1].length);
      return match[1];
    } else {
      console.error('提取CSRF令牌失败: 未找到bili_jct字段');
      console.log('Cookie内容片段:', cookies.substring(0, 100) + '...');
      return '';
    }
  },
  
  // 获取未读消息数
  getUnreadCount: async (cookies: string) => {
    try {
      const response = await biliApi.get(
        'https://api.bilibili.com/x/msgfeed/unread',
        {
          headers: {
            Cookie: cookies
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('获取未读消息数失败:', error);
      return handleApiError(error, '获取未读消息数失败，请稍后再试');
    }
  }
};

// 生成设备ID（类似UUID格式）
function generateDeviceId() {
  // 生成随机的十六进制字符串
  const generateHex = (length: number) => {
    let result = '';
    const characters = '0123456789ABCDEF';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  // 按照UUID格式生成: 8-4-4-4-12
  const part1 = generateHex(8);
  const part2 = generateHex(4);
  const part3 = generateHex(4);
  const part4 = generateHex(4);
  const part5 = generateHex(12);
  
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}