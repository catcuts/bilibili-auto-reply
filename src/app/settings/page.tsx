'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import dynamic from 'next/dynamic';

// 动态导入代理配置组件
const ProxyConfig = dynamic(() => import('@/components/settings/ProxyConfig'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-40 rounded-md"></div>,
  ssr: false
});

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-2xl font-semibold text-gray-900">系统设置</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理系统配置和个人偏好
          </p>
        </div>
        
        <div className="space-y-6">
          {/* 基本设置卡片 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">应用设置</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">个人偏好和系统配置</p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">主题设置</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <select 
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 focus:border-indigo-500 sm:text-sm rounded-md"
                      defaultValue="light"
                    >
                      <option value="light">浅色主题</option>
                      <option value="dark">深色主题</option>
                      <option value="system">跟随系统</option>
                    </select>
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">通知设置</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="notifications"
                          name="notifications"
                          type="checkbox"
                          className="focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="notifications" className="font-medium text-gray-700">启用桌面通知</label>
                        <p className="text-gray-500">当收到新消息时显示桌面通知</p>
                      </div>
                    </div>
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">数据保存</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="save_data"
                          name="save_data"
                          type="checkbox"
                          defaultChecked
                          className="focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="save_data" className="font-medium text-gray-700">保存消息历史</label>
                        <p className="text-gray-500">保存消息历史记录以便查看</p>
                      </div>
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                type="button"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                保存设置
              </button>
            </div>
          </div>
          
          {/* 代理配置卡片 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">代理配置</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">设置代理服务器以优化与B站API的通信</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <ProxyConfig />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}