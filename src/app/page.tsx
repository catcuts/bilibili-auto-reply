'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import LoginForm from '@/components/auth/LoginForm';
import UserInfo from '@/components/user/UserInfo';
import AutoReplyControl from '@/components/auto-reply/AutoReplyControl';

export default function Home() {
    const [userId, setUserId] = useState<string>('');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [processResults, setProcessResults] = useState<any>(null);

    const router = useRouter();

    // 检查本地存储中的用户ID
    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
            fetchUserInfo(storedUserId);
        } else {
            setLoading(false);
        }
    }, []);

    // 获取用户信息
    const fetchUserInfo = async (id: string) => {
        try {
            setLoading(true);

            const response = await fetch(`/api/user?userId=${id}`);
            const data = await response.json();

            if (data.success) {
                setUser(data.data);
            } else {
                // 用户信息获取失败，清除本地存储
                localStorage.removeItem('userId');
                setUserId('');
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            localStorage.removeItem('userId');
            setUserId('');
        } finally {
            setLoading(false);
        }
    };

    // 处理登录成功
    const handleLoginSuccess = (id: string) => {
        setUserId(id);
        localStorage.setItem('userId', id);
        fetchUserInfo(id);
    };

    // 处理退出登录
    const handleLogout = () => {
        localStorage.removeItem('userId');
        setUserId('');
        setUser(null);
    };

    // 处理自动回复完成
    const handleProcessComplete = (results: any) => {
        setProcessResults(results);
    };

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-6">
                    <h1 className="text-2xl font-semibold text-gray-900">B站私信自动回复系统</h1>
                    <p className="mt-1 text-sm text-gray-500">自动回复B站私信，提高社交效率</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    </div>
                ) : userId && user ? (
                    <div className="space-y-6">
                        <UserInfo user={user} onLogout={handleLogout} />

                        <AutoReplyControl
                            userId={userId}
                            onProcessComplete={handleProcessComplete}
                        />

                        {processResults && (
                            <div className="bg-white shadow sm:rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                                        处理结果
                                    </h3>
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500">
                                            共处理 {processResults.processedCount} 条消息
                                        </p>

                                        {processResults.results &&
                                        processResults.results.length > 0 ? (
                                            <ul className="mt-4 divide-y divide-gray-200">
                                                {processResults.results.map(
                                                    (result: any, index: number) => (
                                                        <li key={index} className="py-3">
                                                            <div className="flex flex-col space-y-1">
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    发送者: {result.senderId}
                                                                </p>
                                                                <p className="text-sm text-gray-500">
                                                                    消息内容: {result.content}
                                                                </p>
                                                                {result.success ? (
                                                                    result.noMatchingRule ? (
                                                                        <p className="text-sm text-yellow-600">
                                                                            没有匹配的规则，已标记为已读
                                                                        </p>
                                                                    ) : (
                                                                        <div>
                                                                            <p className="text-sm text-green-600">
                                                                                已自动回复:{' '}
                                                                                {result.reply}
                                                                            </p>
                                                                            <p className="text-sm text-gray-500">
                                                                                使用规则:{' '}
                                                                                {result.ruleName}
                                                                            </p>
                                                                            {result.ruleType && (
                                                                                <p className="text-sm text-gray-500">
                                                                                    规则类型:{' '}
                                                                                    {result.ruleType ===
                                                                                    'general'
                                                                                        ? '通用回复'
                                                                                        : result.ruleType ===
                                                                                            'greeting'
                                                                                          ? '问候语'
                                                                                          : result.ruleType ===
                                                                                              'faq'
                                                                                            ? '常见问题'
                                                                                            : result.ruleType ===
                                                                                                'promotion'
                                                                                              ? '推广内容'
                                                                                              : result.ruleType ===
                                                                                                  'custom'
                                                                                                ? '自定义类型'
                                                                                                : '通用回复'}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    <p className="text-sm text-red-600">
                                                                        处理失败: {result.error}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        ) : (
                                            <p className="mt-4 text-sm text-gray-500">
                                                没有需要处理的新消息
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white shadow sm:rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">
                                    快速导航
                                </h3>
                                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <button
                                            onClick={() => router.push('/rules')}
                                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            管理回复规则
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => router.push('/messages')}
                                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            查看消息记录
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <LoginForm onLoginSuccess={handleLoginSuccess} />
                )}
            </div>
        </MainLayout>
    );
}
