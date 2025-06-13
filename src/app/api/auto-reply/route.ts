import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { messageApi, utilApi } from '@/lib/bilibili-api';
import { processMessage } from '@/lib/rule-engine';

// 处理自动回复
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    console.log('自动回复请求参数:', { userId });
    
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
    
    console.log('用户信息:', {
      id: user.id,
      biliUserId: user.biliUserId,
      hasCookies: !!user.cookies,
      cookiesLength: user.cookies?.length
    });
    
    // 首先尝试从请求cookies中获取csrf令牌
    let csrf = request.cookies.get('bili_jct')?.value;
    
    // 如果请求cookies中没有，则从用户存储的cookies中提取
    if (!csrf) {
      csrf = utilApi.extractCsrfFromCookie(user.cookies);
    }
    
    console.log('CSRF令牌:', {
      fromRequestCookies: !!request.cookies.get('bili_jct')?.value,
      fromUserCookies: !!utilApi.extractCsrfFromCookie(user.cookies),
      finalCsrf: csrf ? csrf.substring(0, 3) + '...' : null // 只显示部分csrf令牌，保护安全
    });
    
    if (!csrf) {
      return NextResponse.json({
        success: false,
        message: 'CSRF令牌无效，请重新登录'
      }, { status: 401 });
    }
    
    // 获取会话列表
    const sessionListData = await messageApi.getSessionList(user.cookies);
    
    if (sessionListData.code !== 0) {
      console.log('获取会话列表失败:', {
        code: sessionListData.code,
        message: sessionListData.message
      });
      return NextResponse.json({
        success: false,
        message: sessionListData.message || '获取会话列表失败'
      }, { status: 400 });
    }
    
    const sessionList = sessionListData.data.session_list || [];
    console.log('获取到会话列表:', {
      totalSessions: sessionList.length,
      unreadSessions: sessionList.filter(s => s.unread_count > 0).length
    });
    
    const processedResults = [];
    
    // 获取用户的所有规则
    const userRules = await prisma.rule.findMany({
      where: { userId: user.id }
    });
    
    console.log('用户规则:', {
      totalRules: userRules.length,
      ruleNames: userRules.map(r => r.name)
    });
    
    // 处理每个会话
    for (const session of sessionList) {
      // 只处理未读消息
      // 处理未读会话
      if (session.unread_count > 0) {
        const talkerId = session.talker_id ? session.talker_id.toString() : '';
        
        console.log('处理未读会话:', {
          talkerId,
          unreadCount: session.unread_count,
          talkerName: session.talker_info?.uname
        });
        
        // 检查talkerId是否有效
        if (!talkerId || talkerId === 'undefined') {
          console.error('跳过处理：无效的talkerId');
          continue;
        }
        
        // 获取私信内容
        console.log('开始获取私信内容，talkerId:', talkerId);
        const messagesData = await messageApi.getSessionMessages(user.cookies, talkerId);
        
        console.log('私信内容原始响应:', {
          code: messagesData.code,
          message: messagesData.message,
          hasData: !!messagesData.data,
          hasMessages: Array.isArray(messagesData.data?.messages),
          messagesDataType: typeof messagesData.data
        });
        
        if (messagesData.code === 0) {
          // 尝试从不同可能的字段获取消息数组
          let messages = [];
          const possibleMessageFields = ['messages', 'message_list', 'msg_list', 'msgs'];
          
          for (const field of possibleMessageFields) {
            if (messagesData.data && Array.isArray(messagesData.data[field]) && messagesData.data[field].length > 0) {
              console.log(`使用消息数组字段: ${field}，长度: ${messagesData.data[field].length}`);
              messages = messagesData.data[field];
              break;
            }
          }
          
          // 如果没有找到消息数组，尝试检查是否有嵌套的数据结构
          if (messages.length === 0 && messagesData.data) {
            console.log('尝试检查嵌套数据结构，data字段的键:', Object.keys(messagesData.data).join(','));
            
            // 检查是否有messages_list字段
            if (messagesData.data.messages_list && typeof messagesData.data.messages_list === 'object') {
              console.log('找到messages_list字段，检查其内容');
              // 遍历messages_list对象的所有键
              for (const key in messagesData.data.messages_list) {
                if (Array.isArray(messagesData.data.messages_list[key])) {
                  console.log(`找到消息数组，键: ${key}，长度: ${messagesData.data.messages_list[key].length}`);
                  messages = messagesData.data.messages_list[key];
                  break;
                }
              }
            }
          }
          
          console.log('获取到私信内容:', {
            totalMessages: messages.length,
            textMessages: messages.filter(m => m.msg_type === 1).length,
            fromOthers: messages.filter(m => m.sender_uid && m.sender_uid.toString() !== user.biliUserId).length,
            messageTypes: messages.length > 0 ? [...new Set(messages.map(m => m.msg_type))].join(',') : '无消息类型'
          });
          
          if (messages.length > 0) {
            console.log('第一条消息示例:', {
              msg_type: messages[0].msg_type,
              sender_uid: messages[0].sender_uid,
              content_type: typeof messages[0].content,
              content_preview: typeof messages[0].content === 'string' ? messages[0].content.substring(0, 50) : 'non-string content',
              allFields: Object.keys(messages[0]).join(',')
            });
          } else {
            console.log('未找到任何消息，尝试输出完整的messagesData.data结构:', 
              JSON.stringify(messagesData.data).substring(0, 500) + '...');
          }
          
          // 解析消息内容
          const unprocessedMessages = [];
          console.log(`处理过滤后的消息，数量: ${messages.length}`);
          
          for (const msg of messages) {
            console.log('处理消息对象:', {
              msg_type: msg.msg_type,
              has_sender_uid: !!msg.sender_uid,
              has_msg_key: !!msg.msg_key,
              has_content: !!msg.content,
              content_type: typeof msg.content,
              has_timestamp: !!msg.timestamp
            });
            
            // 只处理文本消息且发送者不是自己
            if (msg.msg_type === 1 && msg.sender_uid && msg.sender_uid.toString() !== user.biliUserId) {
              try {
                // 尝试获取消息ID
                let messageId = msg.msg_key || msg.message_id || msg.id || msg._id || msg.msg_seqno;
                
                // 处理可能的嵌套ID结构
                if (!messageId && msg.msg_id) {
                  messageId = typeof msg.msg_id === 'object' ? msg.msg_id.id || msg.msg_id.msg_id : msg.msg_id;
                }
                
                // 尝试从last_msg字段获取ID
                if (!messageId && msg.last_msg) {
                  const lastMsg = typeof msg.last_msg === 'string' ? JSON.parse(msg.last_msg) : msg.last_msg;
                  messageId = lastMsg.msg_key || lastMsg.msg_seqno || lastMsg.key || lastMsg.id || lastMsg.message_id;
                }
                
                if (!messageId) {
                  console.log('跳过没有消息ID的消息:', JSON.stringify(msg).substring(0, 100) + '...');
                  continue;
                }
                
                // 记录消息ID的来源和类型
                console.log('获取到消息ID:', {
                  messageId,
                  type: typeof messageId,
                  source: Object.keys(msg).filter(key => msg[key] === messageId || 
                    (typeof msg[key] === 'object' && msg[key] && msg[key].id === messageId))[0] || '未知'
                });
                
                // 尝试解析消息内容，处理不同的格式
                let content = '';
                
                // 首先检查常见的内容字段
                if (msg.content) {
                  if (typeof msg.content === 'string') {
                    try {
                      // 尝试解析JSON格式的内容
                      const contentObj = JSON.parse(msg.content);
                      if (contentObj.content) {
                        content = contentObj.content;
                      } else {
                        // 如果没有content字段，尝试其他可能的字段
                        content = contentObj.text || contentObj.message || contentObj.msg || JSON.stringify(contentObj);
                      }
                    } catch (e) {
                      // 如果不是JSON格式，直接使用字符串内容
                      console.log('消息内容不是JSON格式，直接使用字符串内容');
                      content = msg.content;
                    }
                  } else if (typeof msg.content === 'object') {
                    // 如果内容已经是对象，尝试获取文本内容
                    content = msg.content.content || msg.content.text || msg.content.message || JSON.stringify(msg.content);
                  }
                }
                
                // 如果content字段没有内容，尝试其他可能的字段
                if (!content) {
                  // 尝试从msg.text或msg.message获取内容
                  content = msg.text || msg.message || msg.msg;
                  
                  // 尝试从last_msg字段获取内容
                  if (!content && msg.last_msg) {
                    try {
                      const lastMsg = typeof msg.last_msg === 'string' ? JSON.parse(msg.last_msg) : msg.last_msg;
                      content = lastMsg.content;
                      
                      // 如果last_msg.content是对象，尝试提取文本
                      if (typeof content === 'object') {
                        content = content.content || content.text || content.message || JSON.stringify(content);
                      } else if (typeof content === 'string') {
                        try {
                          // 尝试解析JSON
                          const contentObj = JSON.parse(content);
                          content = contentObj.content || contentObj.text || contentObj.message || JSON.stringify(contentObj);
                        } catch (e) {
                          // 如果不是JSON，保持原样
                        }
                      }
                    } catch (e) {
                      console.log('解析last_msg失败:', e.message);
                    }
                  }
                }
                
                // 如果仍然没有内容，记录并跳过
                if (!content) {
                  console.log('无法解析消息内容，跳过此消息:', JSON.stringify(msg).substring(0, 100) + '...');
                  continue;
                }
                
                if (!content) {
                  console.log(`跳过没有内容的消息: ${messageId}`);
                  continue;
                }
                
                console.log('处理私信:', {
                  messageId,
                  content: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
                  timestamp: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString()
                });
                
                // 检查消息是否已处理
                const existingMessage = await prisma.message.findUnique({
                  where: { messageId: messageId.toString() }
                });
                
                if (!existingMessage) {
                  try {
                    // 获取接收者ID
                    let receiverId = user.biliUserId; // 默认为当前用户ID
                    if (msg.receiver_id) {
                      receiverId = msg.receiver_id.toString();
                    }
                    
                    // 获取发送时间
                    let sentAt = new Date();
                    if (msg.timestamp) {
                      sentAt = new Date(msg.timestamp * 1000);
                    }
                    
                    console.log('保存消息到数据库:', {
                      messageId,
                      senderId: msg.sender_uid.toString(),
                      receiverId,
                      contentLength: content.length,
                      sentAt: sentAt.toISOString()
                    });
                    
                    // 保存消息到数据库
                    const savedMessage = await prisma.message.create({
                      data: {
                        messageId: messageId.toString(),
                        userId: user.id,
                        senderId: msg.sender_uid.toString(),
                        receiverId,
                        content,
                        sentAt,
                        isRead: false,
                        isProcessed: false
                      }
                    });
                    
                    console.log(`成功保存消息到数据库: ${messageId}`);
                    unprocessedMessages.push(savedMessage);
                  } catch (error) {
                    console.error('保存消息到数据库失败:', error);
                  }
                } else {
                  console.log('消息已存在，跳过处理:', messageId);
                }
              } catch (e) {
                console.error('解析消息内容失败:', e);
              }
            }
          }
          
          // 处理未处理的消息
          for (const message of unprocessedMessages) {
            // 匹配规则并生成回复
            const processResult = processMessage(message, userRules);
            
            if (processResult) {
              try {
                console.log('规则匹配成功:', {
                  messageId: message.messageId,
                  ruleId: processResult.rule.id,
                  ruleName: processResult.rule.name,
                  ruleType: processResult.rule.type || '未定义类型',
                  replyLength: processResult.reply.length
                });
              } catch (error) {
                console.error('规则匹配成功，但记录日志时出错:', error);
              }
              
              try {
                console.log('准备发送自动回复:', {
                  senderId: user.biliUserId,
                  receiverId: message.senderId,
                  reply: processResult.reply.substring(0, 30) + (processResult.reply.length > 30 ? '...' : ''),
                  ruleName: processResult.rule.name,
                  ruleType: processResult.rule.type || '未定义类型'
                });
              } catch (error) {
                console.error('准备发送自动回复时出错:', error);
              }
              
              // 发送自动回复
              const sendResult = await messageApi.sendMessage(
                user.cookies,
                user.biliUserId,
                message.senderId,
                processResult.reply,
                csrf
              );
              
              console.log('发送自动回复结果:', {
                code: sendResult.code,
                message: sendResult.message,
                success: sendResult.code === 0,
                msgKey: sendResult.data?.msg_key,
                timestamp: sendResult.data?.timestamp
              });
              
              if (sendResult.code === 0) {
                // 保存自动回复消息到数据库
                await prisma.message.create({
                  data: {
                    messageId: sendResult.data.msg_key.toString(),
                    userId: user.id,
                    senderId: user.biliUserId,
                    receiverId: message.senderId,
                    content: processResult.reply,
                    sentAt: new Date(),
                    isRead: true,
                    isProcessed: true,
                    isAutoReply: true,
                    ruleId: processResult.rule.id
                  }
                });
                
                console.log('自动回复消息已保存到数据库');
                
                // 更新原消息为已处理
                await prisma.message.update({
                  where: { id: message.id },
                  data: {
                    isProcessed: true,
                    isRead: true
                  }
                });
                
                console.log('原消息已标记为已处理');
                
                try {
                  processedResults.push({
                    messageId: message.messageId,
                    senderId: message.senderId,
                    content: message.content,
                    reply: processResult.reply,
                    ruleName: processResult.rule.name,
                    ruleType: processResult.rule.type || '未定义类型',
                    success: true
                  });
                } catch (error) {
                  console.error('添加处理结果时出错:', error);
                  processedResults.push({
                    messageId: message.messageId,
                    senderId: message.senderId,
                    content: message.content,
                    reply: processResult.reply,
                    ruleName: processResult.rule.name,
                    success: true,
                    error: '规则类型处理错误: ' + error.message
                  });
                }
              } else {
                console.error('发送自动回复失败:', {
                  code: sendResult.code,
                  message: sendResult.message,
                  data: sendResult.data
                });
                
                processedResults.push({
                  messageId: message.messageId,
                  senderId: message.senderId,
                  content: message.content,
                  error: sendResult.message || '发送自动回复失败',
                  success: false
                });
              }
            } else {
              // 没有匹配的规则，标记为已处理
              await prisma.message.update({
                where: { id: message.id },
                data: {
                  isProcessed: true,
                  isRead: true
                }
              });
              
              processedResults.push({
                messageId: message.messageId,
                senderId: message.senderId,
                content: message.content,
                noMatchingRule: true,
                success: true
              });
            }
          }
          
          // 标记会话为已读
          if (messages.length > 0 && session.ack_seqno) {
            console.log('标记会话为已读:', {
              talkerId,
              ackSeqno: session.ack_seqno
            });
            
            await messageApi.markAsRead(user.cookies, talkerId, session.ack_seqno, csrf);
          }
        } else {
          console.error('获取私信内容失败:', {
            code: messagesData.code,
            message: messagesData.message
          });
        }
      }
    }
    
    console.log('自动回复处理完成:', {
      processedCount: processedResults.length,
      successCount: processedResults.filter(r => r.success).length,
      failureCount: processedResults.filter(r => !r.success).length,
      noMatchingRuleCount: processedResults.filter(r => r.noMatchingRule).length
    });
    
    return NextResponse.json({
      success: true,
      data: {
        processedCount: processedResults.length,
        results: processedResults
      }
    });
  } catch (error) {
    console.error('处理自动回复失败:', error);
    
    // 记录详细的错误信息
    if (error.response) {
      console.error('API错误响应:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('请求未收到响应:', error.request);
    } else {
      console.error('请求配置错误:', error.message);
    }
    
    // 记录错误堆栈
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
    
    return NextResponse.json({
      success: false,
      message: '处理自动回复时发生错误'
    }, { status: 500 });
  }
}