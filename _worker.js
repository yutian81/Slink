// 配置变量与常量
const config = {
  password: typeof PASSWORD !== "undefined" ? PASSWORD : "", // 管理密码
  result_page: false, // 是否使用结果页面
  theme: typeof THEME !== "undefined" ? THEME : "", // 主题路径，可选 theme/urlcool
  cors: true, // 允许跨域
  unique_link: false, // 唯一短链接
  custom_link: typeof CUSTOM_LINK !== "undefined" ? CUSTOM_LINK === "true" : false, // 默认允许自定义短链接
  overwrite_kv: false, // 是否允许覆盖已存在的短链key
  snapchat_mode: false, // 阅后即焚模式
  visit_count: false, // 访问统计
  load_kv: typeof LOAD_KV !== "undefined" ? LOAD_KV === "true" : false, // 默认允许从KV加载全部数据
  system_type: typeof TYPE !== "undefined" ? TYPE : "shorturl", // 默认系统类型为短链系统
}

// 受保护的key列表，这些key不能被操作
const protect_keylist = [
  "password" // 密码key
]

let index_html = "https://yutian81.github.io/slink/" + config.theme + "/index.html"
let result_html = "https://yutian81.github.io/slink/" + config.theme + "/result.html"

// 404页面HTML
const html404 = `<!DOCTYPE html>
<html>
  <body>
    <h1>404 未找到</h1>
    <p>您访问的页面不存在</p>
    <p>需要在域名后加入 "/你设置的密码" 访问管理页面</p>
    <p>项目开源地址：<a href="https://github.com/yutian81/slink" target="_blank">点此访问 GitHub 项目</a></p>
  </body>
</html>`

// 默认响应头
let response_header = {
  "Content-type": "text/html;charset=UTF-8;application/json",
}

// 如果启用CORS，添加跨域头
if (config.cors) {
  response_header = {
    ...response_header,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

// 生成随机字符串
async function randomString(len) {
  len = len || 6;
  // 去掉了容易混淆的字符
  let chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  let maxPos = chars.length;
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

// SHA512哈希函数
async function sha512(url) {
  url = new TextEncoder().encode(url)
  const url_digest = await crypto.subtle.digest({ name: "SHA-512" }, url)
  const hashArray = Array.from(new Uint8Array(url_digest))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// 检查URL是否合法
async function checkURL(URL) {
  let str = URL;
  let Expression = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  let objExp = new RegExp(Expression);
  if (objExp.test(str) == true) {
    if (str[0] == 'h')
      return true;
    else
      return false;
  } else {
    return false;
  }
}

// 保存URL到KV存储
async function save_url(URL) {
  let random_key = await randomString()
  let is_exist = await LINKS.get(random_key)
  if (is_exist == null) {
    return await LINKS.put(random_key, URL), random_key
  } else {
    return save_url(URL)
  }
}

// 检查URL是否已存在
async function is_url_exist(url_sha512) {
  let is_exist = await LINKS.get(url_sha512)
  return is_exist || false
}

// 获取系统密码
async function system_password() {
  // 如果配置中有密码，使用配置密码
  if (config.password.trim().length === 0) {
    return await LINKS.get("password")
  } else {
    return config.password.trim()
  }
}

// base64 编码
function base64ToBlob(base64String) {
  var parts = base64String.split(';base64,');
  var contentType = parts[0].split(':')[1];
  var raw = atob(parts[1]);
  var rawLength = raw.length;
  var uInt8Array = new Uint8Array(rawLength);
  for (var i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

// 处理请求
async function handleRequest(request) {
  const password_value = await system_password() // 系统密码
  const requestURL = new URL(request.url)
  let path = requestURL.pathname.split("/")[1]
  path = decodeURIComponent(path)
  const params = requestURL.search

  // 处理POST请求（API调用）
  if (request.method === "POST") {
    let req = await request.json()
    let req_cmd = req["cmd"] // 操作命令
    let req_url = req["url"] // 长URL
    let req_key = req["key"] // 短链接key
    let req_password = req["password"] // 密码

    // 密码验证
    if (req_password != password_value) {
      return new Response(`{"status":500,"key": "", "error":"错误：无效密码"}`, {
        headers: response_header,
      })
    }

    // 添加短链接
    if (req_cmd == "add") {
      // 如果是短链接系统且URL不合法
      if ((config.system_type == "shorturl") && !await checkURL(req_url)) {
        return new Response(`{"status":500, "url": "` + req_url + `", "error":"错误：非法的URL"}`, {
          headers: response_header,
        })
      }

      let stat, random_key
      // 处理自定义短链接
      if (config.custom_link && (req_key != "")) {
        // 检查是否是受保护的key
        if (protect_keylist.includes(req_key)) {
          return new Response(`{"status":500,"key": "` + req_key + `", "error":"错误：受保护的key"}`, {
            headers: response_header,
          })
        }

        // 检查key是否已存在
        let is_exist = await LINKS.get(req_key)
        if ((!config.overwrite_kv) && (is_exist)) {
          return new Response(`{"status":500,"key": "` + req_key + `", "error":"错误：key已存在"}`, {
            headers: response_header,
          })
        } else {
          random_key = req_key
          stat = await LINKS.put(req_key, req_url)
        }
      } 
      // 处理唯一链接模式
      else if (config.unique_link) {
        let url_sha512 = await sha512(req_url)
        let url_key = await is_url_exist(url_sha512)
        if (url_key) {
          random_key = url_key
        } else {
          [stat, random_key] = await save_url(req_url)
          if (typeof (stat) == "undefined") {
            await LINKS.put(url_sha512, random_key)
          }
        }
      } 
      // 普通模式
      else {
        [stat, random_key] = await save_url(req_url)
      }
      
      // 返回结果
      if (typeof (stat) == "undefined") {
        return new Response(`{"status":200, "key":"` + random_key + `", "error": ""}`, {
          headers: response_header,
        })
      } else {
        return new Response(`{"status":500, "key": "", "error":"错误：达到KV写入限制"}`, {
          headers: response_header,
        })
      }
    } 
    // 删除短链接
    else if (req_cmd == "del") {
      // 检查是否是受保护的key
      if (protect_keylist.includes(req_key)) {
        return new Response(`{"status":500, "key": "` + req_key + `", "error":"错误：受保护的key"}`, {
          headers: response_header,
        })
      }

      await LINKS.delete(req_key)
      
      // 如果启用了访问统计，删除统计数据
      if (config.visit_count) {
        await LINKS.delete(req_key + "-count")
      }

      return new Response(`{"status":200, "key": "` + req_key + `", "error": ""}`, {
        headers: response_header,
      })
    } 
    // 查询短链接
    else if (req_cmd == "qry") {
      // 检查是否是受保护的key
      if (protect_keylist.includes(req_key)) {
        return new Response(`{"status":500,"key": "` + req_key + `", "error":"错误：受保护的key"}`, {
          headers: response_header,
        })
      }

      let value = await LINKS.get(req_key)
      if (value != null) {
        return new Response(`{"status":200, "error":"", "key":"` + req_key + `", "url":"` + value + `"}`, {
          headers: response_header,
        })
      } else {
        return new Response(`{"status":500, "key": "` + req_key + `", "error":"错误：key不存在"}`, {
          headers: response_header,
        })
      }
    } 
    // 查询所有短链接
    else if (req_cmd == "qryall") {
      if (!config.load_kv) {
        return new Response(`{"status":500, "error":"错误：配置中未启用从KV加载"}`, {
          headers: response_header,
        })
      }

      let keyList = await LINKS.list()
      if (keyList != null) {
        let kvlist = []
        for (let i = 0; i < keyList.keys.length; i++) {
          let item = keyList.keys[i]
          // 跳过受保护的key和统计key
          if (protect_keylist.includes(item.name) || item.name.endsWith("-count")) continue
          
          let url = await LINKS.get(item.name)
          kvlist.push({ "key": item.name, "value": url })
        }

        return new Response(`{"status":200, "error":"", "kvlist": ` + JSON.stringify(kvlist) + `}`, {
          headers: response_header,
        })
      } else {
        return new Response(`{"status":500, "error":"错误：加载key列表失败"}`, {
          headers: response_header,
        })
      }
    }
  } 
  // 处理OPTIONS请求（CORS预检）
  else if (request.method === "OPTIONS") {
    return new Response(``, {
      headers: response_header,
    })
  }

  // 如果path为空，返回404页面
  if (!path) {
    return new Response(html404, {
      headers: response_header,
      status: 404
    }) 
  }

  // 访问管理页面
  if (path == password_value) {
    let index = await fetch(index_html)
    index = await index.text()
    index = index.replace(/__PASSWORD__/gm, password_value)
    // 操作页面文字修改
    // index = index.replace(/短链系统变身/gm, "")
    return new Response(index, {
      headers: response_header,
    })
  }

  // 获取短链接对应的长URL
  let value = await LINKS.get(path)
  // 如果path是'password', 让查询结果为空
  if (protect_keylist.includes(path)) {
    value = ""
  }

  // 如果短链接不存在
  if (!value) {
    return new Response(html404, {
      headers: response_header,
      status: 404
    })
  }

  // 访问统计
  if (config.visit_count) {
    let count = await LINKS.get(path + "-count")
    if (count === null) {
      await LINKS.put(path + "-count", "1")
    } else {
      count = parseInt(count) + 1
      await LINKS.put(path + "-count", count.toString())
    }
  }

  // 阅后即焚模式
  if (config.snapchat_mode) {
    await LINKS.delete(path)
  }

  // 保留原始URL参数
  if (params) {
    value = value + params
  }

  // 如果启用了结果页面
  if (config.result_page) {
    let result_page_html = await fetch(result_html)
    let result_page_html_text = await result_page_html.text()      
    result_page_html_text = result_page_html_text.replace(/{__FINAL_LINK__}/gm, value)
    return new Response(result_page_html_text, {
      headers: response_header,
    })
  }

  // 根据系统类型返回不同响应
  if (config.system_type == "shorturl") {
    return Response.redirect(value, 302);
  } else if (config.system_type == "imghost") {
    try {
      const blob = base64ToBlob(value);
      let contentType = "image/jpeg"; // 默认值
      if (value.startsWith("data:image/png")) {
        contentType = "image/png";
      } else if (value.startsWith("data:image/gif")) {
        contentType = "image/gif";
      } else if (value.startsWith("data:image/webp")) {
        contentType = "image/webp";
      } 
      return new Response(blob, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400" // 1天缓存
        }
      });
    } catch (e) {
      console.error("图片处理错误:", e);
      return new Response(value, {
        headers: {
          "Content-type": "text/plain;charset=UTF-8;",
        },
      });
    }
  } else {
    return new Response(value, {
      headers: {
        "Content-type": "text/plain;charset=UTF-8;",
      },
    });
  }
}

// 监听fetch事件
addEventListener("fetch", async event => {
  event.respondWith(handleRequest(event.request))
})
