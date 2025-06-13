'use client';

import React from 'react';
import Image from 'next/image';

interface Session {
  session_key: string;
  talker_id: number;
  session_type: number;
  top_ts: number;
  is_follow: number;
  is_dnd: number;
  ack_seqno: number;
  ack_ts: number;
  session_ts: number;
  unread_count: number;
  last_msg: {
    sender_uid: number;
    receiver_type: number;
    receiver_id: number;
    msg_type: number;
    content: string;
    msg_seqno: number;
    timestamp: number;
    at_uids: number[];
    msg_key: number;
    msg_status: number;
    notify_code: string;
    new_face_version: number;
  };
  talker_info: {
    uid: number;
    uname: string;
    face: string;
    face_frame: string;
  };
}

interface SessionListProps {
  sessions: Session[];
  onSelectSession: (talkerId: string) => void;
  selectedSession?: any;
}

const SessionList: React.FC<SessionListProps> = ({ sessions, onSelectSession, selectedSession }) => {
  if (sessions.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
        <p className="text-gray-500">暂无私信会话</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {sessions.map((session) => {
          // 解析最后一条消息内容
          let lastMessageContent = '';
          try {
            if (session.last_msg.msg_type === 1) { // 文本消息
              const content = JSON.parse(session.last_msg.content);
              lastMessageContent = content.content || '';
            } else if (session.last_msg.msg_type === 2) { // 图片消息
              lastMessageContent = '[图片]';
            } else {
              lastMessageContent = '[其他类型消息]';
            }
          } catch (e) {
            lastMessageContent = '[解析失败]';
          }
          
          const talkerId = session.talker_id.toString();
          const isSelected = selectedSession && selectedSession.talker_id && 
                            selectedSession.talker_id.toString() === talkerId;
          
          return (
            <li 
              key={session.session_key}
              className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-indigo-50' : ''}`}
              onClick={() => onSelectSession(talkerId)}
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 relative">
                    <Image
                      className="rounded-full"
                      src={session.talker_info?.face || '/default-avatar.svg'}
                      alt={session.talker_info?.uname || '用户'}
                      width={40}
                      height={40}
                    />
                    {session.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {session.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.talker_info?.uname || '未知用户'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.session_ts * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-500 truncate">
                        {lastMessageContent}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SessionList;