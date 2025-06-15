'use client';

import React, { useState } from 'react';

interface Rule {
    id?: string;
    name: string;
    keywords: string;
    responseTemplate: string;
    priority: number;
    isActive: boolean;
    type: string;
}

interface RuleFormProps {
    initialData?: Rule;
    userId: string;
    onSubmit: (rule: Rule) => void;
    onCancel: () => void;
}

const RuleForm: React.FC<RuleFormProps> = ({ initialData, userId, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<Rule>(
        initialData || {
            name: '',
            keywords: '',
            responseTemplate: '',
            priority: 0,
            isActive: true,
            type: 'general',
        }
    );

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? (e.target as HTMLInputElement).checked
                    : type === 'number'
                      ? parseInt(value)
                      : value,
        }));

        // 清除对应字段的错误
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = '规则名称不能为空';
        }

        if (!formData.keywords.trim()) {
            newErrors.keywords = '关键词不能为空';
        }

        if (!formData.responseTemplate.trim()) {
            newErrors.responseTemplate = '回复模板不能为空';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            onSubmit({
                ...formData,
                id: initialData?.id,
                userId: userId, // 确保包含userId
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    规则名称
                </label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-gray-900 bg-white shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 sm:text-sm ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
                    关键词（多个关键词用逗号分隔）
                </label>
                <input
                    type="text"
                    id="keywords"
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-gray-900 bg-white shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 sm:text-sm ${errors.keywords ? 'border-red-500' : ''}`}
                />
                <p className="mt-1 text-xs text-gray-500">
                    支持普通关键词和正则表达式（使用^开头$结尾表示正则），如：你好,^问候.*$
                </p>
                {errors.keywords && <p className="mt-1 text-sm text-red-600">{errors.keywords}</p>}
            </div>

            <div>
                <label
                    htmlFor="responseTemplate"
                    className="block text-sm font-medium text-gray-700"
                >
                    回复模板
                </label>
                <textarea
                    id="responseTemplate"
                    name="responseTemplate"
                    rows={4}
                    value={formData.responseTemplate}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-gray-900 bg-white shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 sm:text-sm ${errors.responseTemplate ? 'border-red-500' : ''}`}
                />
                <p className="mt-1 text-xs text-gray-500">
                    支持变量：{'{message}'}（原始消息）、{'{time}'}（当前时间）
                </p>
                {errors.responseTemplate && (
                    <p className="mt-1 text-sm text-red-600">{errors.responseTemplate}</p>
                )}
            </div>

            <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    优先级（数字越大优先级越高）
                </label>
                <input
                    type="number"
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-gray-900 bg-white shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 sm:text-sm"
                />
            </div>

            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    规则类型
                </label>
                <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-gray-900 bg-white shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 sm:text-sm"
                >
                    <option value="general">通用回复</option>
                    <option value="greeting">问候语</option>
                    <option value="faq">常见问题</option>
                    <option value="promotion">推广内容</option>
                    <option value="custom">自定义类型</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">选择规则类型，便于分类管理</p>
            </div>

            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    启用规则
                </label>
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    取消
                </button>
                <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    {initialData ? '更新规则' : '创建规则'}
                </button>
            </div>
        </form>
    );
};

export default RuleForm;
