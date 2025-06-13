'use client';

import React from 'react';

interface Rule {
  id: string;
  name: string;
  keywords: string;
  responseTemplate: string;
  priority: number;
  isActive: boolean;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RuleListProps {
  rules: Rule[];
  onEdit: (rule: Rule) => void;
  onDelete: (ruleId: string) => void;
  onToggleActive: (rule: Rule) => void;
}

const RuleList: React.FC<RuleListProps> = ({ rules, onEdit, onDelete, onToggleActive }) => {
  if (rules.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
        <p className="text-gray-500">暂无规则，请添加新规则</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {rules.map((rule) => (
          <li key={rule.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-indigo-600 truncate">{rule.name}</p>
                  <span 
                    className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      rule.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {rule.isActive ? '已启用' : '已禁用'}
                  </span>
                  <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {rule.type === 'general' && '通用回复'}
                    {rule.type === 'greeting' && '问候语'}
                    {rule.type === 'faq' && '常见问题'}
                    {rule.type === 'promotion' && '推广内容'}
                    {rule.type === 'custom' && '自定义类型'}
                    {!rule.type && '通用回复'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onToggleActive(rule)}
                    className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded ${
                      rule.isActive
                        ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                        : 'text-green-700 bg-green-100 hover:bg-green-200'
                    }`}
                  >
                    {rule.isActive ? '禁用' : '启用'}
                  </button>
                  <button
                    onClick={() => onEdit(rule)}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => onDelete(rule.id)}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    关键词: {rule.keywords}
                  </p>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                  <p>
                    优先级: {rule.priority}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500 truncate">
                  回复模板: {rule.responseTemplate}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RuleList;