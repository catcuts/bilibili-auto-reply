# B站私信自动回复系统

<p align="center">
  <img src="public/default-avatar.svg" alt="B站私信自动回复系统" width="120" />
</p>

<p align="center">
  <a href="#功能特点">功能特点</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#使用指南">使用指南</a> •
  <a href="#项目结构">项目结构</a> •
  <a href="#开发计划">开发计划</a>
</p>

## 项目介绍

B站私信自动回复系统是一个基于Next.js和React开发的Web应用，旨在帮助B站用户自动回复私信消息，提高社交效率。系统通过与B站API交互，获取用户的私信消息，并根据预设的规则自动生成回复内容。

## 功能特点

- **智能规则匹配**：支持关键词和正则表达式匹配，灵活设置回复规则
- **自动检查新消息**：定时自动检查新私信并根据规则自动回复
- **规则优先级**：设置规则的匹配优先级，确保最重要的规则优先生效
- **模板变量**：支持在回复模板中使用变量，生成个性化回复内容
- **手动消息管理**：提供消息管理界面，支持手动查看和回复私信
- **代理支持**：支持通过代理服务器与B站API通信，解决网络问题
- **用户友好界面**：简洁直观的用户界面，易于操作和管理

## 技术栈

- **前端框架**：Next.js 14 + React 18
- **样式框架**：Tailwind CSS
- **状态管理**：React Hooks
- **表单处理**：React Hook Form + Zod
- **API交互**：Axios + React Query
- **数据库**：SQLite (通过Prisma ORM)
- **UI组件**：Headless UI + Heroicons

## 快速开始

### 环境要求

- Node.js 16.x 或更高版本
- npm 8.x 或更高版本
- 现代浏览器（Chrome、Firefox、Edge等）

### 安装步骤

1. 克隆项目代码

```bash
git clone https://github.com/yourusername/bilibili-auto-reply.git
cd bilibili-auto-reply
```

2. 安装依赖

```bash
npm install
```

3. 初始化数据库

```bash
npx prisma migrate dev --name init
```

4. 启动开发服务器

```bash
npm run dev
```

5. 访问应用

打开浏览器，访问 http://localhost:3000

## 使用指南

### 登录B站账号

1. 在首页点击"登录"按钮
2. 使用手机扫描二维码完成登录

### 创建回复规则

1. 点击"规则管理"进入规则页面
2. 点击"创建规则"按钮
3. 填写规则信息：
    - 规则名称：为规则起一个易于识别的名称
    - 关键词：设置触发规则的关键词或正则表达式
    - 回复模板：设置自动回复的内容模板
    - 优先级：设置规则的匹配优先级（数字越小优先级越高）
    - 启用状态：设置规则是否生效
4. 点击"保存"按钮创建规则

### 启用自动回复

1. 在首页勾选"启用自动检查"
2. 设置检查间隔时间（默认为60秒）
3. 系统将按设定的时间间隔自动检查新私信并回复

### 查看消息记录

1. 点击"消息管理"进入消息页面
2. 左侧显示所有私信会话列表
3. 点击会话查看详细消息内容
4. 可在输入框中输入内容并点击发送按钮手动回复

### 代理设置

系统支持通过代理服务器与B站API通信，这对于解决网络问题或自定义请求处理非常有用。

#### 基本代理设置

1. 点击"系统设置"进入设置页面
2. 在"代理设置"卡片中，切换"启用代理"开关
3. 在"基本设置"选项卡中填写：
    - 代理主机：输入代理服务器地址（如 127.0.0.1 或 proxy.example.com）
    - 代理端口：输入代理服务器端口（如 8080）
4. 点击"保存代理设置"按钮应用更改

#### 高级代理规则

系统支持通过JavaScript脚本自定义代理规则，实现更灵活的请求转发：

1. 在"代理设置"卡片中，切换到"高级规则"选项卡
2. 编写JavaScript代理规则脚本，该脚本必须包含一个名为`transformUrl`的函数
3. `transformUrl`函数接收请求对象作为参数，并返回转换后的URL字符串
4. 点击"保存代理设置"按钮应用更改

#### 测试代理规则

在应用代理规则前，可以先测试规则是否按预期工作：

1. 在"代理设置"卡片中，切换到"规则测试"选项卡
2. 输入要测试的URL（如 https://api.bilibili.com/x/space/myinfo）
3. 点击"测试"按钮
4. 系统将显示转换后的URL，帮助验证规则是否正确

## 项目结构

```
src/
├── app/                  # Next.js应用页面
│   ├── api/              # API路由
│   │   ├── auto-reply/   # 自动回复API
│   │   ├── messages/     # 消息相关API
│   │   └── user/         # 用户相关API
│   ├── messages/         # 消息页面
│   ├── rules/            # 规则管理页面
│   └── page.tsx          # 主页
├── components/           # React组件
│   ├── auth/             # 认证相关组件
│   ├── auto-reply/       # 自动回复相关组件
│   ├── layout/           # 布局组件
│   ├── messages/         # 消息相关组件
│   └── rules/            # 规则相关组件
├── lib/                  # 核心逻辑
│   ├── bilibili-api.ts   # B站API交互
│   ├── prisma.ts         # Prisma客户端
│   └── rule-engine.ts    # 规则匹配引擎
prisma/
└── schema.prisma        # 数据库模型定义
```

## 开发计划

- [ ] 多平台支持：扩展支持更多社交平台的自动回复
- [ ] AI回复生成：集成AI模型，生成更智能的回复内容
- [ ] 数据分析：添加消息统计和分析功能，提供数据洞察
- [ ] 规则导入导出：支持规则的批量导入导出
- [ ] 移动端适配：优化移动端的用户体验

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议！请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件

## 联系方式

如有任何问题或建议，请通过以下方式联系我：

- GitHub Issues: [提交问题](https://github.com/yourusername/bilibili-auto-reply/issues)
- 邮箱: catcheers@gmail.com

---

<p align="center">用❤️制作</p>
