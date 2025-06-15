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
import { Loader2, Plus, Trash2, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProxyTimeRange {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string;
}

interface ProxyConfigData {
  id: string;
  enabled: boolean;
  host: string;
  port: number;
  ruleScript: string;
  enableTimeRanges: boolean;
  timeRanges: ProxyTimeRange[];
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
    ruleScript: defaultRuleScript,
    enableTimeRanges: false,
    timeRanges: []
  });
  const [activeTab, setActiveTab] = useState('basic');
  const [newTimeRange, setNewTimeRange] = useState<ProxyTimeRange>({
    name: '',
    startTime: '08:00',
    endTime: '18:00',
    daysOfWeek: '1,2,3,4,5'
  });
  const [editingTimeRange, setEditingTimeRange] = useState<{index: number; data: ProxyTimeRange | null}>({index: -1, data: null});
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
            ruleScript: defaultRuleScript,
            enableTimeRanges: false,
            timeRanges: []
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
      <CardContent className="pt-6">
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
            <TabsTrigger value="time-ranges">时间段设置</TabsTrigger>
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
          
          <TabsContent value="time-ranges">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="enable-time-ranges"
                  checked={proxyConfig.enableTimeRanges}
                  onCheckedChange={(checked) => setProxyConfig({...proxyConfig, enableTimeRanges: checked})}
                  disabled={!proxyConfig.enabled}
                />
                <Label htmlFor="enable-time-ranges">启用代理时间段</Label>
                {!proxyConfig.enabled && (
                  <Badge variant="outline" className="ml-2 text-amber-500 border-amber-200 bg-amber-50">
                    需要先启用代理
                  </Badge>
                )}
              </div>
              
              {proxyConfig.enabled && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-md">
                    <p className="text-sm text-slate-700 mb-2">
                      <Clock className="h-4 w-4 inline-block mr-1" />
                      时间段设置允许您指定代理仅在特定时间段内生效。
                      {proxyConfig.enableTimeRanges ? (
                        <span>当前已启用时间段限制，代理将仅在以下设置的时间段内生效。</span>
                      ) : (
                        <span>当前未启用时间段限制，代理将在所有时间段内生效。</span>
                      )}
                    </p>
                  </div>
                  
                  {proxyConfig.enableTimeRanges && (
                    <>
                      <div className="border rounded-md p-4">
                        <h4 className="text-sm font-medium mb-3">{editingTimeRange.data ? '编辑时间段' : '添加新时间段'}</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label htmlFor="time-range-name">名称</Label>
                            <Input
                              id="time-range-name"
                              placeholder="例如: 工作时间"
                              value={editingTimeRange.data ? editingTimeRange.data.name : newTimeRange.name}
                              onChange={(e) => {
                                if (editingTimeRange.data) {
                                  setEditingTimeRange({
                                    ...editingTimeRange,
                                    data: { ...editingTimeRange.data, name: e.target.value }
                                  });
                                } else {
                                  setNewTimeRange({...newTimeRange, name: e.target.value});
                                }
                              }}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="days-of-week">生效日</Label>
                            <Select 
                              value={editingTimeRange.data ? editingTimeRange.data.daysOfWeek : newTimeRange.daysOfWeek} 
                              onValueChange={(value) => {
                                if (editingTimeRange.data) {
                                  setEditingTimeRange({
                                    ...editingTimeRange,
                                    data: { ...editingTimeRange.data, daysOfWeek: value }
                                  });
                                } else {
                                  setNewTimeRange({...newTimeRange, daysOfWeek: value});
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择生效日" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1,2,3,4,5">工作日 (周一至周五)</SelectItem>
                                <SelectItem value="6,7">周末 (周六、周日)</SelectItem>
                                <SelectItem value="1,2,3,4,5,6,7">每天</SelectItem>
                                <SelectItem value="1">周一</SelectItem>
                                <SelectItem value="2">周二</SelectItem>
                                <SelectItem value="3">周三</SelectItem>
                                <SelectItem value="4">周四</SelectItem>
                                <SelectItem value="5">周五</SelectItem>
                                <SelectItem value="6">周六</SelectItem>
                                <SelectItem value="7">周日</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label htmlFor="start-time">开始时间</Label>
                            <Input
                              id="start-time"
                              type="time"
                              value={editingTimeRange.data ? editingTimeRange.data.startTime : newTimeRange.startTime}
                              onChange={(e) => {
                                if (editingTimeRange.data) {
                                  setEditingTimeRange({
                                    ...editingTimeRange,
                                    data: { ...editingTimeRange.data, startTime: e.target.value }
                                  });
                                } else {
                                  setNewTimeRange({...newTimeRange, startTime: e.target.value});
                                }
                              }}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="end-time">结束时间</Label>
                            <Input
                              id="end-time"
                              type="time"
                              value={editingTimeRange.data ? editingTimeRange.data.endTime : newTimeRange.endTime}
                              onChange={(e) => {
                                if (editingTimeRange.data) {
                                  setEditingTimeRange({
                                    ...editingTimeRange,
                                    data: { ...editingTimeRange.data, endTime: e.target.value }
                                  });
                                } else {
                                  setNewTimeRange({...newTimeRange, endTime: e.target.value});
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {editingTimeRange.data ? (
                            <>
                              <Button 
                                onClick={() => {
                                  if (!editingTimeRange.data?.name) {
                                    toast.error('请输入时间段名称');
                                    return;
                                  }
                                  
                                  if (editingTimeRange.data.startTime >= editingTimeRange.data.endTime) {
                                    toast.error('开始时间必须早于结束时间');
                                    return;
                                  }
                                  
                                  const updatedTimeRanges = [...proxyConfig.timeRanges];
                                  updatedTimeRanges[editingTimeRange.index] = editingTimeRange.data;
                                  
                                  setProxyConfig({
                                    ...proxyConfig,
                                    timeRanges: updatedTimeRanges
                                  });
                                  
                                  setEditingTimeRange({index: -1, data: null});
                                  toast.success('已更新时间段');
                                }}
                              >
                                保存修改
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => {
                                  setEditingTimeRange({index: -1, data: null});
                                }}
                              >
                                取消
                              </Button>
                            </>
                          ) : (
                            <Button 
                              onClick={() => {
                                if (!newTimeRange.name) {
                                  toast.error('请输入时间段名称');
                                  return;
                                }
                                
                                if (newTimeRange.startTime >= newTimeRange.endTime) {
                                  toast.error('开始时间必须早于结束时间');
                                  return;
                                }
                                
                                setProxyConfig({
                                  ...proxyConfig,
                                  timeRanges: [...proxyConfig.timeRanges, {...newTimeRange}]
                                });
                                
                                // 重置新时间段表单
                                setNewTimeRange({
                                  name: '',
                                  startTime: '08:00',
                                  endTime: '18:00',
                                  daysOfWeek: '1,2,3,4,5'
                                });
                                
                                toast.success('已添加新时间段');
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" /> 添加时间段
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="border rounded-md">
                        <h4 className="text-sm font-medium p-4 pb-2">已配置时间段</h4>
                        {proxyConfig.timeRanges.length === 0 ? (
                          <div className="p-4 pt-0 text-sm text-muted-foreground">
                            尚未配置任何时间段。代理将不会生效，除非添加至少一个时间段。
                          </div>
                        ) : (
                          <ScrollArea className="h-[200px]">
                            <div className="divide-y">
                              {proxyConfig.timeRanges.map((timeRange, index) => (
                                <div key={index} className="p-4 flex justify-between items-center">
                                  <div>
                                    <div className="font-medium">{timeRange.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {timeRange.startTime} - {timeRange.endTime} | 
                                      {timeRange.daysOfWeek === '1,2,3,4,5' && '工作日'}
                                      {timeRange.daysOfWeek === '6,7' && '周末'}
                                      {timeRange.daysOfWeek === '1,2,3,4,5,6,7' && '每天'}
                                      {!['1,2,3,4,5', '6,7', '1,2,3,4,5,6,7'].includes(timeRange.daysOfWeek) && 
                                        timeRange.daysOfWeek.split(',').map(day => {
                                          const dayMap = {
                                            '1': '周一',
                                            '2': '周二',
                                            '3': '周三',
                                            '4': '周四',
                                            '5': '周五',
                                            '6': '周六',
                                            '7': '周日'
                                          };
                                          return dayMap[day];
                                        }).join(', ')
                                      }
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        setEditingTimeRange({
                                          index,
                                          data: {...timeRange}
                                        });
                                        // 滚动到编辑表单
                                        document.getElementById('time-range-name')?.scrollIntoView({ behavior: 'smooth' });
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                      </svg>
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        setProxyConfig({
                                          ...proxyConfig,
                                          timeRanges: proxyConfig.timeRanges.filter((_, i) => i !== index)
                                        });
                                        toast.success('已删除时间段');
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
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