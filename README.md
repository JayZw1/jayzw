# 两个人的聊天

一个简洁的双人私密聊天页面，支持账号登录、实时消息和聊天记录保存。

## 本地运行

```bash
npm install
copy .env.example .env
npm start
```

打开 `http://localhost:8080`。

## 配置账号

编辑 `.env`：

```ini
CHAT_USER_1_NAME=me
CHAT_USER_1_DISPLAY_NAME=我
CHAT_USER_1_PASSWORD=your-password

CHAT_USER_2_NAME=wife
CHAT_USER_2_DISPLAY_NAME=老婆
CHAT_USER_2_PASSWORD=wife-password
```

上线时一定要把 `JWT_SECRET` 改成一串足够长的随机字符串。

## 公网使用

推荐免费组合：Render 免费 Web 服务 + Supabase 免费 Postgres。

### 1. 创建 Supabase 数据库

1. 注册并登录 Supabase。
2. 创建一个 Free 项目。
3. 在项目设置里找到数据库连接字符串，复制 `postgresql://...` 格式的连接地址。

### 2. 上传到 GitHub

把本项目上传到 GitHub 仓库。

### 3. 在 Render 部署

1. 注册并登录 Render。
2. New -> Web Service。
3. 选择你的 GitHub 仓库。
4. Instance Type 选择 Free。
5. Build Command 填 `npm install`。
6. Start Command 填 `npm start`。
7. 添加环境变量：

```ini
PORT=8080
JWT_SECRET=换成一串很长的随机字符
DATABASE_URL=你的 Supabase 数据库连接字符串

CHAT_USER_1_NAME=me
CHAT_USER_1_DISPLAY_NAME=我
CHAT_USER_1_PASSWORD=你的密码

CHAT_USER_2_NAME=wife
CHAT_USER_2_DISPLAY_NAME=老婆
CHAT_USER_2_PASSWORD=她的密码
```

部署完成后，Render 会给你一个 `https://...onrender.com` 地址。你和你老婆都打开这个地址即可。

生产环境建议：

- 使用强密码。
- 设置长随机 `JWT_SECRET`。
- 开启 HTTPS。
- 定期从 Supabase 导出或备份数据库。

免费服务限制：

- Render 免费服务空闲一段时间会休眠，第一次打开可能要等几十秒。
- Supabase 免费项目长时间不用可能会暂停，恢复后数据还在。
