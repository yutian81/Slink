const crypto = require('crypto');

const config = {
  password: typeof PASSWORD !== "undefined" ? PASSWORD : "",
  result_page: false, // 是否启用结果页面
  theme: typeof THEME !== "undefined" ? THEME : "",
  cors: true,
  unique_link: false,
  custom_link: true,
  overwrite_kv: false,
  snapchat_mode: false,
  visit_count: true,
  load_kv: typeof LOAD_KV !== "undefined" ? LOAD_KV === "true" : false,
  system_type: typeof TYPE !== "undefined" ? TYPE : "shorturl",
};

const protect_keylist = ["password"];

// 静态页面配置
const html404 = `<!DOCTYPE html><html><body>
  <h1>404 Not Found</h1>
  <p>找不到请求的 URL</p>
  <a href="https://github.com/yutian81/slink/">GitHub 仓库</a>
</body></html>`;

// 获取页面URL（修复主题路径问题）
function getPageURL(page) {
  const base = "https://yutian81.github.io/slink/";
  const themePath = config.theme ? `${config.theme}/` : "";
  return `${base}${themePath}${page}.html`;
}

// 响应工具函数
const standardResponse = (success, data = {}, message = "", code = "") => {
  return new Response(JSON.stringify({ 
    status: success ? 200 : (data.status || 500),
    message,
    data: success ? data : null,
    error: !success ? { code, details: data.error } : null,
    timestamp: new Date().toISOString()
  }), {
    headers: {
      "Content-Type": "application/json",
      ...(config.cors && {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      })
    },
    status: success ? 200 : (data.status || 500)
  });
};

// 密码安全
const verifyPassword = async (input) => {
  const stored = config.password.trim() || await LINKS.get("password");
  if (!stored) return false;
  
  if (stored.includes(':')) {
    const [salt, hash] = stored.split(':');
    const inputHash = crypto.pbkdf2Sync(input, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(inputHash));
  }
  return input === stored;
};

async function handleRequest(request) {
  try {
    // 处理OPTIONS请求
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: config.cors ? {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        } : {}
      });
    }

    // 处理API请求
    if (request.method === "POST") {
      const { cmd, password, ...data } = await request.json();

      if (!await verifyPassword(password)) {
        return standardResponse(false, {}, "无效的管理密码", "AUTH_FAILED");
      }

      switch (cmd) {
        case "add": return handleAdd(data);
        case "del": return handleDelete(data);
        case "qry": return handleQuery(data);
        case "qryall": return handleQueryAll();
        case "config": return handleConfig();
        default: return standardResponse(false, {}, "无效命令", "INVALID_COMMAND");
      }
    }

    // 处理短链接访问
    const url = new URL(request.url); 
    const path = decodeURIComponent(url.pathname.slice(1));

    if (!path) return new Response(html404, { status: 404 });

    // 密码访问首页
    if (path === (config.password.trim() || await LINKS.get("password"))) {
      const index = await fetch(getPageURL("index"));
      return new Response(
        (await index.text()).replace(/__PASSWORD__/gm, path),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // 获取KV值
    const value = protect_keylist.includes(path) ? null : await LINKS.get(path);
    if (!value) return new Response(html404, { status: 404 });

    // 访问计数
    if (config.visit_count) {
      const countKey = `${path}-count`;
      const count = (parseInt(await LINKS.get(countKey)) || 0) + 1; 
      await LINKS.put(countKey, count.toString()); 
    }

    // 阅后即焚
    if (config.snapchat_mode) await LINKS.delete(path);

    // 返回结果（核心修改点）
    if (config.result_page && config.system_type === "shorturl") { 
      const resultPage = await fetch(getPageURL("result")); 
      let html = await resultPage.text();
      html = html.replace(/{__FINAL_LINK__}/g, value + (url.search || ""));
      return new Response(html, { 
        headers: { "Content-Type": "text/html" } 
      });
    } 
    
    // 默认重定向
    if (config.system_type === "shorturl") {
      return Response.redirect(value + (url.search || ""), 302);
    }
    
    // 图片托管等其他类型
    if (config.system_type === "imghost") {
      return new Response(base64ToBlob(value));
    }
    
    return new Response(value, { 
      headers: { "Content-Type": "text/plain" } 
    });

  } catch (error) {
    console.error("处理请求失败:", error);
    return standardResponse(false, {}, error.message, "INTERNAL_ERROR");
  }
}

// 命令处理函数
async function handleAdd({ url, key }) {
  if (config.system_type === "shorturl" && !/^https?:\/\//.test(url)) {
    return standardResponse(false, { url }, "URL必须以http://或https://开头", "INVALID_URL");
  }

  // 自定义短链
  if (config.custom_link && key) {
    if (protect_keylist.includes(key)) {
      return standardResponse(false, { key }, "受保护的关键词", "PROTECTED_KEY");
    }
    if (!config.overwrite_kv && await LINKS.get(key)) {
      return standardResponse(false, { key }, "短链已存在", "KEY_EXISTS");
    }
    await LINKS.put(key, url);
    return standardResponse(true, { key, url }, "短链创建成功");
  }

  // 唯一短链
  if (config.unique_link) {
    const urlHash = await sha512(url);
    const existingKey = await LINKS.get(urlHash);
    if (existingKey) {
      return standardResponse(true, { 
        key: existingKey, 
        url,
        reused: true 
      }, "短链已复用");
    }
    const newKey = await generateUniqueKey(url);
    await LINKS.put(urlHash, newKey);
    return standardResponse(true, { key: newKey, url });
  }

  // 普通短链
  const key = await generateUniqueKey(url);
  return standardResponse(true, { key, url });
}

async function handleDelete({ key }) {
  if (protect_keylist.includes(key)) {
    return standardResponse(false, { key }, "受保护的关键词", "PROTECTED_KEY");
  }
  await LINKS.delete(key);
  if (config.visit_count) await LINKS.delete(`${key}-count`);
  return standardResponse(true, { key }, "删除成功");
}

async function handleQuery({ key }) {
  if (protect_keylist.includes(key)) {
    return standardResponse(false, { key }, "受保护的关键词", "PROTECTED_KEY");
  }
  const value = await LINKS.get(key);
  if (!value) return standardResponse(false, { key }, "Key不存在", "KEY_NOT_FOUND");
  
  const result = { key, url: value };
  if (key.endsWith("-count")) {
    result.count = parseInt(value) || 0;
  } else if (config.visit_count) {
    result.count = parseInt(await LINKS.get(`${key}-count`)) || 0;
  }
  return standardResponse(true, result);
}

async function handleQueryAll() {
  if (!config.load_kv) {
    return standardResponse(false, {}, "批量导出已禁用", "FEATURE_DISABLED");
  }
  const { keys } = await LINKS.list();
  const validKeys = keys.filter(k => 
    !protect_keylist.includes(k.name) && 
    !k.name.endsWith("-count")
  );
  const items = await Promise.all(
    validKeys.map(async k => ({
      key: k.name,
      value: await LINKS.get(k.name)
    }))
  );
  return standardResponse(true, { items });
}

async function handleConfig() {
  return standardResponse(true, {
    system_type: config.system_type,
    custom_link: config.custom_link,
    visit_count: config.visit_count,
    result_page: config.result_page,
    overwrite_kv: config.overwrite_kv,
    snapchat_mode: config.snapchat_mode,
    unique_link: config.unique_link
  });
}

// 工具函数
async function generateUniqueKey(url, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const key = await randomString(i >= maxRetries / 2 ? 6 : 4);
    if (!await LINKS.get(key)) {
      await LINKS.put(key, url);
      return key;
    }
  }
  throw new Error(`无法生成唯一Key (尝试${maxRetries}次)`);
}

async function randomString(len = 4) {
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  return Array.from({ length: len }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

async function sha512(str) {
  const buffer = await crypto.subtle.digest(
    "SHA-512",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64ToBlob(base64) {
  const [header, data] = base64.split(';base64,');
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  return new Blob([bytes], { type: header.split(':')[1] });
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});
