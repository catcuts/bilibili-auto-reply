'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

interface ProxyConfigData {
  id: string;
  enabled: boolean;
  host: string;
  port: number;
  ruleScript: string;
}

const defaultRuleScript = `/**
 * 代理规则脚本
 * @param {string|Object} url - URL字符串或请求对象
 * @returns {string} - 返回转换后的URL
 */
function transformUrl(url) {
  // 兼容两种调用方式：直接传入URL字符串或传入request对象
  const urlString = typeof url === 'object' && url.url ? url.url : url;
  
  // 默认不转换URL，直接返回原始URL
  // 如需添加转换规则，请在此处添加自定义逻辑
  return urlString;
}`;

export default function ProxyConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proxyConfig, setProxyConfig] = useState<ProxyConfigData>({
    id: '',
    enabled: false,
    host: '',
    port: 0,
    ruleScript: defaultRuleScript
  });
  const [activeTab, setActiveTab] = useState('basic');
  const [testResult, setTestResult] = useState<{success: boolean; message: string; transformedUrl?: string}>({ success: false, message: '' });
  const [testUrl, setTestUrl] = useState('https://api.bilibili.com/x/space/myinfo');
  const [testLoading, setTestLoading] = useState(false);

  // 获取代理配置
  useEffect(() => {
    const fetchProxyConfig = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/proxy-config`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setProxyConfig(data.data);
        } else {
          // 如果没有配置，使用默认值
          setProxyConfig({
            id: '',
            enabled: false,
            host: '',
            port: 0,
            ruleScript: defaultRuleScript
          });
        }
      } catch (error) {
        console.error('获取代理配置失败:', error);
        toast.error('获取代理配置失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProxyConfig();
  }, []);
  
  // 保存代理配置
  const saveProxyConfig = async () => {    
    try {
      setSaving(true);
      
      // 验证主机和端口
      if (proxyConfig.enabled) {
        if (!proxyConfig.host || proxyConfig.host.trim() === '') {
          toast.error('请输入代理主机地址');
          return;
        }
        
        if (!proxyConfig.port || proxyConfig.port <= 0 || proxyConfig.port > 65535) {
          toast.error('请输入有效的端口号 (1-65535)');
          return;
        }
      }
      
      console.log('保存代理配置:', JSON.stringify(proxyConfig, null, 2));
      
      const response = await fetch('/api/proxy-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proxyConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('代理配置已保存');
        setProxyConfig(data.data);
        console.log('代理配置保存成功:', JSON.stringify(data.data, null, 2));
      } else {
        toast.error(data.message || '保存代理配置失败');
        console.error('保存代理配置失败:', data.message);
      }
    } catch (error) {
      console.error('保存代理配置失败:', error);
      toast.error('保存代理配置失败');
    } finally {
      setSaving(false);
    }
  };
  
  // 测试代理规则
  const testProxyRule = async () => {
    if (!testUrl) {
      toast.error('请输入测试URL');
      return;
    }
    
    try {
      setTestLoading(true);
      setTestResult({ success: false, message: '' });
      
      // 验证URL格式
      try {
        new URL(testUrl);
      } catch (error) {
        toast.error('请输入有效的URL格式');
        setTestResult({ success: false, message: '无效的URL格式' });
        setTestLoading(false);
        return;
      }
      
      console.log('测试代理规则，配置:', {
        url: testUrl,
        hasRuleScript: !!proxyConfig.ruleScript,
        host: proxyConfig.host,
        port: proxyConfig.port
      });
      
      const response = await fetch('/api/proxy-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: testUrl,
          ruleScript: proxyConfig.ruleScript,
          host: proxyConfig.host,
          port: proxyConfig.port
        })
      });
      
      const data = await response.json();
      console.log('测试代理规则响应:', data);
      
      if (data.success) {
        setTestResult({
          success: true,
          message: '规则测试成功',
          transformedUrl: data.transformedUrl
        });
        toast.success('规则测试成功');
      } else {
        setTestResult({
          success: false,
          message: data.message || '规则测试失败'
        });
        toast.error(data.message || '规则测试失败');
      }
    } catch (error) {
      console.error('测试代理规则失败:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试代理规则失败'
      });
      toast.error('测试代理规则失败');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载代理配置...</span>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>代理设置</CardTitle>
        <CardDescription>
          配置代理服务器，用于与B站API通信。代理可以帮助解决网络问题或自定义请求处理。
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center space-x-2 mb-6">
          <Switch
            id="proxy-enabled"
            checked={proxyConfig.enabled}
            onCheckedChange={(checked) => setProxyConfig({...proxyConfig, enabled: checked})}
          />
          <Label htmlFor="proxy-enabled">启用代理</Label>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="basic">基本设置</TabsTrigger>
            <TabsTrigger value="advanced">高级规则</TabsTrigger>
            <TabsTrigger value="test">规则测试</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proxy-host">代理主机</Label>
                  <Input
                    id="proxy-host"
                    placeholder="例如: 127.0.0.1 或 proxy.example.com"
                    value={proxyConfig.host}
                    onChange={(e) => setProxyConfig({...proxyConfig, host: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="proxy-port">代理端口</Label>
                  <Input
                    id="proxy-port"
                    type="number"
                    placeholder="例如: 8080"
                    value={proxyConfig.port || ''}
                    onChange={(e) => setProxyConfig({...proxyConfig, port: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  如果只配置主机和端口，系统将使用简单代理模式，将所有B站API请求转发到指定的代理服务器。
                  如需更高级的代理规则，请切换到"高级规则"选项卡。
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-script">代理规则脚本 (JavaScript)</Label>
                <Textarea
                  id="rule-script"
                  className="font-mono h-80"
                  value={proxyConfig.ruleScript}
                  onChange={(e) => setProxyConfig({...proxyConfig, ruleScript: e.target.value})}
                  placeholder="输入JavaScript代理规则脚本..."
                />
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  代理规则脚本允许您自定义如何转换请求URL。脚本必须包含一个名为transformUrl的函数，
                  该函数接收请求对象作为参数，并返回转换后的URL字符串。
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="test">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-url">测试URL</Label>
                <div className="flex space-x-2">
                  <Input
                    id="test-url"
                    placeholder="输入要测试的URL，例如: https://api.bilibili.com/x/space/myinfo"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                  />
                  <Button onClick={testProxyRule} disabled={testLoading}>
                    {testLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    测试
                  </Button>
                </div>
              </div>
              
              {testResult.message && (
                <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.transformedUrl && (
                    <p className="mt-2 font-mono text-sm break-all">
                      转换后URL: {testResult.transformedUrl}
                    </p>
                  )}
                </div>
              )}
              
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  使用此工具测试您的代理规则脚本。输入一个URL，系统将使用您的规则脚本处理它，
                  并显示转换后的URL。这有助于验证您的规则是否按预期工作。
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter>
        <Button onClick={saveProxyConfig} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          保存代理设置
        </Button>
      </CardFooter>
    </Card>
  );
}