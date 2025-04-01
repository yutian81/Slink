const config = {
  password: PASSWORD || "", // 管理密码 // if password != null, then use this config; otherwise, read password from KV.
  result_page: false, // 是否使用结果页面 // After get the value from KV, if use a page to show the result.
  theme: THEME || "", // 主题 // Homepage theme, use the empty value for default theme. To use urlcool theme, please fill with "theme/urlcool" .
  cors: true, // 是否允许CORS // Allow Cross-origin resource sharing for API requests.
  unique_link: false, // 是否生成唯一短链(增加写入量) // If it is true, the same long url will be shorten into the same short url
  custom_link: true, // 允许自定义短链 // Allow users to customize the short url.
  overwrite_kv: false, // 允许覆盖已存在的key // Allow user to overwrite an existed key.
  snapchat_mode: false, // 阅后即焚模式 // The link will be distroyed after access.
  visit_count: false, // 访问计数(增加写入量) // Count visit times.
  load_kv: false, // 从KV加载全部数据 // Load all from Cloudflare KV
  system_type: TYPE || "shorturl", // 系统类型 // shorturl, imghost, other types {pastebin, journal}
}

// 受保护的key列表 // key in protect_keylist can't read, add, del from UI and API
const protect_keylist = [
  "password",
]

let index_html = "https://yutian81.github.io/slink/" + config.theme + "/index.html"
let result_html = "https://yutian81.github.io/slink/" + config.theme + "/result.html"

const html404 = `<!DOCTYPE html>
  <html>
  <body>
    <h1>404 未找到</h1>
    <p>访问的URL不存在</p>
    <p> <a href="https://github.com/crazypeace/Url-Shorten-Worker/" target="_self">GitHub项目</a> </p>
  </body>
  </html>`

let response_header = {
  "Content-type": "text/html;charset=UTF-8;application/json",
}

if (config.cors) {
  response_header = {
    "Content-type": "text/html;charset=UTF-8;application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

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

async function randomString(len) {
  len = len || 6;
  let chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /*去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1 *** Easily confused characters removed */
  let maxPos = chars.length;
  let result = '';
  for (i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

async function sha512(url) {
  url = new TextEncoder().encode(url)

  const url_digest = await crypto.subtle.digest(
    {
      name: "SHA-512",
    },
    url, // The data you want to hash as an ArrayBuffer
  )
  const hashArray = Array.from(new Uint8Array(url_digest)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  //console.log(hashHex)
  return hashHex
}

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

async function save_url(URL) {
  let random_key = await randomString()
  let is_exist = await LINKS.get(random_key)
  // console.log(is_exist)
  if (is_exist == null) {
    return await LINKS.put(random_key, URL), random_key
  }
  else {
    save_url(URL)
  }
}

async function is_url_exist(url_sha512) {
  let is_exist = await LINKS.get(url_sha512)
  // console.log(is_exist)
  if (is_exist == null) {
    return false
  } else {
    return is_exist
  }
}

// 系统密码
async function system_password() {
  if (config.password.trim().length === 0 ) {    
    return await LINKS.get("password");
  }
  else {
    return config.password.trim();
  }
}

async function handleRequest(request) {
  const password_value  = await system_password();
  
  if (request.method === "POST") {
    let req = await request.json()

    let req_cmd = req["cmd"]
    let req_url = req["url"]
    let req_key = req["key"]
    let req_password = req["password"]

    if (req_password != password_value) {
      return new Response(`{"status":500,"key": "", "error":"错误：无效密码"}`, {
        headers: response_header,
      })
    }

    if (req_cmd == "add") {
      if ((config.system_type == "shorturl") && !await checkURL(req_url)) {
        return new Response(`{"status":500, "url": "` + req_url + `", "error":"错误：URL不合法"}`, {
          headers: response_header,
        })
      }

      let stat, random_key
      if (config.custom_link && (req_key != "")) {
        if (protect_keylist.includes(req_key)) {
          return new Response(`{"status":500,"key": "` + req_key + `", "error":"错误：受保护的key"}`, {
            headers: response_header,
          })
        }

        let is_exist = await is_url_exist(req_key)
        if ((!config.overwrite_kv) && (is_exist)) {
          return new Response(`{"status":500,"key": "` + req_key + `", "error":"错误：key已存在"}`, {
            headers: response_header,
          })
        } else {
          random_key = req_key
          stat, await LINKS.put(req_key, req_url)
        }
      } else if (config.unique_link) {
        let url_sha512 = await sha512(req_url)
        let url_key = await is_url_exist(url_sha512)
        if (url_key) {
          random_key = url_key
        } else {
          stat, random_key = await save_url(req_url)
          if (typeof (stat) == "undefined") {
            await LINKS.put(url_sha512, random_key)
          }
        }
      } else {
        stat, random_key = await save_url(req_url)
      }
      
      if (typeof (stat) == "undefined") {
        return new Response(`{"status":200, "key":"` + random_key + `", "error": ""}`, {
          headers: response_header,
        })
      } else {
        return new Response(`{"status":500, "key": "", "error":"错误：达到KV写入限制"}`, {
          headers: response_header,
        })
      }
    } else if (req_cmd == "del") {
      if (protect_keylist.includes(req_key)) {
        return new Response(`{"status":500, "key": "` + req_key + `", "error":"错误：受保护的key"}`, {
          headers: response_header,
        })
      }

      await LINKS.delete(req_key)
      
      if (config.visit_count) {
        await LINKS.delete(req_key + "-count")
      }

      return new Response(`{"status":200, "key": "` + req_key + `", "error": ""}`, {
        headers: response_header,
      })
    } else if (req_cmd == "qry") {
      if (protect_keylist.includes(req_key)) {
        return new Response(`{"status":500,"key": "` + req_key + `", "error":"错误：受保护的key"}`, {
          headers: response_header,
        })
      }

      let value = await LINKS.get(req_key)
      if (value != null) {
        let jsonObjectRetrun = JSON.parse(`{"status":200, "error":"", "key":"", "url":""}`);
        jsonObjectRetrun.key = req_key;
        jsonObjectRetrun.url = value;
        return new Response(JSON.stringify(jsonObjectRetrun), {
          headers: response_header,
        })
      } else {
        return new Response(`{"status":500, "key": "` + req_key + `", "error":"错误：key不存在"}`, {
          headers: response_header,
        })
      }
    } else if (req_cmd == "qryall") {
      if ( !config.load_kv) {
        return new Response(`{"status":500, "error":"错误：配置中load_kv为false"}`, {
          headers: response_header,
        })
      }

      let keyList = await LINKS.list()
      if (keyList != null) {
        let jsonObjectRetrun = JSON.parse(`{"status":200, "error":"", "kvlist": []}`);
                
        for (var i = 0; i < keyList.keys.length; i++) {
          let item = keyList.keys[i];
          if (protect_keylist.includes(item.name)) {
            continue;
          }
          if (item.name.endsWith("-count")) {
            continue;
          }

          let url = await LINKS.get(item.name);
          
          let newElement = { "key": item.name, "value": url };
          jsonObjectRetrun.kvlist.push(newElement);
        }

        return new Response(JSON.stringify(jsonObjectRetrun) , {
          headers: response_header,
        })
      } else {
        return new Response(`{"status":500, "error":"错误：加载keyList失败"}`, {
          headers: response_header,
        })
      }
    }

  } else if (request.method === "OPTIONS") {
    return new Response(``, {
      headers: response_header,
    })
  }

  const requestURL = new URL(request.url)
  let path = requestURL.pathname.split("/")[1]
  path = decodeURIComponent(path);
  const params = requestURL.search;

  if (!path) {
    return new Response(html404, {
      headers: response_header,
      status: 404
    }) 
  }

  if (path == password_value) {
    let index = await fetch(index_html)
    index = await index.text()
    index = index.replace(/__PASSWORD__/gm, password_value)
    return new Response(index, {
      headers: response_header,
    })
  }

  let value = await LINKS.get(path);

  if (protect_keylist.includes(path)) {
    value = ""
  }

  if (!value) {
    return new Response(html404, {
      headers: response_header,
      status: 404
    })
  }

  if (config.visit_count) {
    let count = await LINKS.get(path + "-count");
    if (count === null) {
      await LINKS.put(path + "-count", "1");
    } else {
      count = parseInt(count) + 1;
      await LINKS.put(path + "-count", count.toString());
    }
  }

  if (config.snapchat_mode) {
    await LINKS.delete(path)
  }

  if (params) {
    value = value + params
  }

  if (config.result_page) {
    let result_page_html = await fetch(result_html)
    let result_page_html_text = await result_page_html.text()      
    result_page_html_text = result_page_html_text.replace(/{__FINAL_LINK__}/gm, value)
    return new Response(result_page_html_text, {
      headers: response_header,
    })
  } 

  if (config.system_type == "shorturl") {
    return Response.redirect(value, 302)
  } else if (config.system_type == "imghost") {
    var blob = base64ToBlob(value)
    return new Response(blob)
  } else {
    return new Response(value, {
      headers: {
          "Content-type": "text/plain;charset=UTF-8;",
        },
    })
  }
}

addEventListener("fetch", async event => {
  event.respondWith(handleRequest(event.request))
})
