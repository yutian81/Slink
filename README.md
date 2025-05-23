# Slink 短链接使用说明

## 一. 核心功能

### 短链接生成与管理
- **智能生成短链**：自动生成5-7位字符的短链接key（可自定义长度）
- **自定义短链**：允许用户指定特定的短链接后缀（需启用`custom_link`，默认关闭）
- **唯一短链模式**：相同长URL始终生成相同短链（需启用`unique_link`，默认开启）
- **批量管理**：支持查询、添加、删除所有短链接（需启用`load_kv`，默认开启)

## 二. 高级功能
- **阅后即焚**：链接被访问后自动删除（`snapchat_mode`，默认关闭）
- **访问统计**：记录每个短链接的点击次数（`visit_count`，默认关闭）
- **多主题支持**：内置默认主题，可切换不同前端主题（如 `theme/urlcool` 主题）
- **扩展功能**
  - 通过修改`system_type`可扩展为：
  - 短文本分享系统（pastebin）
  - 笔记系统（journal）
  - 图床系统 (imghost)

## 三. 部署教程

### 1. 准备工作
- 一个 Cloudflare 账户
- 一个域名（可选，但推荐使用）
- GitHub 账户（用于获取源码）

### 部署方法：使用 CF Workers

1. **Fork 项目并修改代码**
   - 访问 [GitHub 仓库](https://github.com/yutian81/slink/)，点击"Fork"按钮
   - 启用 pages：进入你的 fork 后的仓库设置，找到"Pages"选项，选择主分支作为源，点击"保存"
   - 获取到你的 `main.js` 地址，类似这样
   
     ```
     https://你的用户名.github.io/你的仓库名/main.js`
     ```
   - 给他加上cdn，得到类似这样的地址，记录下来：

     ```
     https://cdn.jsdelivr.net/gh/用户名/仓库名/main.js
     ```
   - 回到你 fork 的 GitHub 项目，打开根目录的 index.html，拉到最下面修改：

     ```
     # 原始代码
     <script src="https://pan.811520.xyz/cdn/slink.main.js"></script>

     # 改为
     <script src="https://cdn.jsdelivr.net/gh/用户名/仓库名/main.js"></script> 
     ```
    - 继续修改 _worker.js，找到以下两行（约26行）并修改：
      
       ```
       # 原始代码
       let index_html = "https://yutian81.github.io/slink/" + config.theme + "/index.html"
       let result_html = "https://yutian81.github.io/slink/" + config.theme + "/result.html"
  
       # 改为
       let index_html = "https://用户名.github.io/仓库名/" + config.theme + "/index.html"
       let result_html = "https://用户名.github.io/仓库名/" + config.theme + "/result.html"
       ```

> **为什么要修改代码？如果你不改，拉取的是我的代码和主题**
>
> **我会经常更新，说不定还有bug，会直接影响到你的使用**
> 
> **因此，建议fork以后按以上说明修改**
>


2. **创建 Worker**
   - 进入 CF 的 Workers 和 Pages 页面，创建一个 worker，名称随意填
   - 复制 [GitHub 仓库](https://github.com/yutian81/slink/) 中的 `_worker.js` 内容
   - 粘贴到 Worker 编辑器中，点击"保存并部署"

3. **配置 KV 命名空间**(必须)
   - 创建一个新的 KV 命名空间（如"LINKS"）
   - 在 Worker 设置中找到"KV 命名空间绑定"，变量名称填写`LINKS`（不能是其他名称），绑定刚刚创建的KV空间，保存

4. **配置环境变量**
   - 在 Worker 设置中找到"变量"，添加以下变量（根据需要）：
     - `PASSWORD`，必须: 管理密码
     - `THEME`，可选: 不设置则启用默认主题，也可设置为 `theme/urlcool`
     - `CUSTOM_LINK`，可选：是否开启自定义短链后缀，默认关闭，设为`true`可开启
     - `VISIT_COUNT`，可选：是否开启访问统计，默认关闭，设为`true`可开启
     - `TYPE`，可选: 系统类型，默认为 `shorturl`，即短链接，也可设置为其他类型，用法多样，详见[原作者教程](#原作者教程)
     - `LOAD_KV`，可选: 是否加载kv数据，默认关闭，设为`true`可开启
  
  5. **访问项目管理页面**
     访问 `https://your-worker.your-account.workers.dev/your_password` 使用管理界面

## 四. 注意事项

1. **密码安全**：确保设置强密码并定期更换
2. **KV 限制**：Cloudflare KV 有写入次数限制，频繁操作可能导致超额
3. **自定义域名**：如需使用自定义域名，需在 Cloudflare 中配置 DNS 和 Workers 路由
4. **备份**：定期导出 KV 数据作为备份

## 五. API 调用
| 命令 | 方法 | 参数 | 描述 |
|------|------|------|------|
| add  | POST | url, password, [key] | 创建短链接 |
| del  | POST | key, password | 删除短链接 |
| qry  | POST | key, password | 查询短链接 |
| qryall | POST | password | 查询所有短链接 |
| config | POST | password | 获取设置详情 |

详见 [API说明文档](https://github.com/yutian81/slink/blob/main/API.md)

# 原作者教程

[Url-Shorten-Worker/README.md](https://github.com/crazypeace/Url-Shorten-Worker/blob/main/README.md)
