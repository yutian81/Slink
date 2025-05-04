let res;
let apiSrv = window.location.pathname;
let password_value = document.querySelector("#passwordText").value;
// let apiSrv = "https://journal.crazypeace.workers.dev";
// let password_value = "journaljournal";
let buildValueItemFunc = buildValueTxt; // 这是默认行为, 在不同的index.html中可以设置为不同的行为

// 复制短链接
function copyShortUrl(text, btnId) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    // 显示成功状态
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check" style="color:white"></i>'; // 复制后显示白色的 √
    setTimeout(() => {
      btn.innerHTML = originalIcon;
    }, 2000);
  });
}

// 模态框复制短链接
function handleModalCopy(text) {
  const btn = document.getElementById('copyResultBtn');
  const originalHTML = btn.innerHTML;

  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = '<i class="fas fa-check me-2"></i>已复制';
    btn.classList.replace('btn-primary', 'btn-success');
    
    // 自动关闭模态框
    setTimeout(() => {
      const modal = bootstrap.Modal.getInstance(document.getElementById('resultModal'));
      modal.hide();
    }, 800);
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.replace('btn-success', 'btn-primary');
    }, 1000);
  }).catch(() => {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    
    // 状态反馈
    btn.innerHTML = '<i class="fas fa-check me-2"></i>已复制';
    setTimeout(() => {
      btn.innerHTML = originalHTML;
    }, 1000);
  });
}

function shorturl(event) {
  if (event) {
    event.preventDefault();
    if (event.keyCode && event.keyCode !== 13) return;
  }

  if (document.querySelector("#longURL").value == "") {
    alert("URL不能为空!");
    return;
  }
  
  document.getElementById('keyPhrase').value = document.getElementById('keyPhrase').value.replace(/\s/g, "-");
  document.getElementById("addBtn").disabled = true;
  document.getElementById("addBtn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 处理中...';

  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cmd: "add", 
      url: document.querySelector("#longURL").value, 
      key: document.querySelector("#keyPhrase").value, 
      password: password_value
    })
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById("addBtn").disabled = false;
    document.getElementById("addBtn").innerHTML = '<i class="fas fa-magic me-2"></i>生成';
    if (data.status == 200) {
      const shortUrl = window.location.protocol + "//" + window.location.host + "/" + data.key;
      document.getElementById("result").innerHTML = shortUrl;
      
      // 绑定模态框复制按钮事件
      document.getElementById("copyResultBtn").onclick = () => {
        handleModalCopy(shortUrl);
      };
      // 生成短链后显示模态框
      const modal = new bootstrap.Modal(document.getElementById('resultModal'));
      modal.show();
      // 添加到本地存储和列表
      localStorage.setItem(data.key, document.querySelector("#longURL").value);
      addUrlToList(data.key, document.querySelector("#longURL").value);
    } else {
      alert(data.error || "生成短链失败");
    }
  })
  .catch(err => {
    console.error("Error:", err);
    document.getElementById("addBtn").disabled = false;
    document.getElementById("addBtn").innerHTML = '<i class="fas fa-magic me-2"></i>生成';
    alert("请求失败，请重试");
  });
}

function loadUrlList() {
  let urlList = document.querySelector("#urlList")
  urlList.innerHTML = ''; // 强制清空
  urlList.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div></div>';

  while (urlList.firstChild) {
    urlList.removeChild(urlList.firstChild)
  }

  let longUrl = document.querySelector("#longURL").value // 文本框中的长链接
  setTimeout(() => {
    let len = localStorage.length
    for (; len > 0; len--) {
      let keyShortURL = localStorage.key(len - 1)
      let valueLongURL = localStorage.getItem(keyShortURL)
      // 如果长链接为空，加载所有的localStorage；否则，加载匹配的localStorage
      if (longUrl == "" || (longUrl == valueLongURL)) {
        addUrlToList(keyShortURL, valueLongURL)
      }
    }
  }, 100);
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
  delBtn.innerHTML = '<i class="fas fa-trash-alt" title="删除短链接"></i>'
  keyItem.appendChild(delBtn)

  // 只有当 visit_count 为 true 时才显示统计按钮
  if (window.visit_count_enabled !== false) {
    let qryCntBtn = document.createElement('button')
    qryCntBtn.setAttribute('type', 'button')
    qryCntBtn.classList.add("btn", "btn-info")
    qryCntBtn.setAttribute('onclick', 'queryVisitCount(\"' + shortUrl + '\")')
    qryCntBtn.setAttribute('id', 'qryCntBtn-' + shortUrl)
    qryCntBtn.innerHTML = '<i class="fas fa-chart-line" title="访问统计"></i>'
    keyItem.appendChild(qryCntBtn)
  }

  // 复制按钮
  const copyBtn = document.createElement('button');
  copyBtn.setAttribute('type', 'button');
  copyBtn.classList.add('btn', 'btn-success');
  copyBtn.setAttribute('id', `copyBtn-${shortUrl}`);
  copyBtn.innerHTML = '<i class="fas fa-copy" title="复制短链接"></i>';
  copyBtn.onclick = () => copyShortUrl(
    `${window.location.protocol}//${window.location.host}/${shortUrl}`,
    `copyBtn-${shortUrl}`
  );
  keyItem.appendChild(copyBtn);

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
  qrcodeBtn.innerHTML = '<i class="fas fa-qrcode" title="显示二维码"></i>' // 使用二维码图标
  keyItem.appendChild(qrcodeBtn)
  child.appendChild(keyItem)

  // 插入一个二维码占位
  let qrcodeItem = document.createElement('div');
  qrcodeItem.setAttribute('id', 'qrcode-' + shortUrl)
  child.appendChild(qrcodeItem)

  // 长链接信息
  child.appendChild(buildValueItemFunc(longUrl))
  urlList.append(child)
}

function clearLocalStorage() {
  localStorage.clear()
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

    if (res.status == "200") {
      localStorage.removeItem(delKeyPhrase)
      loadUrlList()
      document.getElementById("result").innerHTML = "已删除"
    } else {
      document.getElementById("result").innerHTML = res.error;
    }
    // 弹出消息窗口
    var modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();

  }).catch(function (err) {
    alert("Unknow error. Please retry!");
    console.log(err);
  })
}

function queryVisitCount(qryKeyPhrase) {
  document.getElementById("qryCntBtn-" + qryKeyPhrase).disabled = true;
  document.getElementById("qryCntBtn-" + qryKeyPhrase).innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';

  // 从KV中查询
  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "qry", key: qryKeyPhrase + "-count", password: password_value })
  }).then(function (response) {
    return response.json();
  }).then(function (myJson) {
    res = myJson;

    if (res.status == "200") {
      document.getElementById("qryCntBtn-" + qryKeyPhrase).innerHTML = res.url;
    } else {
      document.getElementById("result").innerHTML = res.error;
      // 弹出消息窗口
      var modal = new bootstrap.Modal(document.getElementById('resultModal'));
      modal.show();
    }

  }).catch(function (err) {
    alert("Unknow error. Please retry!");
    console.log(err);
  })
}

function query1KV(event) {
  if (event) {
    event.preventDefault();
    if (event.keyCode && event.keyCode !== 13) return;
  }

  let qryKeyPhrase = document.getElementById("keyForQuery").value;
  if (qryKeyPhrase == "") {
    return
  }

  // 从KV中查询
  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "qry", key: qryKeyPhrase, password: password_value })
  }).then(function (response) {
    return response.json();
  }).then(function (myJson) {
    res = myJson;

    if (res.status == "200") {
      document.getElementById("longURL").value = res.url;
      document.getElementById("keyPhrase").value = qryKeyPhrase;
      document.getElementById("longURL").dispatchEvent(new Event('input', {
        bubbles: true,
        cancelable: true,
      }))
    } else {
      document.getElementById("result").innerHTML = res.error;
      // 弹出消息窗口
      var modal = new bootstrap.Modal(document.getElementById('resultModal'));
      modal.show();
    }

  }).catch(function (err) {
    alert("未知错误。请重试!");
    console.log(err);
  })
}

function loadKV() {
  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "qryall", password: password_value })
  })
  .then(response => {
    if (!response.ok) throw new Error('加载失败');
    return response.json();
  })
  .then(data => {
    if (data.status == 200) {
      clearLocalStorage();
      data.kvlist.forEach(item => { localStorage.setItem(item.key, item.value); });
      loadUrlList(); // 加载完成后刷新列表
      setTimeout(() => { alert(`成功加载 ${data.kvlist.length} 条记录`); }, 300);
    } else {
      alert(data.error || "加载失败");
    }
  })
  .catch(err => {
    console.error("Error:", err);
    alert("请求失败，请重试");
  });
}

// 生成二维码
function buildQrcode(shortUrl) {
  // 感谢项目 https://github.com/lrsjng/jquery-qrcode
  var options = {
    render: 'canvas',
    minVersion: 1,
    maxVersion: 40,
    ecLevel: 'Q', // 'L', 'M', 'Q' or 'H'
    left: 0,
    top: 0,
    size: 192,
    fill: '#000',
    background: null,
    text: window.location.protocol + "//" + window.location.host + "/" + shortUrl,
    radius: 4,
    quiet: 2,
    mode: 0,
    mSize: 0.1,
    mPosX: 0.5,
    mPosY: 0.5,
    label: 'no label',
    fontname: 'sans',
    fontcolor: '#000',
    image: null
  };
  $("#qrcode-" + shortUrl.replace(/(:|\.|\[|\]|,|=|@)/g, "\\$1").replace(/(:|\#|\[|\]|,|=|@)/g, "\\$1") ).empty().qrcode(options);
}

function buildValueTxt(longUrl) {
  let valueTxt = document.createElement('div')
  valueTxt.classList.add("form-control", "rounded-top-0")
  valueTxt.innerText = longUrl
  return valueTxt
}

document.addEventListener('DOMContentLoaded', function() {
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  var popoverList = popoverTriggerList.map(function(popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });

  // 初始化全局变量
  window.visit_count_enabled = true; // 默认值
  
  // 获取后端配置
  function loadConfig() {
    fetch(apiSrv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cmd: "config", 
        password: password_value 
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status == 200) {
        window.visit_count_enabled = data.visit_count;
        // 可以在这里存储其他配置
      }
      loadUrlList();
    })
    .catch(err => {
      console.error("Error loading config:", err);
      loadUrlList();
    });
  }
  document.getElementById("passwordText").readOnly = true;
  loadConfig();
});
