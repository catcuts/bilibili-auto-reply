'use client';

import React, { useState, useEffect } from 'react';

interface AutoReplyControlProps {
    userId: string;
    onProcessComplete: (results: any) => void;
}

const AutoReplyControl: React.FC<AutoReplyControlProps> = ({ userId, onProcessComplete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoCheckEnabled, setAutoCheckEnabled] = useState(false);
    const [checkInterval, setCheckInterval] = useState(60); // 默认60秒
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

    // 从localStorage加载设置
    useEffect(() => {
        // 只有在客户端才能访问localStorage
        if (typeof window !== 'undefined') {
            const savedAutoCheck = localStorage.getItem('autoCheckEnabled');
            const savedInterval = localStorage.getItem('checkInterval');

            if (savedAutoCheck === 'true') {
                setAutoCheckEnabled(true);
            }

            if (savedInterval) {
                const interval = parseInt(savedInterval);
                if (!isNaN(interval) && interval > 0) {
                    setCheckInterval(interval);
                }
            }
        }
    }, []);

    // 当自动检查启用状态变化时，设置定时器
    useEffect(() => {
        if (autoCheckEnabled) {
            // 开始自动检查
            const id = setInterval(handleProcessAutoReply, checkInterval * 1000);
            setIntervalId(id);

            // 立即执行一次
            handleProcessAutoReply();

            // 保存到localStorage
            localStorage.setItem('autoCheckEnabled', 'true');
        } else {
            // 停止自动检查
            if (intervalId) {
                clearInterval(intervalId);
                setIntervalId(null);
            }

            // 保存到localStorage
            localStorage.setItem('autoCheckEnabled', 'false');
        }

        // 组件卸载时清除定时器
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [autoCheckEnabled]); // 只在autoCheckEnabled变化时执行

    // 当检查间隔变化时，保存到localStorage
    useEffect(() => {
        localStorage.setItem('checkInterval', checkInterval.toString());

        // 如果自动检查已启用，重新设置定时器
        if (autoCheckEnabled && intervalId) {
            clearInterval(intervalId);
            const id = setInterval(handleProcessAutoReply, checkInterval * 1000);
            setIntervalId(id);
            // 移除立即执行的逻辑，避免频繁触发请求
        }
    }, [checkInterval]); // 只在checkInterval变化时执行

    // 处理自动回复
    const handleProcessAutoReply = async () => {
        if (!userId || loading) return; // 如果已经在处理中，则不再发起新请求

        try {
            setLoading(true);
            setError('');

            const response = await fetch('/api/auto-reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            const data = await response.json();

            if (data.success) {
                onProcessComplete(data.data);
            } else {
                setError(data.message || '处理自动回复失败');
            }
        } catch (err) {
            setError('处理自动回复时发生错误');
            console.error('处理自动回复错误:', err);
        } finally {
            setLoading(false);
        }
    };

    // 切换自动检查
    const toggleAutoCheck = () => {
        setAutoCheckEnabled(!autoCheckEnabled);
    };

    // 处理间隔变化
    const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value > 0) {
            setCheckInterval(value);
        }
    };

    return (
        <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">自动回复控制</h3>

                {error && (
                    <div className="mt-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <div className="mt-5 space-y-4">
                    <div className="flex items-center">
                        <button
                            onClick={handleProcessAutoReply}
                            disabled={loading || autoCheckEnabled}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                                loading || autoCheckEnabled
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                            }`}
                        >
                            {loading ? '处理中...' : '立即处理私信'}
                        </button>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <input
                                id="auto-check"
                                name="auto-check"
                                type="checkbox"
                                checked={autoCheckEnabled}
                                onChange={toggleAutoCheck}
                                className="h-4 w-4 text-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 border-gray-300 rounded"
                            />
                            <label
                                htmlFor="auto-check"
                                className="ml-2 block text-sm text-gray-900"
                            >
                                启用自动检查
                            </label>
                        </div>

                        <div className="flex items-center">
                            <label htmlFor="check-interval" className="block text-sm text-gray-700">
                                检查间隔（秒）:
                            </label>
                            <input
                                type="number"
                                id="check-interval"
                                name="check-interval"
                                min="10"
                                value={checkInterval}
                                onChange={handleIntervalChange}
                                disabled={autoCheckEnabled}
                                className={`ml-2 block w-20 h-9 rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 sm:text-sm text-gray-900 ${
                                    autoCheckEnabled ? 'bg-gray-100' : 'bg-white'
                                }`}
                            />
                        </div>
                    </div>

                    {autoCheckEnabled && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg
                                        className="h-5 w-5 text-green-400"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-green-700">
                                        自动检查已启用，每 {checkInterval} 秒检查一次新私信
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoReplyControl;
