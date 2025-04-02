let res

let apiSrv = window.location.pathname
let password_value = ''; // 由后端验证
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
    body: JSON.stringify({ 
      cmd: "add", 
      url: document.querySelector("#longURL").value, 
      key: document("#keyPhrase").value, 
      password: document.querySelector("#passwordText").value 
    })
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
  // 特殊处理密码字段
  if (id === 'passwordText') {
    const tempInput = document.createElement('input');
    tempInput.value = document.getElementById(id).value;
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
      const success = document.execCommand('copy');
      if (success) {
        // 显示复制成功的提示
        const popover = new bootstrap.Popover(document.querySelector('[data-bs-toggle="popover"]'), {
          content: '密码已复制',
          trigger: 'manual'
        });
        popover.show();
        setTimeout(() => popover.hide(), 2000);
      }
    } catch (err) {
      console.error('复制失败:', err);
    } finally {
      document.body.removeChild(tempInput);
    }
    return;
  }

  // 常规复制逻辑
  let target = attr ? document.createElement('div') : document.querySelector('#' + id);
  
  if (attr) {
    target.id = 'tempTarget';
    target.style.opacity = '0';
    const curNode = id ? document.querySelector('#' + id) : null;
    target.innerText = curNode ? curNode[attr] : attr;
    document.body.appendChild(target);
  }

  try {
    const range = document.createRange();
    range.selectNode(target);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    
    // 显示复制成功的提示
    const popover = new bootstrap.Popover(document.querySelector('[data-bs-toggle="popover"]'), {
      content: '已复制',
      trigger: 'manual'
    });
    popover.show();
    setTimeout(() => popover.hide(), 2000);
  } catch (e) {
    console.error('复制失败:', e);
  } finally {
    if (attr) {
      target.parentElement.removeChild(target);
    }
  }
}

// 点击复制短链接
function copyShortUrl(url, event) {
  const qryBtn = event.target.closest('.list-group-item').querySelector('[id^="qryCntBtn-"]');
  const originalHtml = qryBtn.innerHTML;
  navigator.clipboard.writeText(url).then(() => {
    qryBtn.innerHTML = '<i class="fas fa-check me-1"></i><span class="d-none d-md-inline">已复制</span>';
    setTimeout(() => {
      qryBtn.innerHTML = originalHtml;
    }, 2000);
  }).catch(err => {
    qryBtn.innerHTML = '<i class="fas fa-times me-1"></i><span class="d-none d-md-inline">失败</span>';
    setTimeout(() => {
      qryBtn.innerHTML = originalHtml;
    }, 2000);
  });
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
  delBtn.classList.add("btn", "btn-danger", "btn-sm", "me-1")
  delBtn.setAttribute('onclick', 'deleteShortUrl(\"' + shortUrl + '\")')
  delBtn.setAttribute('id', 'delBtn-' + shortUrl)
  delBtn.setAttribute('aria-label', '删除短链接')
  delBtn.innerHTML = '<i class="fas fa-trash me-1"></i><span class="d-none d-md-inline">删除</span>'
  keyItem.appendChild(delBtn)

  // 查询访问次数按钮
  let qryCntBtn = document.createElement('button')
  qryCntBtn.setAttribute('type', 'button')
  qryCntBtn.classList.add("btn", "btn-info", "btn-sm", "me-1")
  qryCntBtn.setAttribute('onclick', 'queryVisitCount(\"' + shortUrl + '\")')
  qryCntBtn.setAttribute('id', 'qryCntBtn-' + shortUrl)
  qryCntBtn.setAttribute('aria-label', '访问统计')
  qryCntBtn.innerHTML = '<i class="fas fa-chart-line me-1"></i><span class="d-none d-md-inline">统计</span>'
  keyItem.appendChild(qryCntBtn)

  // 短链接信息
  let keyTxt = document.createElement('span')
  keyTxt.classList.add("text-primary", "flex-grow-1", "text-truncate", "pe-2")
  keyTxt.style.cursor = "pointer"
  keyTxt.innerHTML = window.location.protocol + "//" + window.location.host + "/" + shortUrl
  keyTxt.addEventListener('click', function(e) { copyShortUrl(this.textContent, e) })
  keyItem.appendChild(keyTxt)

  // 显示二维码按钮
  let qrcodeBtn = document.createElement('button')  
  qrcodeBtn.setAttribute('type', 'button')
  qrcodeBtn.classList.add("btn", "btn-secondary", "btn-sm")
  qrcodeBtn.setAttribute('onclick', 'buildQrcode(\"' + shortUrl + '\")')
  qrcodeBtn.setAttribute('id', 'qrcodeBtn-' + shortUrl)
  qrcodeBtn.setAttribute('aria-label', '生成二维码')
  qrcodeBtn.innerHTML = '<i class="fas fa-qrcode me-1"></i><span class="d-none d-md-inline">扫码</span>'
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
  document.querySelector("#longURL").value = "";
  document.querySelector("#longURL").dispatchEvent(new Event('input'));
  loadUrlList();
}

function deleteShortUrl(delKeyPhrase) {
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
      localStorage.removeItem(delKeyPhrase)
      loadUrlList()
      document.getElementById("result").innerHTML = "Delete Successful"
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

// 查询访问计数
function queryVisitCount(qryKeyPhrase) {
  const btn = document.getElementById("qryCntBtn-" + qryKeyPhrase);
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';

  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      cmd: "qry",
      key: qryKeyPhrase + "-count",
      password: password_value
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 200) {
      btn.innerHTML = `<i class="fas fa-eye me-1"></i><span class="d-none d-md-inline">${data.url}次</span>`;
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }, 3000);
    } else {
      throw new Error(data.error || "查询失败");
    }
  })
  .catch(error => {
    btn.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>';
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }, 2000);
  });
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

async function loadKV() {
  if (!confirm('从KV加载会覆盖本地存储，是否继续？')) return;
  clearLocalStorage();

  // 显示加载状态
  const loadBtn = document.getElementById("loadKV2localStgBtn");
  const originalText = loadBtn.innerHTML;
  loadBtn.disabled = true;
  loadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> 加载中...';

  try {
    // 从KV中查询全部数据
    const response = await fetch(apiSrv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: "qryall", password: password_value })
    });
    
    const result = await response.json();
    
    // 恢复按钮状态
    loadBtn.disabled = false;
    loadBtn.innerHTML = originalText;

    // 处理结果
    if (result.status === "200") {
      // 遍历查询结果
      result.kvlist.forEach(item => {
        const keyPhrase = item.key;
        const valueLongURL = item.value;
        
        // 跳过计数和受保护的key
        if (!keyPhrase.endsWith("-count") && !protect_keylist.includes(keyPhrase)) {
          // 保存到本地存储
          localStorage.setItem(keyPhrase, valueLongURL);  
        }
      });
      
      // 加载URL列表
      loadUrlList();
      
      // 显示成功消息
      document.getElementById("result").innerHTML = `成功加载 ${result.kvlist.length} 条记录`;
      new bootstrap.Modal(document.getElementById('resultModal')).show();
    } else {
      document.getElementById("result").innerHTML = result.error || "加载KV数据失败";
      new bootstrap.Modal(document.getElementById('resultModal')).show();
    }
  } catch (error) {
    // 恢复按钮状态
    loadBtn.disabled = false;
    loadBtn.innerHTML = originalText;
    console.error("加载KV数据出错:", error);
    document.getElementById("result").innerHTML = "网络错误，请重试";
    new bootstrap.Modal(document.getElementById('resultModal')).show();
  }
}

// 生成二维码
function buildQrcode(shortUrl) {
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const container = $("#qrcode-" + shortUrl.replace(/([:.#[\]|=@])/g, "\\$1"));
  
  try {
    container.empty().addClass('qrcode-container');    
    container.qrcode({
      render: 'canvas',
      size: 128,
      minVersion: 5,
      maxVersion: 20,
      ecLevel: 'H',
      fill: darkModeMediaQuery.matches ? '#FFF' : '#2A2B2C',
      background: null,
      text: window.location.protocol + "//" + window.location.host + "/" + shortUrl,
      radius: 4,
      quiet: 6
    });

    // 监听主题变化
    darkModeMediaQuery.addEventListener('change', (e) => {
      container.find('canvas').css('fill', e.matches ? '#FFF' : '#2A2B2C');
    });

  } catch (e) {
    container.html('<div class="alert alert-warning">二维码生成失败</div>');
    console.error("QR Code Error:", e);
  }
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
