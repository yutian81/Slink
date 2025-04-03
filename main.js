let res;
let apiSrv = window.location.pathname;
let password_value = document.querySelector("#passwordText").value;
let buildValueItemFunc = buildValueTxt;

function shorturl() {
  const longURL = document.querySelector("#longURL").value;
  if (!longURL) {
    alert("URL不能为空！");
    return;
  }

  const addBtn = document.getElementById("addBtn");
  addBtn.disabled = true;
  addBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>处理中...';

  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      cmd: "add", 
      url: longURL, 
      key: document.querySelector("#keyPhrase").value, 
      password: password_value 
    })
  }).then(response => {
    if (!response.ok) throw new Error("网络响应不正常");
    return response.json();
  }).then(data => {
    res = data;
    addBtn.disabled = false;
    addBtn.innerHTML = '<i class="fas fa-magic me-2"></i>生成短链';

    if (res.status === "200") {
      localStorage.setItem(res.key, longURL);
      addUrlToList(res.key, longURL);
      document.getElementById("result").innerHTML = `${window.location.origin}/${res.key}`;
      
      // 提示唯一链接模式
      if (res.key !== document.querySelector("#keyPhrase").value) {
        alert("提示：已启用唯一链接模式，系统自动分配了新短链。");
      }
      
      // 显示结果页面提示
      document.getElementById("resultPageHint").style.display = "block";
    } else {
      document.getElementById("result").innerHTML = res.error;
    }

    new bootstrap.Modal(document.getElementById('resultModal')).show();
  }).catch(err => {
    console.error("请求错误:", err);
    addBtn.disabled = false;
    addBtn.innerHTML = '<i class="fas fa-magic me-2"></i>生成短链';
    alert("请求失败，请重试！");
  });
}

function togglePassword(id) {
  const input = document.getElementById(id);
  const icon = input.nextElementSibling.querySelector('i');
  if (input.type === "password") {
    input.type = "text";
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = "password";
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
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
    
    // 显示复制成功的提示
    let alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success position-fixed top-0 end-0 m-3';
    alertDiv.style.zIndex = '1060';
    alertDiv.innerHTML = '复制成功！';
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 2000);
  } catch (e) {
    console.error('复制失败:', e);
  }

  if (attr) {
    target.parentElement.removeChild(target);
  }
}

function loadUrlList() {
  let urlList = document.querySelector("#urlList")
  while (urlList.firstChild) {
    urlList.removeChild(urlList.firstChild)
  }

  let longUrl = document.querySelector("#longURL").value

  for (let len = localStorage.length; len > 0; len--) {
    let keyShortURL = localStorage.key(len - 1)
    let valueLongURL = localStorage.getItem(keyShortURL)

    if (longUrl == "" || (longUrl == valueLongURL)) {
      addUrlToList(keyShortURL, valueLongURL)
    }
  }
}

// 将短链接添加到URL列表
function addUrlToList(shortUrl, longUrl) {
  const urlList = document.querySelector("#urlList");
  const child = document.createElement('div');
  child.classList.add("mb-3", "list-group-item");

  // 操作按钮组
  const btnGroup = document.createElement('div');
  btnGroup.classList.add("d-flex", "align-items-center", "mb-2");

  // 删除按钮
  const delBtn = document.createElement('button');
  delBtn.classList.add("btn", "btn-danger", "btn-sm", "me-1");
  delBtn.innerHTML = '<i class="fas fa-trash me-1"></i><span class="d-none d-md-inline">删除</span>';
  delBtn.onclick = () => deleteShortUrl(shortUrl);
  btnGroup.appendChild(delBtn);

  // 复制按钮
  const copyBtn = document.createElement('button');
  copyBtn.classList.add("btn", "btn-info", "btn-sm", "me-1");
  copyBtn.innerHTML = '<i class="fas fa-copy me-1"></i><span class="d-none d-md-inline">复制</span>';
  copyBtn.onclick = () => {
    copyurl('', `${window.location.origin}/${shortUrl}`);
    copyBtn.innerHTML = '<i class="fas fa-check me-1"></i><span class="d-none d-md-inline">已复制</span>';
    setTimeout(() => {
      copyBtn.innerHTML = '<i class="fas fa-copy me-1"></i><span class="d-none d-md-inline">复制</span>';
    }, 2000);
  };
  btnGroup.appendChild(copyBtn);

  // 短链接显示文本（可点击复制）
  const shortUrlText = document.createElement('span');
  shortUrlText.classList.add("fw-bold", "flex-grow-1", "text-truncate", "text-primary");
  shortUrlText.style.cursor = "pointer";
  shortUrlText.title = "点击复制";
  shortUrlText.innerHTML = `${window.location.origin}/${shortUrl}`;
  shortUrlText.onclick = () => {
    copyurl('', shortUrlText.textContent);
    shortUrlText.classList.add("text-success");
    setTimeout(() => shortUrlText.classList.remove("text-success"), 500);
  };
  btnGroup.appendChild(shortUrlText);

  // 二维码按钮
  const qrBtn = document.createElement('button');
  qrBtn.classList.add("btn", "btn-secondary", "btn-sm");
  qrBtn.innerHTML = '<i class="fas fa-qrcode me-1"></i><span class="d-none d-md-inline">扫码</span>';
  qrBtn.onclick = () => {
    const qrContainerId = `qrcode-${shortUrl}`;
    let qrContainer = document.getElementById(qrContainerId);
    
    if (qrContainer) {
      qrContainer.style.display = qrContainer.style.display === 'none' ? 'block' : 'none';
      return;
    }

    qrContainer = document.createElement('div');
    qrContainer.id = qrContainerId;
    qrContainer.className = 'qrcode-container mt-2';
    child.appendChild(qrContainer);

    // 生成二维码
    $(`#${qrContainerId}`).qrcode({
      text: `${window.location.origin}/${shortUrl}`,
      width: 128,
      height: 128,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.Q
    });
  };
  btnGroup.appendChild(qrBtn);
  child.appendChild(btnGroup);

  // 原始URL显示
  const longUrlText = document.createElement('div');
  longUrlText.classList.add("text-muted", "small", "mt-2");
  longUrlText.innerHTML = `<i class="fas fa-external-link-alt me-1"></i> ${longUrl}`;
  child.appendChild(longUrlText);

  // 访问统计
  if (config.visit_count) {
    fetch(apiSrv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cmd: "qry", 
        key: `${shortUrl}-count`, 
        password: password_value 
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === "200" && data.url) {
        const countText = document.createElement('div');
        countText.classList.add("text-muted", "small", "mt-1");
        countText.innerHTML = `
          <i class="fas fa-chart-line me-1"></i>
          访问统计: ${data.url} 次
          <span class="ms-2">
            <i class="fas fa-calendar-day me-1"></i>
            最后访问: ${new Date().toLocaleString()}
          </span>
        `;
        child.appendChild(countText);
      }
    })
    .catch(error => console.error("获取访问统计失败:", error));
  }

  // 添加到列表顶部
  urlList.insertBefore(child, urlList.firstChild);

  // 动画效果
  child.style.opacity = '0';
  setTimeout(() => {
    child.style.transition = 'opacity 0.3s ease';
    child.style.opacity = '1';
  }, 10);
}

function clearLocalStorage() {
  if (confirm("确定要清空本地存储的所有短链接吗？")) {
    localStorage.clear()
    loadUrlList()
    document.getElementById("result").innerHTML = "本地存储已清空"
    var modal = new bootstrap.Modal(document.getElementById('resultModal'))
    modal.show()
  }
}

function deleteShortUrl(delKeyPhrase) {
  let delBtn = document.getElementById("delBtn-" + delKeyPhrase)
  delBtn.disabled = true
  delBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>'

  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "del", key: delKeyPhrase, password: password_value })
  }).then(function(response) {
    if (!response.ok) throw new Error("网络响应不正常")
    return response.json()
  }).then(function(myJson) {
    res = myJson

    if (res.status == "200") {
      localStorage.removeItem(delKeyPhrase)
      loadUrlList()
      document.getElementById("result").innerHTML = "删除成功"
    } else {
      document.getElementById("result").innerHTML = res.error
    }

    var modal = new bootstrap.Modal(document.getElementById('resultModal'))
    modal.show()
  }).catch(function(err) {
    console.error("删除错误:", err)
    alert("删除失败，请重试！")
    delBtn.disabled = false
    delBtn.innerHTML = '<i class="fas fa-trash me-1"></i><span class="d-none d-md-inline">删除</span>'
  })
}

function loadKV() {
  let loadBtn = document.getElementById("loadKV2localStgBtn")
  loadBtn.disabled = true
  loadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> 加载中...'

  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "qryall", password: password_value })
  }).then(function(response) {
    if (!response.ok) throw new Error("网络响应不正常")
    return response.json()
  }).then(function(myJson) {
    res = myJson
    loadBtn.disabled = false
    loadBtn.innerHTML = '<i class="fas fa-cloud-download-alt me-2"></i>从KV加载'

    if (res.status == "200") {
      localStorage.clear()
      res.kvlist.forEach(item => {
        localStorage.setItem(item.key, item.value)
      })
      loadUrlList()
      document.getElementById("result").innerHTML = "已从KV加载 " + res.kvlist.length + " 条短链接"
    } else {
      document.getElementById("result").innerHTML = res.error
    }

    var modal = new bootstrap.Modal(document.getElementById('resultModal'))
    modal.show()
  }).catch(function(err) {
    console.error("加载错误:", err)
    loadBtn.disabled = false
    loadBtn.innerHTML = '<i class="fas fa-cloud-download-alt me-2"></i>从KV加载'
    alert("加载失败，请重试！")
  })
}

function buildQrcode(shortUrl) {
  $("#qrcode-" + shortUrl.replace(/(:|\.|\[|\]|,|=|@)/g, "\\$1").replace(/(:|\#|\[|\]|,|=|@)/g, "\\$1") ).empty().qrcode({
    text: window.location.protocol + "//" + window.location.host + "/" + shortUrl,
    width: 128,
    height: 128,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.Q
  });
}

function buildValueTxt(longUrl) {
  let valueTxt = document.createElement('div')
  valueTxt.classList.add("form-control", "rounded-top-0")
  valueTxt.innerText = longUrl
  return valueTxt
}

document.addEventListener('DOMContentLoaded', function() {
  // 检查是否允许自定义短链
  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: "getconfig", password: password_value })
  }).then(response => response.json())
    .then(data => {
      if (data.custom_link === false) {
        document.getElementById('customLinkContainer').style.display = 'none';
      }
      if (data.result_page === true) {
        document.getElementById('resultPageHint').style.display = 'block';
      }
      if (data.visit_count === true) {
        window.enableVisitCount = true;
      }
    });
  loadUrlList();
  
  // 绑定按钮事件
  document.getElementById("addBtn").addEventListener("click", shorturl);
  document.getElementById("loadListBtn").addEventListener("click", loadUrlList);
  document.getElementById("clearlocalStgBtn").addEventListener("click", clearLocalStorage);
  document.getElementById("loadKV2localStgBtn").addEventListener("click", loadKV);
  document.getElementById("copyResultBtn").addEventListener("click", function() {
    copyurl("result");
  });
});