'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  onLoginSuccess: (userId: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [oauthKey, setOauthKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('请使用B站APP扫描二维码登录');
  const [retryCount, setRetryCount] = useState<number>(0);
  
  const router = useRouter();
  
  // 获取登录二维码
  const fetchQrCode = async () => {
    try {
      setLoading(true);
      setError('');
      setStatusMessage('正在获取二维码...');
      
      const response = await fetch('/api/auth/qrcode');
      
      // 检查HTTP状态码
      if (response.status === 503) {
        setError('B站服务器暂时不可用，请稍后再试');
        setRetryCount(prev => prev + 1);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('获取到二维码URL:', data.data.url);
        setQrCodeUrl(data.data.url);
        setOauthKey(data.data.qrcode_key); // 新版API使用qrcode_key
        setStatusMessage('请使用B站APP扫描二维码登录');
        setRetryCount(0); // 重置重试计数
      } else {
        setError(data.message || '获取二维码失败');
        setRetryCount(prev => prev + 1);
      }
    } catch (err) {
      setError('获取二维码时发生错误');
      console.error('获取二维码错误:', err);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };
  
  // 检查登录状态
  const checkLoginStatus = async () => {
    if (!oauthKey || checkingStatus) return;
    
    try {
      setCheckingStatus(true);
      
      const response = await fetch('/api/auth/check-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrcodeKey: oauthKey }) // 更新参数名为qrcodeKey
      });
      
      // 检查HTTP状态码
      if (response.status === 503) {
        setError('B站服务器暂时不可用，请稍后再试');
        setTimeout(checkLoginStatus, 5000); // 5秒后重试
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        // 登录成功
        setStatusMessage('登录成功，正在跳转...');
        console.log('登录成功，返回数据:', data.data);
        onLoginSuccess(data.data.userId);
      } else if (data.data?.code === 86038) {
        // 二维码已失效
        setStatusMessage('二维码已过期，请点击刷新');
        setQrCodeUrl('');
      } else if (data.data?.code === 86101) {
        // 未扫描
        setStatusMessage('请使用B站APP扫描二维码登录');
      } else if (data.data?.code === 86090) {
        // 已扫描未确认
        setStatusMessage('请在B站APP中确认登录');
      } else if (data.message) {
        // 显示错误信息
        setError(data.message);
        setTimeout(checkLoginStatus, 5000); // 5秒后重试
      } else {
        // 其他状态，继续轮询
        setTimeout(checkLoginStatus, 2000);
      }
    } catch (err) {
      setError('检查登录状态时发生错误');
      console.error('检查登录状态错误:', err);
      setTimeout(checkLoginStatus, 5000); // 5秒后重试
    } finally {
      setCheckingStatus(false);
    }
  };
  
  // 初始化获取二维码
  useEffect(() => {
    fetchQrCode();
  }, []);
  
  // 定时检查登录状态
  useEffect(() => {
    if (oauthKey) {
      const timer = setTimeout(checkLoginStatus, 2000);
      return () => clearTimeout(timer);
    }
  }, [oauthKey, checkingStatus]);
  
  // 自动重试获取二维码
  useEffect(() => {
    if (retryCount > 0 && retryCount < 3) {
      const timer = setTimeout(() => {
        fetchQrCode();
      }, 5000 * retryCount); // 重试间隔随重试次数增加
      
      return () => clearTimeout(timer);
    }
  }, [retryCount]);
  
  // 二维码自动刷新（每180秒刷新一次，因为B站二维码有效期通常为3分钟）
  useEffect(() => {
    if (qrCodeUrl) {
      const refreshTimer = setTimeout(() => {
        console.log('二维码即将过期，自动刷新');
        setStatusMessage('二维码即将过期，正在刷新...');
        fetchQrCode();
      }, 170 * 1000); // 170秒后刷新，比实际过期时间提前一点
      
      return () => clearTimeout(refreshTimer);
    }
  }, [qrCodeUrl]);
  
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden p-6">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">B站账号登录</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          {error.includes('B站服务器暂时不可用') && (
            <p className="mt-2 text-sm">B站API服务器可能正在维护或遇到临时问题，请稍后再试。</p>
          )}
        </div>
      )}
      
      <div className="flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : qrCodeUrl ? (
          <div className="text-center">
            <div className="border-2 border-gray-200 rounded-lg p-2 inline-block mb-4">
              {/* 使用QR码生成库的URL，而不是直接使用B站返回的URL */}
              <Image 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`} 
                alt="B站登录二维码" 
                width={200} 
                height={200} 
                className="rounded-lg"
              />
            </div>
            <p className="text-gray-600 mb-4">{statusMessage}</p>
            <button
              onClick={fetchQrCode}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
              disabled={loading}
            >
              刷新二维码
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-4">{statusMessage}</p>
            <button
              onClick={fetchQrCode}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
              disabled={loading}
            >
              获取二维码
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;