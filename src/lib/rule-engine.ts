import { Rule, Message } from '@/generated/prisma';

/**
 * 检查消息是否匹配规则
 * @param message 消息内容
 * @param rule 规则对象
 * @returns 是否匹配
 */
export const matchRule = (message: string, rule: Rule): boolean => {
    // 将规则中的关键词字符串转换为数组
    const keywords = rule.keywords.split(',').map(k => k.trim());

    // 检查消息中是否包含任何关键词
    return keywords.some(keyword => {
        // 如果关键词为空，跳过
        if (!keyword) return false;

        // 如果关键词以^开头和$结尾，视为正则表达式
        if (keyword.startsWith('^') && keyword.endsWith('$')) {
            try {
                const regex = new RegExp(keyword, 'i');
                return regex.test(message);
            } catch (e) {
                console.error('Invalid regex pattern:', keyword, e);
                return false;
            }
        }

        // 否则进行普通的包含检查
        return message.toLowerCase().includes(keyword.toLowerCase());
    });
};

/**
 * 根据规则生成回复内容
 * @param message 原始消息
 * @param rule 匹配的规则
 * @returns 生成的回复内容
 */
export const generateReply = (message: string, rule: Rule): string => {
    // 简单替换模板中的变量
    let reply = rule.responseTemplate;

    // 替换{message}为原始消息
    reply = reply.replace(/{message}/g, message);

    // 替换{time}为当前时间
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    reply = reply.replace(/{time}/g, timeStr);

    return reply;
};

/**
 * 处理新消息并根据规则生成回复
 * @param message 消息对象
 * @param rules 规则列表
 * @returns 匹配的规则和生成的回复内容，如果没有匹配则返回null
 */
export const processMessage = (
    message: Message,
    rules: Rule[]
): { rule: Rule; reply: string } | null => {
    // 按优先级排序规则
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    // 只处理活跃的规则
    const activeRules = sortedRules.filter(rule => rule.isActive);

    // 查找第一个匹配的规则
    for (const rule of activeRules) {
        try {
            if (matchRule(message.content, rule)) {
                // 确保规则有type字段，如果没有则设置默认值
                if (!rule.type) {
                    console.log(
                        `规则 ${rule.name} (ID: ${rule.id}) 没有type字段，设置默认值为'general'`
                    );
                    rule.type = 'general';
                }

                const reply = generateReply(message.content, rule);
                return { rule, reply };
            }
        } catch (error) {
            console.error(`处理规则 ${rule.name} (ID: ${rule.id}) 时出错:`, error);
            // 继续处理下一个规则
        }
    }

    // 没有匹配的规则
    return null;
};
