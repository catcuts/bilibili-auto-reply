import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, method = 'GET', headers = {}, data = null, params = null } = body;

        if (!url) {
            return NextResponse.json(
                {
                    success: false,
                    message: '缺少请求URL',
                },
                { status: 400 }
            );
        }

        // 获取全局代理配置，包括时间段
        const proxyConfig = await prisma.proxyConfig.findFirst({
            include: {
                timeRanges: true,
            },
        });

        if (!proxyConfig || !proxyConfig.enabled) {
            console.log('代理未配置或未启用，proxyConfig:', proxyConfig);
            return NextResponse.json(
                {
                    success: false,
                    message: '代理未配置或未启用',
                },
                { status: 400 }
            );
        }

        // 检查时间段限制
        if (proxyConfig.enableTimeRanges && proxyConfig.timeRanges.length > 0) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
            const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 转换为1-7表示周一到周日

            console.log('当前时间:', currentTime, '当前星期:', currentDayOfWeek);

            // 检查是否在任一时间段内
            const isInTimeRange = proxyConfig.timeRanges.some(range => {
                // 检查星期是否匹配
                const daysOfWeek = range.daysOfWeek.split(',').map(Number);
                const isDayMatch = daysOfWeek.includes(currentDayOfWeek);

                // 检查时间是否在范围内
                const isTimeMatch = currentTime >= range.startTime && currentTime <= range.endTime;

                console.log(
                    `检查时间段 ${range.name}: 星期匹配=${isDayMatch}, 时间匹配=${isTimeMatch}`
                );

                return isDayMatch && isTimeMatch;
            });

            if (!isInTimeRange) {
                console.log('当前时间不在任何配置的代理时间段内');
                return NextResponse.json(
                    {
                        success: false,
                        message: '当前时间不在配置的代理时间段内',
                    },
                    { status: 400 }
                );
            }

            console.log('当前时间在配置的代理时间段内，允许代理请求');
        }

        // 确保代理主机和端口已配置
        if (!proxyConfig.host || !proxyConfig.port) {
            console.log('代理主机或端口未配置，host:', proxyConfig.host, 'port:', proxyConfig.port);
            return NextResponse.json(
                {
                    success: false,
                    message: '代理主机或端口未配置',
                },
                { status: 400 }
            );
        }

        // 确定目标URL
        let targetUrl = url;

        // 添加日志记录原始URL
        console.log('原始请求URL:', url);

        // 如果有规则脚本，则执行规则脚本
        if (proxyConfig.ruleScript) {
            try {
                // 构建测试请求对象，与测试API保持一致
                const testRequest = {
                    url,
                    method,
                    headers,
                    params: params || {},
                    data: data || null,
                };

                // 注入host和port变量，与测试API保持一致
                const scriptWithWrapper = `
          // 注入host和port变量
          const host = ${JSON.stringify(proxyConfig.host || '')};
          const port = ${proxyConfig.port || 0};
          
          ${proxyConfig.ruleScript}
          
          // 验证transformUrl函数是否存在
          if (typeof transformUrl !== 'function') {
            throw new Error('规则脚本必须包含transformUrl函数');
          }
          
          // 执行转换
          return transformUrl(${JSON.stringify(testRequest)});
        `;

                // 使用Function构造器创建沙箱环境
                const sandboxFunction = new Function(scriptWithWrapper);
                const transformedUrl = sandboxFunction();

                console.log('规则转换后URL:', transformedUrl);

                // 如果规则返回了有效URL，则使用该URL
                if (transformedUrl && typeof transformedUrl === 'string') {
                    targetUrl = transformedUrl;
                } else {
                    // 如果规则没有返回有效URL，则使用原始URL
                    console.log('规则脚本未返回有效URL，使用原始URL');
                    // 不进行URL转换，保持原始URL
                }
            } catch (scriptError) {
                console.error('代理规则执行错误:', scriptError);
                return NextResponse.json(
                    {
                        success: false,
                        message: `代理规则执行错误: ${scriptError.message}`,
                    },
                    { status: 500 }
                );
            }
        } else {
            // 如果没有规则脚本，则使用原始URL
            console.log('没有配置规则脚本，使用原始URL');
            // 不进行URL转换，保持原始URL
        }

        console.log(`代理请求: ${url} -> ${targetUrl}`);

        // 发送代理请求
        try {
            console.log('发送代理请求，配置:', {
                url: targetUrl,
                method,
                headers: Object.keys(headers),
                hasData: !!data,
                hasParams: !!params,
                proxyHost: proxyConfig.host,
                proxyPort: proxyConfig.port,
            });

            // 测试代理连接
            try {
                const testResponse = await fetch(`http://${proxyConfig.host}:${proxyConfig.port}`, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(3000), // 3秒超时
                });
                console.log('代理服务器连接测试:', testResponse.status);
            } catch (testError) {
                console.error('代理服务器连接测试失败:', testError.message);
                return NextResponse.json(
                    {
                        success: false,
                        message: `代理服务器连接失败: ${testError.message}`,
                    },
                    { status: 502 }
                );
            }

            const response = await axios({
                url: targetUrl,
                method,
                headers,
                data,
                params,
                timeout: 30000, // 30秒超时
                validateStatus: () => true, // 允许任何状态码
            });

            console.log('代理请求成功，状态码:', response.status);

            // 返回代理响应
            return NextResponse.json({
                success: true,
                data: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data,
                },
            });
        } catch (error) {
            console.error('代理请求失败:', error);
            console.error('错误详情:', error.message);
            console.error('错误堆栈:', error.stack);
            return NextResponse.json(
                {
                    success: false,
                    message: `代理请求失败: ${error.message}`,
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                    },
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('代理请求失败:', error);
        return NextResponse.json(
            {
                success: false,
                message: `代理请求失败: ${error.message}`,
            },
            { status: 500 }
        );
    }
}
