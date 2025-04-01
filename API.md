# API 使用文档

## 基础信息

这个短链接服务基于 Cloudflare Workers 和 KV 存储构建，提供以下 API 功能：

- 生成短链接
- 删除短链接
- 查询短链接
- 查询访问统计
- 批量导出数据

## API 端点

```
POST / (Worker 根路径)
```

## 请求格式

所有请求必须为 `POST` 请求，`Content-Type: application/json`，请求体为 JSON 格式。

## 认证方式

所有请求需要在请求体中包含管理密码：

```json
{
  "password": "your_password_here",
  // 其他参数...
}
```

## API 功能列表

### 1. 生成短链接

**请求参数**:
```json
{
  "cmd": "add",
  "url": "长链接URL",
  "key": "自定义短码(可选)",
  "password": "管理密码"
}
```

**成功响应**:
```json
{
  "status": 200,
  "key": "生成的短码",
  "url": "原始长链接"
}
```

**错误响应**:
```json
{
  "status": 400,
  "error": "错误信息"
}
```

### 2. 删除短链接

**请求参数**:
```json
{
  "cmd": "del",
  "key": "要删除的短码",
  "password": "管理密码"
}
```

**响应格式**:
与生成短链接相同

### 3. 查询短链接

**请求参数**:
```json
{
  "cmd": "qry",
  "key": "要查询的短码",
  "password": "管理密码"
}
```

**响应格式**:
与生成短链接相同

### 4. 查询访问统计

**请求参数**:
```json
{
  "cmd": "qry",
  "key": "短码-count",  // 注意要加 -count 后缀
  "password": "管理密码"
}
```

**成功响应**:
```json
{
  "status": 200,
  "url": "访问次数"
}
```

### 5. 批量导出数据

**请求参数**:
```json
{
  "cmd": "qryall",
  "password": "管理密码"
}
```

**成功响应**:
```json
{
  "status": 200,
  "kvlist": [
    {"key": "短码1", "value": "长链接1"},
    {"key": "短码2", "value": "长链接2"},
    // ...
  ]
}
```

## 使用示例

### 生成短链接
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"cmd":"add","url":"https://example.com/long-url","key":"short","password":"your_password"}' \
  https://your-worker.workers.dev/
```

### 查询短链接
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"cmd":"qry","key":"short","password":"your_password"}' \
  https://your-worker.workers.dev/
```
