# 短链接服务 API 文档

## 基础信息

- 服务地址: `https://[您的域名]/`
    
- 认证方式: 管理密码（通过环境变量 `PASSWORD` 设置）
    
- 数据存储: Cloudflare KV
    

## API 接口

### 1. 生成短链接

**请求方法**: POST  
**请求头**: `Content-Type: application/json`  
**请求体**:

```json
{
  "cmd": "add",
  "url": "长链接URL",
  "key": "自定义短链标识（可选）",
  "password": "管理密码"
}
```

**成功响应**:

```json
{
  "status": 200,
  "key": "生成的短链标识",
  "error": ""
}
```

**错误响应**:
```json
{
  "status": 500,
  "key": "",
  "error": "错误描述"
}
```

### 2. 删除短链接

**请求方法**: POST  
**请求头**: `Content-Type: application/json`  
**请求体**:

```json
{
  "cmd": "del",
  "key": "要删除的短链标识",
  "password": "管理密码"
}
```

**响应格式**: 同生成接口

### 3. 查询短链接信息

**请求方法**: POST  
**请求头**: `Content-Type: application/json`  
**请求体**:

```json
{
  "cmd": "qry",
  "key": "要查询的短链标识",
  "password": "管理密码"
}
```

**成功响应**:
```json
{
  "status": 200,
  "key": "短链标识",
  "url": "原始URL",
  "error": ""
}
```

### 4. 批量导出KV数据

**请求方法**: POST  
**请求头**: `Content-Type: application/json`  
**请求体**:
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
    {"key": "短链1", "value": "原始URL1"},
    {"key": "短链2", "value": "原始URL2"}
  ],
  "error": ""
}
```

### 5. 获取系统配置

**请求方法**: POST  
**请求头**: `Content-Type: application/json`  
**请求体**:
```json
{
  "cmd": "config",
  "password": "管理密码"
}
```

**响应示例**:
```json
{
  "status": 200,
  "visit_count": false,
  "result_page": false,
  "custom_link": false
}
```

## 错误代码

|状态码|说明|
|---|---|
|200|操作成功|
|404|短链接不存在|
|500|服务器错误|

## 使用示例

### cURL 示例
```bash
# 生成短链接
curl -X POST https://example.com/ \
  -H "Content-Type: application/json" \
  -d '{"cmd":"add","url":"https://long-url.com","password":"your_password"}'

# 查询短链接
curl -X POST https://example.com/ \
  -H "Content-Type: application/json" \
  -d '{"cmd":"qry","key":"abcde","password":"your_password"}'
```

## 注意事项

1. 所有API请求必须使用POST方法
    
2. 管理密码需妥善保管
    
3. 生产环境建议启用HTTPS
    
4. 默认配置下，系统会为相同的长URL生成相同的短链接（`unique_link: true`）
