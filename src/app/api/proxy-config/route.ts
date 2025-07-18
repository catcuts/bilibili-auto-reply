import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 获取代理配置
export async function GET(request: NextRequest) {
    try {
        // 查找全局代理配置
        let proxyConfig = await prisma.proxyConfig.findFirst({
            include: {
                timeRanges: true,
            },
        });

        // 如果不存在，则创建一个默认配置
        if (!proxyConfig) {
            proxyConfig = await prisma.proxyConfig.create({
                data: {
                    enabled: false,
                    host: '',
                    port: 0,
                    enableTimeRanges: false,
                    ruleScript:
                        '// 代理规则示例\n// 参数: url - 原始请求URL\n// 返回: 代理后的URL或null（不代理）\nfunction proxyRule(url) {\n  // 示例: 将bilibili.com的请求代理到指定IP\n  if (url.includes("bilibili.com")) {\n    return url.replace(/https?:\\/\\/[^/]+/, "http://120.55.187.208:9100");\n  }\n  return null; // 不代理\n}',
                },
            });
        }

        return NextResponse.json({
            success: true,
            data: proxyConfig,
        });
    } catch (error) {
        console.error('获取代理配置失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: '获取代理配置时发生错误',
            },
            { status: 500 }
        );
    }
}

// 更新代理配置
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { enabled, host, port, ruleScript, enableTimeRanges, timeRanges } = body;

        // 验证脚本语法
        try {
            if (ruleScript) {
                // 尝试编译脚本，检查语法错误
                new Function('url', ruleScript);
            }
        } catch (scriptError) {
            return NextResponse.json(
                {
                    success: false,
                    message: `代理规则脚本语法错误: ${scriptError.message}`,
                },
                { status: 400 }
            );
        }

        // 查找现有配置
        const existingConfig = await prisma.proxyConfig.findFirst();

        let proxyConfig;

        // 开始事务处理，确保时间段更新的原子性
        proxyConfig = await prisma.$transaction(async tx => {
            let updatedConfig;

            if (existingConfig) {
                // 更新现有配置
                updatedConfig = await tx.proxyConfig.update({
                    where: { id: existingConfig.id },
                    data: {
                        enabled: enabled !== undefined ? enabled : existingConfig.enabled,
                        host: host !== undefined ? host : existingConfig.host,
                        port: port !== undefined ? port : existingConfig.port,
                        ruleScript:
                            ruleScript !== undefined ? ruleScript : existingConfig.ruleScript,
                        enableTimeRanges:
                            enableTimeRanges !== undefined
                                ? enableTimeRanges
                                : existingConfig.enableTimeRanges,
                    },
                    include: {
                        timeRanges: true,
                    },
                });

                // 如果提供了时间段数据，则更新时间段
                if (timeRanges !== undefined) {
                    // 删除所有现有时间段
                    await tx.proxyTimeRange.deleteMany({
                        where: { proxyConfigId: existingConfig.id },
                    });

                    // 创建新的时间段
                    if (timeRanges && timeRanges.length > 0) {
                        for (const range of timeRanges) {
                            await tx.proxyTimeRange.create({
                                data: {
                                    name: range.name,
                                    startTime: range.startTime,
                                    endTime: range.endTime,
                                    daysOfWeek: range.daysOfWeek,
                                    proxyConfigId: updatedConfig.id,
                                },
                            });
                        }
                    }

                    // 重新获取更新后的配置，包括新的时间段
                    updatedConfig = await tx.proxyConfig.findUnique({
                        where: { id: updatedConfig.id },
                        include: { timeRanges: true },
                    });
                }
            } else {
                // 创建新配置
                updatedConfig = await tx.proxyConfig.create({
                    data: {
                        enabled: enabled !== undefined ? enabled : false,
                        host: host || '',
                        port: port || 0,
                        ruleScript: ruleScript || '',
                        enableTimeRanges: enableTimeRanges !== undefined ? enableTimeRanges : false,
                        timeRanges: {
                            create:
                                timeRanges && timeRanges.length > 0
                                    ? timeRanges.map(range => ({
                                          name: range.name,
                                          startTime: range.startTime,
                                          endTime: range.endTime,
                                          daysOfWeek: range.daysOfWeek,
                                      }))
                                    : [],
                        },
                    },
                    include: {
                        timeRanges: true,
                    },
                });
            }

            return updatedConfig;
        });

        return NextResponse.json({
            success: true,
            data: proxyConfig,
        });
    } catch (error) {
        console.error('更新代理配置失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: '更新代理配置时发生错误',
            },
            { status: 500 }
        );
    }
}
