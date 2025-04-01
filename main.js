let res

let apiSrv = window.location.pathname
let password_value = document.querySelector("#passwordText").value
// let apiSrv = "https://journal.crazypeace.workers.dev"
// let password_value = "journaljournal"

// 这是默认行为，可以在不同的index.html中设置为不同的功能
let buildValueItemFunc = buildValueTxt

function shorturl() {
  if (document.querySelector("#longURL").value == "") {
    alert("URL不能为空！")
    return
  }
  
  // 短链中不能有空格
  document.getElementById('keyPhrase').value = document.getElementById('keyPhrase').value.replace(/\s/g, "-");
  document.getElementById("addBtn").disabled = true;
  document.getElementById("addBtn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>处理中...';
  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "add", url: document.querySelector("#longURL").value, key: document.querySelector("#keyPhrase").value, password: password_value })
  }).then(function (response) {
    return response.json();
  }).then(function (myJson) {
    res = myJson;
    document.getElementById("addBtn").disabled = false;
    document.getElementById("addBtn").innerHTML = '生成短链';

    // 成功生成短链
    if (res.status == "200") {
      let keyPhrase = res.key;
      let valueLongURL = document.querySelector("#longURL").value;
      // 保存到本地存储
      localStorage.setItem(keyPhrase, valueLongURL);
      // 添加到页面列表
      addUrlToList(keyPhrase, valueLongURL)

      document.getElementById("result").innerHTML = window.location.protocol + "//" + window.location.host + "/" + res.key;
    } else {
      document.getElementById("result").innerHTML = res.error;
    }

    // 显示结果弹窗
    var modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();

  }).catch(function (err) {
    alert("未知错误，请重试！");
    console.log(err);
    document.getElementById("addBtn").disabled = false;
    document.getElementById("addBtn").innerHTML = '生成短链';
  })
}

function copyurl(id, attr) {
  let target = null;

  if (attr) {
    target = document.createElement('div');
    target.id = 'tempTarget';
    target.style.opacity = '0';
    if (id) {
      let curNode = document.querySelector('#' + id);
      target.innerText = curNode[attr];
    } else {
      target.innerText = attr;
    }
    document.body.appendChild(target);
  } else {
    target = document.querySelector('#' + id);
  }

  try {
    let range = document.createRange();
    range.selectNode(target);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
  } catch (e) {
    console.log('复制失败')
  }

  if (attr) {
    // 移除临时元素
    target.parentElement.removeChild(target);
  }
}

function loadUrlList() {
  // 清空列表
  let urlList = document.querySelector("#urlList")
  while (urlList.firstChild) {
    urlList.removeChild(urlList.firstChild)
  }

  // 文本框中的长链接
  let longUrl = document.querySelector("#longURL").value

  // 遍历本地存储
  let len = localStorage.length
  for (; len > 0; len--) {
    let keyShortURL = localStorage.key(len - 1)
    let valueLongURL = localStorage.getItem(keyShortURL)

    // 如果长链接为空，加载所有本地存储；如果长链接不为空，只加载匹配项
    if (longUrl == "" || (longUrl == valueLongURL)) {
      addUrlToList(keyShortURL, valueLongURL)
    }
  }
}

function addUrlToList(shortUrl, longUrl) {
  let urlList = document.querySelector("#urlList")
  let child = document.createElement('div')
  child.classList.add("mb-3", "list-group-item")
  let keyItem = document.createElement('div')
  keyItem.classList.add("input-group")

  // 删除按钮
  let delBtn = document.createElement('button')
  delBtn.setAttribute('type', 'button')  
  delBtn.classList.add("btn", "btn-danger", "rounded-bottom-0")
  delBtn.setAttribute('onclick', 'deleteShortUrl(\"' + shortUrl + '\")')
  delBtn.setAttribute('id', 'delBtn-' + shortUrl)
  delBtn.innerText = "删除"
  keyItem.appendChild(delBtn)

  // 查询访问次数按钮
  let qryCntBtn = document.createElement('button')
  qryCntBtn.setAttribute('type', 'button')
  qryCntBtn.classList.add("btn", "btn-info")
  qryCntBtn.setAttribute('onclick', 'queryVisitCount(\"' + shortUrl + '\")')
  qryCntBtn.setAttribute('id', 'qryCntBtn-' + shortUrl)
  qryCntBtn.innerText = "查询"
  keyItem.appendChild(qryCntBtn)

  // 短链接信息
  let keyTxt = document.createElement('span')
  keyTxt.classList.add("form-control", "rounded-bottom-0")
  keyTxt.innerText = window.location.protocol + "//" + window.location.host + "/" + shortUrl
  keyItem.appendChild(keyTxt)

  // 显示二维码按钮
  let qrcodeBtn = document.createElement('button')  
  qrcodeBtn.setAttribute('type', 'button')
  qrcodeBtn.classList.add("btn", "btn-info")
  qrcodeBtn.setAttribute('onclick', 'buildQrcode(\"' + shortUrl + '\")')
  qrcodeBtn.setAttribute('id', 'qrcodeBtn-' + shortUrl)
  qrcodeBtn.innerText = "二维码"
  keyItem.appendChild(qrcodeBtn)
  child.appendChild(keyItem)

  // 二维码占位元素
  let qrcodeItem = document.createElement('div');
  qrcodeItem.setAttribute('id', 'qrcode-' + shortUrl)
  child.appendChild(qrcodeItem)

  // 长链接信息
  child.appendChild(buildValueItemFunc(longUrl))
  urlList.append(child)
}

function clearLocalStorage() {
  localStorage.clear();
  loadUrlList();
}

function deleteShortUrl(delKeyPhrase) {
  // 按钮状态
  document.getElementById("delBtn-" + delKeyPhrase).disabled = true;
  document.getElementById("delBtn-" + delKeyPhrase).innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';

  // 从KV中删除
  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "del", key: delKeyPhrase, password: password_value })
  }).then(function (response) {
    return response.json();
  }).then(function (myJson) {
    res = myJson;

    // 成功删除
    if (res.status == "200") {
      // 从本地存储中删除
      localStorage.removeItem(delKeyPhrase)
      // 重新加载列表
      loadUrlList()

      document.getElementById("result").innerHTML = "删除成功"
    } else {
      document.getElementById("result").innerHTML = res.error;
    }

    // 显示结果弹窗
    var modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();

  }).catch(function (err) {
    alert("未知错误，请重试！");
    console.log(err);
  })
}

function queryVisitCount(qryKeyPhrase) {
  // 按钮状态
  document.getElementById("qryCntBtn-" + qryKeyPhrase).disabled = true;
  document.getElementById("qryCntBtn-" + qryKeyPhrase).innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';

  // 从KV中查询访问次数
  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "qry", key: qryKeyPhrase + "-count", password: password_value })
  }).then(function (response) {
    return response.json();
  }).then(function (myJson) {
    res = myJson;

    // 成功查询
    if (res.status == "200") {
      document.getElementById("qryCntBtn-" + qryKeyPhrase).innerHTML = res.url;
    } else {
      document.getElementById("result").innerHTML = res.error;
      // 显示结果弹窗
      var modal = new bootstrap.Modal(document.getElementById('resultModal'));
      modal.show();
    }

  }).catch(function (err) {
    alert("未知错误，请重试！");
    console.log(err);
  })
}

function query1KV() {
  let qryKeyPhrase = document.getElementById("keyForQuery").value;
  if (qryKeyPhrase == "") {
    return
  }

  // 从KV中查询单个键值
  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "qry", key: qryKeyPhrase, password: password_value })
  }).then(function (response) {
    return response.json();
  }).then(function (myJson) {
    res = myJson;

    // 成功查询
    if (res.status == "200") {
      document.getElementById("longURL").value = res.url;
      document.getElementById("keyPhrase").value = qryKeyPhrase;
      // 触发input事件
      document.getElementById("longURL").dispatchEvent(new Event('input', {
        bubbles: true,
        cancelable: true,
      }))
    } else {
      document.getElementById("result").innerHTML = res.error;
      // 显示结果弹窗
      var modal = new bootstrap.Modal(document.getElementById('resultModal'));
      modal.show();
    }

  }).catch(function (err) {
    alert("未知错误，请重试！");
    console.log(err);
  })
}

function loadKV() {
  //清空本地存储
  clearLocalStorage(); 

  // 从KV中查询全部数据
  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "qryall", password: password_value })
  }).then(function (response) {    
    return response.json();
  }).then(function (myJson) {
    res = myJson;
    // 成功查询
    if (res.status == "200") {

      // 遍历查询结果
      res.kvlist.forEach(item => {      
        keyPhrase = item.key;
        valueLongURL = item.value;
        // 保存到本地存储
        localStorage.setItem(keyPhrase, valueLongURL);  
      });
      
      // 加载URL列表
      loadUrlList();
    } else {
      document.getElementById("result").innerHTML = res.error;
      // 显示结果弹窗
      var modal = new bootstrap.Modal(document.getElementById('resultModal'));
      modal.show();
    }
  }).catch(function (err) {
    alert("未知错误，请重试！");
    console.log(err);
  })
}

// 生成二维码
function buildQrcode(shortUrl) {
  // 获取当前主题模式（深色/浅色）
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  var options = {
    // 基本设置
    render: 'canvas',       // 使用canvas渲染，性能更好
    minVersion: 5,         // 最小版本从1提高到5，避免过简
    maxVersion: 40,        // 最大版本限制到20，防止过大。可选1-40
    ecLevel: 'H',          // 使用最高纠错等级H（可恢复30%数据）
    
    // 尺寸与定位
    size: 192,             // 适度缩小尺寸
    left: 0,
    top: 0,
    
    // 颜色方案（适配深色模式）
    fill: isDarkMode ? '#FFF' : '#2A2B2C', // 深色模式用白色，浅色用深灰
    background: isDarkMode ? 'rgba(45, 55, 72, 0.8)' : null, // 深色模式半透明背景
    
    // 内容设置
    text: window.location.protocol + "//" + window.location.host + "/" + shortUrl,
    
    // 样式优化
    radius: 5,             // 适度增加圆角
    quiet: 3,              // 保证足够的空白边距
    mode: 0,               // 普通模式
    
    // 中心图标设置（如需）
    mSize: 0.18,           // 稍大的中心区域
    mPosX: 0.5,            // 居中
    mPosY: 0.5,            // 居中
    image: null,           // 可替换为logo路径
    
    // 标签设置（如需）
    label: shortUrl,       // 显示短链作为标签
    fontname: 'system-ui, -apple-system, sans-serif', // 现代字体
    fontcolor: isDarkMode ? '#FFF' : '#2A2B2C',
    labelFontsize: 12      // 标签字体大小
  };

  // 清除旧二维码并生成新二维码
  const container = $("#qrcode-" + shortUrl.replace(/([:.#[\]|=@])/g, "\\$1"));
  container.empty();
  
  // 添加容器样式
  container.css({
    'padding': '12px',
    'background': isDarkMode ? 'rgba(45, 55, 72, 0.5)' : '#FFF',
    'border-radius': '8px',
    'display': 'inline-block'
  });
  
  // 生成二维码
  container.qrcode(options);
  
  // 添加悬停动画效果
  container.hover(
    function() {
      $(this).css('transform', 'scale(1.03)');
    },
    function() {
      $(this).css('transform', 'scale(1)');
    }
  );
}

function buildValueTxt(longUrl) {
  let valueTxt = document.createElement('div')
  valueTxt.classList.add("form-control", "rounded-top-0")
  valueTxt.innerText = longUrl
  return valueTxt
}

document.addEventListener('DOMContentLoaded', function() {
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
  var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl)
  });

  loadUrlList();
});
