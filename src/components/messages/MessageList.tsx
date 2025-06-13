'use client';

import React from 'react';

interface Message {
  id: string;
  messageId: string;
  senderId: string;
  receiverId: string;
  content: string;
  sentAt: string;
  isAutoReply: boolean;
  ruleName?: string;
  senderName?: string;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId }) => {
  if (messages.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
        <p className="text-gray-500">暂无消息记录</p>
      </div>
    );
  }
  
  // 按日期分组消息
  const groupedMessages: Record<string, Message[]> = {};
  
  messages.forEach(message => {
    const date = new Date(message.sentAt).toLocaleDateString();
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });
  
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="border-b border-gray-200 last:border-b-0">
          <div className="bg-gray-50 px-4 py-2">
            <h3 className="text-sm font-medium text-gray-500">{date}</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {dateMessages.map((message) => (
              <li key={message.id} className="px-4 py-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span 
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                        message.senderId === currentUserId
                          ? 'bg-indigo-100 text-indigo-500'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {message.senderName ? message.senderName.charAt(0) : (message.senderId === currentUserId ? '我' : '对方')}
                    </span>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {message.senderName || (message.senderId === currentUserId ? '我' : '对方')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(message.sentAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-700">{message.content}</p>
                    </div>
                    {message.isAutoReply && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          自动回复 {message.ruleName && `(规则: ${message.ruleName})`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default MessageList;