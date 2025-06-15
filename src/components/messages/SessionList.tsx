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

const SessionList: React.FC<SessionListProps> = ({
    sessions,
    onSelectSession,
    selectedSession,
}) => {
    if (sessions.length === 0) {
        return (
            <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
                <p className="text-gray-500">暂无私信会话</p>
            </div>
        );
    }

    // 格式化日期的辅助函数
    const formatDate = (timestamp: number | string | any): string => {
        if (!timestamp) return '';

        try {
            // 将时间戳转换为字符串
            const timestampStr = String(timestamp);

            // 检查时间戳长度，判断是否为超大毫秒级时间戳
            if (timestampStr.length > 13) {
                // 对于超大时间戳（如1749572730215369），截取前13位作为毫秒级时间戳
                const truncatedTimestamp = Number(timestampStr.substring(0, 13));
                const date = new Date(truncatedTimestamp);

                // 检查日期是否有效
                if (!isNaN(date.getTime())) {
                    // 获取当前日期
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);

                    // 获取消息日期（不含时间）
                    const messageDate = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate()
                    );

                    // 根据日期判断显示格式
                    if (messageDate.getTime() === today.getTime()) {
                        // 今天的消息只显示时间
                        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else if (messageDate.getTime() === yesterday.getTime()) {
                        // 昨天的消息显示"昨天"
                        return `昨天 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    } else {
                        // 其他日期显示完整日期
                        return date.toLocaleDateString();
                    }
                }
            }

            // 对于普通时间戳，直接使用标准处理
            const date = new Date(Number(timestamp));
            if (!isNaN(date.getTime())) {
                // 获取当前日期
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                // 获取消息日期（不含时间）
                const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

                // 根据日期判断显示格式
                if (messageDate.getTime() === today.getTime()) {
                    // 今天的消息只显示时间
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else if (messageDate.getTime() === yesterday.getTime()) {
                    // 昨天的消息显示"昨天"
                    return `昨天 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } else {
                    // 其他日期显示完整日期
                    return date.toLocaleDateString();
                }
            }

            // 如果无法解析为有效日期，返回原始值的字符串形式
            return String(timestamp);
        } catch (e) {
            return String(timestamp); // 出错时返回原始值的字符串形式
        }
    };

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
                {sessions.map(session => {
                    // 解析最后一条消息内容
                    let lastMessageContent = '';
                    try {
                        if (session.last_msg.msg_type === 1) {
                            // 文本消息
                            const content = JSON.parse(session.last_msg.content);
                            lastMessageContent = content.content || '';
                        } else if (session.last_msg.msg_type === 2) {
                            // 图片消息
                            lastMessageContent = '[图片]';
                        } else {
                            lastMessageContent = '[其他类型消息]';
                        }
                    } catch (e) {
                        lastMessageContent = '[解析失败]';
                    }

                    const talkerId = session.talker_id.toString();
                    const isSelected =
                        selectedSession &&
                        selectedSession.talker_id &&
                        selectedSession.talker_id.toString() === talkerId;

                    // 格式化会话时间
                    const formattedTime = session.session_ts ? formatDate(session.session_ts) : ''; // 确保有时间戳

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
                                    <div className="ml-4 flex-1 min-w-0">
                                        {' '}
                                        {/* 确保子元素可以正确收缩 */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 truncate max-w-[60%]">
                                                {' '}
                                                {/* 限制最大宽度 */}
                                                {session.talker_info?.uname || '未知用户'}
                                            </p>
                                            <p className="text-xs text-gray-500 flex-shrink-0 w-auto">
                                                {' '}
                                                {/* 防止时间被压缩并确保有宽度 */}
                                                {formattedTime || '未知时间'}
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
