'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import SessionList from '@/components/messages/SessionList';
import MessageList from '@/components/messages/MessageList';

export default function MessagesPage() {
    const [userId, setUserId] = useState<string>('');
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const router = useRouter();

    // 检查用户是否已登录
    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
            fetchSessions();
        } else {
            setLoading(false);
            router.push('/');
        }
    }, [router]);

    // 获取会话列表
    const fetchSessions = async () => {
        try {
            setLoading(true);
            setError('');

            const storedUserId = localStorage.getItem('userId');
            if (!storedUserId) {
                setError('缺少用户ID');
                router.push('/');
                return;
            }

            const response = await fetch(`/api/messages/sessions?userId=${storedUserId}`);
            const data = await response.json();

            if (data.success) {
                setSessions(data.data);

                // 如果有会话，默认选择第一个
                if (data.data && data.data.length > 0) {
                    const session = data.data[0];
                    const talkerId = session.talker_id ? session.talker_id.toString() : '';

                    // 添加talkerId到session对象
                    const sessionWithTalkerId = {
                        ...session,
                        talkerId,
                    };

                    setSelectedSession(sessionWithTalkerId);
                    if (talkerId) {
                        fetchMessages(talkerId);
                    }
                }
            } else {
                setError(data.message || '获取会话列表失败');
            }
        } catch (error) {
            console.error('获取会话列表失败:', error);
            setError('获取会话列表失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 获取消息内容
    const fetchMessages = async (talkerId: string) => {
        try {
            setLoadingMessages(true);
            setError('');

            const storedUserId = localStorage.getItem('userId');
            if (!storedUserId) {
                setError('缺少用户ID');
                router.push('/');
                return;
            }

            const response = await fetch(`/api/messages/${talkerId}?userId=${storedUserId}`);
            const data = await response.json();

            if (data.success) {
                // 处理API返回的消息数据，确保格式正确
                const processedMessages = data.data.map((msg: any) => {
                    // 如果是B站API返回的原始消息格式
                    if (msg.msg_type !== undefined) {
                        // 处理消息内容
                        let content = msg.content;
                        if (msg.msg_type === 1) {
                            try {
                                const contentObj = JSON.parse(msg.content);
                                if (contentObj && contentObj.content) {
                                    content = contentObj.content;
                                }
                            } catch (e) {
                                // 如果解析失败，保持原始内容
                                console.error('解析消息内容失败:', e);
                            }
                        }

                        return {
                            id: msg.msg_key?.toString() || `temp-${Date.now()}-${Math.random()}`,
                            messageId: msg.msg_key?.toString() || '',
                            senderId: msg.sender_uid?.toString() || '',
                            receiverId: msg.receiver_id?.toString() || '',
                            content,
                            sentAt: msg.timestamp
                                ? new Date(msg.timestamp * 1000).toISOString()
                                : new Date().toISOString(),
                            isAutoReply: false,
                            // 保留原始字段，以便MessageList组件处理
                            msg_type: msg.msg_type,
                            timestamp: msg.timestamp,
                            sender_uid: msg.sender_uid?.toString(),
                            receiver_id: msg.receiver_id?.toString(),
                        };
                    }

                    // 如果是数据库返回的消息格式，保持不变
                    return msg;
                });

                setMessages(processedMessages);
            } else {
                setError(data.message || '获取消息内容失败');
            }
        } catch (error) {
            console.error('获取消息内容失败:', error);
            setError('获取消息内容失败，请稍后重试');
        } finally {
            setLoadingMessages(false);
        }
    };

    // 选择会话
    const handleSelectSession = (session: any) => {
        // 确保session对象包含talkerId
        const talkerId = session.talker_id ? session.talker_id.toString() : session.talkerId;

        if (!talkerId) {
            setError('无法获取会话ID');
            return;
        }

        // 添加talkerId到session对象
        const sessionWithTalkerId = {
            ...session,
            talkerId,
        };

        setSelectedSession(sessionWithTalkerId);
        fetchMessages(talkerId);
    };

    // 发送消息
    const handleSendMessage = async (content: string) => {
        if (!selectedSession || !content.trim()) return;

        try {
            setError('');

            const storedUserId = localStorage.getItem('userId');
            if (!storedUserId) {
                setError('缺少用户ID');
                router.push('/');
                return;
            }

            const response = await fetch(
                `/api/messages/${selectedSession.talkerId}?userId=${storedUserId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content }),
                }
            );

            const data = await response.json();

            if (data.success) {
                // 重新获取消息列表
                fetchMessages(selectedSession.talkerId);
            } else {
                setError(data.message || '发送消息失败');
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            setError('发送消息失败，请稍后重试');
        }
    };

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-6">
                    <h1 className="text-2xl font-semibold text-gray-900">消息记录</h1>
                    <p className="mt-1 text-sm text-gray-500">查看B站私信会话和消息记录</p>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-5 w-5 text-red-400"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3">
                            <SessionList
                                sessions={sessions}
                                selectedSession={selectedSession}
                                onSelectSession={talkerId => {
                                    // 根据talkerId找到对应的session
                                    const session = sessions.find(
                                        s => s.talker_id.toString() === talkerId
                                    );
                                    if (session) {
                                        handleSelectSession(session);
                                    }
                                }}
                            />
                        </div>

                        <div className="w-full md:w-2/3">
                            {selectedSession ? (
                                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                                        <h3 className="text-lg font-medium leading-6 text-gray-900">
                                            {selectedSession.uname}
                                        </h3>
                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                            UID: {selectedSession.talkerId}
                                        </p>
                                    </div>

                                    {loadingMessages ? (
                                        <div className="flex justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                        </div>
                                    ) : (
                                        <div className="px-4 py-5 sm:p-6">
                                            <MessageList
                                                messages={messages}
                                                currentUserId={userId}
                                            />

                                            <div className="mt-6">
                                                <form
                                                    onSubmit={e => {
                                                        e.preventDefault();
                                                        const form = e.target as HTMLFormElement;
                                                        const input = form.elements.namedItem(
                                                            'message'
                                                        ) as HTMLInputElement;
                                                        handleSendMessage(input.value);
                                                        input.value = '';
                                                    }}
                                                    className="flex mt-4"
                                                >
                                                    <input
                                                        type="text"
                                                        name="message"
                                                        className="flex-1 h-10 border border-gray-300 focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 focus:border-indigo-500 block w-full min-w-0 rounded-md sm:text-sm text-gray-900 bg-white"
                                                        placeholder="输入消息..."
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                    >
                                                        发送
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white shadow sm:rounded-lg">
                                    <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                                        请选择一个会话
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
