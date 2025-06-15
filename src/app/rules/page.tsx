'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import RuleList from '@/components/rules/RuleList';
import RuleForm from '@/components/rules/RuleForm';

export default function RulesPage() {
    const [userId, setUserId] = useState<string>('');
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [editingRule, setEditingRule] = useState<any>(null);
    const [error, setError] = useState<string>('');

    const router = useRouter();

    // 检查用户是否已登录
    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
            fetchRules();
        } else {
            setLoading(false);
            router.push('/');
        }
    }, [router]);

    // 获取所有规则
    const fetchRules = async () => {
        try {
            setLoading(true);
            setError('');

            const storedUserId = localStorage.getItem('userId');
            if (!storedUserId) {
                setError('缺少用户ID');
                router.push('/');
                return;
            }

            const response = await fetch(`/api/rules?userId=${storedUserId}`);
            const data = await response.json();

            if (data.success) {
                setRules(data.data);
            } else {
                setError(data.message || '获取规则失败');
            }
        } catch (error) {
            console.error('获取规则失败:', error);
            setError('获取规则失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 创建新规则
    const handleCreateRule = async (ruleData: any) => {
        try {
            setLoading(true);
            setError('');

            // 确保添加userId到规则数据中
            const storedUserId = localStorage.getItem('userId');
            if (!storedUserId) {
                setError('缺少用户ID');
                return;
            }

            const response = await fetch('/api/rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...ruleData,
                    userId: storedUserId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setIsCreating(false);
                fetchRules();
            } else {
                setError(data.message || '创建规则失败');
            }
        } catch (error) {
            console.error('创建规则失败:', error);
            setError('创建规则失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 更新规则
    const handleUpdateRule = async (id: string, ruleData: any) => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`/api/rules/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ruleData),
            });

            const data = await response.json();

            if (data.success) {
                setEditingRule(null);
                fetchRules();
            } else {
                setError(data.message || '更新规则失败');
            }
        } catch (error) {
            console.error('更新规则失败:', error);
            setError('更新规则失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 删除规则
    const handleDeleteRule = async (id: string) => {
        if (!confirm('确定要删除这条规则吗？')) {
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await fetch(`/api/rules/${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                fetchRules();
            } else {
                setError(data.message || '删除规则失败');
            }
        } catch (error) {
            console.error('删除规则失败:', error);
            setError('删除规则失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 切换规则启用状态
    const handleToggleRule = async (id: string, enabled: boolean) => {
        try {
            setLoading(true);
            setError('');

            const rule = rules.find(r => r.id === id);
            if (!rule) return;

            const response = await fetch(`/api/rules/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...rule, enabled: !enabled }),
            });

            const data = await response.json();

            if (data.success) {
                fetchRules();
            } else {
                setError(data.message || '更新规则状态失败');
            }
        } catch (error) {
            console.error('更新规则状态失败:', error);
            setError('更新规则状态失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 开始编辑规则
    const handleEditRule = (rule: any) => {
        setEditingRule(rule);
        setIsCreating(false);
    };

    // 取消创建或编辑
    const handleCancel = () => {
        setIsCreating(false);
        setEditingRule(null);
    };

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">规则管理</h1>
                        <p className="mt-1 text-sm text-gray-500">创建和管理自动回复规则</p>
                    </div>

                    {!isCreating && !editingRule && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            创建新规则
                        </button>
                    )}
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

                {loading && !isCreating && !editingRule ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    </div>
                ) : isCreating ? (
                    <div className="bg-white shadow sm:rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                创建新规则
                            </h3>
                            <RuleForm
                                userId={userId}
                                onSubmit={handleCreateRule}
                                onCancel={handleCancel}
                            />
                        </div>
                    </div>
                ) : editingRule ? (
                    <div className="bg-white shadow sm:rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                编辑规则
                            </h3>
                            <RuleForm
                                initialData={editingRule}
                                userId={userId}
                                onSubmit={data => handleUpdateRule(editingRule.id, data)}
                                onCancel={handleCancel}
                            />
                        </div>
                    </div>
                ) : (
                    <RuleList
                        rules={rules}
                        onEdit={handleEditRule}
                        onDelete={handleDeleteRule}
                        onToggle={handleToggleRule}
                    />
                )}
            </div>
        </MainLayout>
    );
}
