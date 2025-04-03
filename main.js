let res;
let apiSrv = window.location.pathname;
let password_value = document.querySelector("#passwordText").value;
let buildValueItemFunc = buildValueTxt;

function shorturl() {
  if (document.querySelector("#longURL").value == "") {
    alert("URL不能为空！");
    return;
  }
  
  document.getElementById('keyPhrase').value = document.getElementById('keyPhrase').value.replace(/\s/g, "-");

  let addBtn = document.getElementById("addBtn");
  addBtn.disabled = true;
  addBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>处理中...';

  fetch(apiSrv, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      cmd: "add", 
      url: document.querySelector("#longURL").value, 
      key: document.querySelector("#keyPhrase").value, 
      password: password_value 
    })
  }).then(function(response) {
    if (!response.ok) throw new Error("网络响应不正常");
    return response.json();
  }).then(function(myJson) {
    res = myJson;
    addBtn.disabled = false;
    addBtn.innerHTML = '<i class="fas fa-magic me-2"></i>生成短链';

    if (res.status == "200") {
      let keyPhrase = res.key;
      let valueLongURL = document.querySelector("#longURL").value;
      localStorage.setItem(keyPhrase, valueLongURL);
      addUrlToList(keyPhrase, valueLongURL);
      document.getElementById("result").innerHTML = window.location.protocol + "//" + window.location.host + "/" + res.key;
    } else {
      document.getElementById("result").innerHTML = res.error;
    }

    var modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();
  }).catch(function(err) {
    console.error("请求错误:", err);
    addBtn.disabled = false;
    addBtn.innerHTML = '<i class="fas fa-magic me-2"></i>生成短链';
    alert("请求失败，请重试！");
  });
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

function addUrlToList(shortUrl, longUrl) {
  let urlList = document.querySelector("#urlList")

  let child = document.createElement('div')
  child.classList.add("mb-3", "list-group-item")

  let keyItem = document.createElement('div')
  keyItem.classList.add("input-group")

  let delBtn = document.createElement('button')
  delBtn.setAttribute('type', 'button')  
  delBtn.classList.add("btn", "btn-danger", "btn-sm", "me-1")
  delBtn.setAttribute('onclick', 'deleteShortUrl(\"' + shortUrl + '\")')
  delBtn.setAttribute('id', 'delBtn-' + shortUrl)
  delBtn.innerHTML = '<i class="fas fa-trash me-1"></i><span class="d-none d-md-inline">删除</span>'
  keyItem.appendChild(delBtn)

  let copyBtn = document.createElement('button')
  copyBtn.setAttribute('type', 'button')
  copyBtn.classList.add("btn", "btn-info", "btn-sm", "me-1")
  copyBtn.setAttribute('onclick', 'copyurl(\'\', \"' + window.location.protocol + '//' + window.location.host + '/' + shortUrl + '\")')
  copyBtn.setAttribute('id', 'copyBtn-' + shortUrl)
  copyBtn.innerHTML = '<i class="fas fa-copy me-1"></i><span class="d-none d-md-inline">复制</span>'
  keyItem.appendChild(copyBtn)

  let keyTxt = document.createElement('span')
  keyTxt.classList.add("fw-bold", "flex-grow-1", "text-truncate", "text-primary")
  keyTxt.style.cursor = "pointer"
  keyTxt.setAttribute('onclick', 'copyurl(\'\', \"' + window.location.protocol + '//' + window.location.host + '/' + shortUrl + '\")')
  keyTxt.innerText = window.location.protocol + "//" + window.location.host + "/" + shortUrl
  keyItem.appendChild(keyTxt)

  let qrcodeBtn = document.createElement('button')  
  qrcodeBtn.setAttribute('type', 'button')
  qrcodeBtn.classList.add("btn", "btn-secondary", "btn-sm")
  qrcodeBtn.setAttribute('onclick', 'buildQrcode(\"' + shortUrl + '\")')
  qrcodeBtn.setAttribute('id', 'qrcodeBtn-' + shortUrl)
  qrcodeBtn.innerHTML = '<i class="fas fa-qrcode me-1"></i><span class="d-none d-md-inline">扫码</span>'
  keyItem.appendChild(qrcodeBtn)
  
  child.appendChild(keyItem)

  let qrcodeItem = document.createElement('div');
  qrcodeItem.setAttribute('id', 'qrcode-' + shortUrl)
  child.appendChild(qrcodeItem)

  let valueTxt = document.createElement('div')
  valueTxt.classList.add("text-muted", "small", "mt-2")
  valueTxt.innerHTML = '<i class="fas fa-external-link-alt me-1"></i> ' + longUrl
  child.appendChild(valueTxt)

  urlList.append(child)
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
