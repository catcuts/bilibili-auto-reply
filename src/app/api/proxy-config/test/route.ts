import { NextRequest, NextResponse } from 'next/server';

interface TestRequest {
    url: string;
    ruleScript: string;
    host?: string;
    port?: number;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as TestRequest;
        const { url, ruleScript, host, port } = body;

        // 验证必要参数
        if (!url) {
            return NextResponse.json({ success: false, message: '缺少URL参数' }, { status: 400 });
        }

        // 如果没有规则脚本但有主机和端口，使用简单代理模式测试
        if ((!ruleScript || ruleScript.trim() === '') && host && port) {
            try {
                const originalUrl = new URL(url);
                const transformedUrl = `http://${host}:${port}${originalUrl.pathname}${originalUrl.search}`;
                return NextResponse.json({
                    success: true,
                    transformedUrl,
                    message: '使用简单代理模式转换成功',
                });
            } catch (error) {
                console.error('URL解析错误:', error);
                return NextResponse.json(
                    { success: false, message: '无效的URL格式' },
                    { status: 400 }
                );
            }
        }

        // 验证规则脚本
        if (!ruleScript || ruleScript.trim() === '') {
            return NextResponse.json(
                { success: false, message: '缺少代理规则脚本' },
                { status: 400 }
            );
        }

        // 构建测试请求对象
        const testRequest = {
            url,
            method: 'GET',
            headers: {},
            params: {},
            data: null,
        };

        try {
            // 解析URL以提取查询参数
            const urlObj = new URL(url);
            const params: Record<string, string> = {};
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            testRequest.params = params;

            // 创建沙箱环境执行规则脚本
            const scriptWithWrapper = `
        // 注入host和port变量
        const host = ${JSON.stringify(host || '')};
        const port = ${port || 0};
        
        ${ruleScript}
        
        // 验证transformUrl函数是否存在
        if (typeof transformUrl !== 'function') {
          throw new Error('规则脚本必须包含transformUrl函数');
        }
        
        // 执行转换
        return transformUrl(${JSON.stringify(testRequest)});
      `;

            // 使用Function构造器创建沙箱环境
            // 注意：这不是完全安全的沙箱，但对于测试目的足够了
            // 在生产环境中，应考虑使用更安全的沙箱方案
            const sandboxFunction = new Function(scriptWithWrapper);
            const transformedUrl = sandboxFunction();

            // 验证返回值
            if (typeof transformedUrl !== 'string') {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'transformUrl函数必须返回字符串',
                    },
                    { status: 400 }
                );
            }

            // 验证返回的URL格式
            try {
                new URL(transformedUrl);
            } catch (error) {
                return NextResponse.json(
                    {
                        success: false,
                        message: '返回的URL格式无效',
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json({
                success: true,
                transformedUrl,
                message: '规则测试成功',
            });
        } catch (error: any) {
            console.error('规则脚本执行错误:', error);
            return NextResponse.json(
                {
                    success: false,
                    message: `规则脚本执行错误: ${error.message || '未知错误'}`,
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('测试代理规则失败:', error);
        return NextResponse.json({ success: false, message: '测试代理规则失败' }, { status: 500 });
    }
}
