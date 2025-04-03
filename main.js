// 全局变量和配置
const config = {
  apiSrv: window.location.pathname,
  password_value: '', // 由后端验证
  buildValueItemFunc: buildValueTxt
};

// 通用工具函数
const utils = {
  // 设置按钮加载状态
  setButtonLoading(button, isLoading, loadingText = '处理中...') {
    if (isLoading) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>${loadingText}`;
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
  },

  // 显示模态框
  showModal(message, isSuccess = true) {
    const resultEl = document.getElementById("result");
    resultEl.innerHTML = message;
    resultEl.className = `alert ${isSuccess ? 'alert-info' : 'alert-danger'}`;
    new bootstrap.Modal(document.getElementById('resultModal')).show();
  },

  // 构建完整URL
  buildFullUrl(shortKey) {
    return `${window.location.protocol}//${window.location.host}/${shortKey}`;
  },

  // 通用复制函数
  async copyToClipboard(text, targetElement = null) {
    try {
      await navigator.clipboard.writeText(text);
      if (targetElement) {
        const originalHtml = targetElement.innerHTML;
        targetElement.innerHTML = '<i class="fas fa-check me-1"></i><span class="d-none d-md-inline">已复制</span>';
        targetElement.classList.replace('btn-info', 'btn-success');
        setTimeout(() => {
          targetElement.innerHTML = originalHtml;
          targetElement.classList.replace('btn-success', 'btn-info');
        }, 2000);
      }
      return true;
    } catch (err) {
      console.error('复制失败:', err);
      if (targetElement) {
        targetElement.innerHTML = '<i class="fas fa-times me-1"></i><span class="d-none d-md-inline">失败</span>';
        targetElement.classList.replace('btn-info', 'btn-danger');
        setTimeout(() => {
          targetElement.innerHTML = originalHtml;
          targetElement.classList.replace('btn-danger', 'btn-info');
        }, 2000);
      }
      return false;
    }
  }
};

// 主功能函数
const shortUrlApp = {
  // 生成短链接
  async generate() {
    const longURL = document.querySelector("#longURL").value;
    if (!longURL) {
      alert("URL不能为空！");
      return;
    }

    const addBtn = document.getElementById("addBtn");
    utils.setButtonLoading(addBtn, true);

    try {
      const keyPhrase = document.getElementById('keyPhrase').value.replace(/\s/g, "-");
      const response = await fetch(config.apiSrv, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cmd: "add", 
          url: longURL, 
          key: keyPhrase, 
          password: document.querySelector("#passwordText").value 
        })
      });

      const res = await response.json();
      if (res.status === "200") {
        const shortUrl = utils.buildFullUrl(res.key);
        localStorage.setItem(res.key, longURL);
        this.addUrlToList(res.key, longURL);
        document.getElementById("result").innerHTML = shortUrl;
        utils.copyToClipboard(shortUrl);
      } else {
        utils.showModal(res.error, false);
      }
    } catch (err) {
      console.error(err);
      utils.showModal("未知错误，请重试！", false);
    } finally {
      utils.setButtonLoading(addBtn, false, '生成短链');
    }
  },

  // 加载URL列表
  loadUrlList() {
    const urlList = document.querySelector("#urlList");
    urlList.innerHTML = '';
    const longUrl = document.querySelector("#longURL").value;

    Array.from({ length: localStorage.length }, (_, i) => localStorage.length - 1 - i)
      .map(i => ({
        key: localStorage.key(i),
        value: localStorage.getItem(localStorage.key(i))
      }))
      .filter(({ value }) => !longUrl || value === longUrl)
      .forEach(({ key, value }) => this.addUrlToList(key, value));
  },

  // 从KV加载数据到本地存储
  async loadFromKV() {
    const btn = document.getElementById("loadKV2localStgBtn");
    if (!btn) return;

    utils.setButtonLoading(btn, true, '加载中...');
    
    try {
      const password = document.querySelector("#passwordText").value;
      if (!password) {
        utils.showModal("请先输入管理密码", false);
        return;
      }

      const response = await fetch(config.apiSrv, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cmd: "qryall", 
          password: password 
        })
      });

      const res = await response.json();
      
      if (res.status === "200" && Array.isArray(res.kvlist)) {
        // 清空本地存储但保留密码
        const currentPassword = localStorage.getItem("password") || "";
        localStorage.clear();
        if (currentPassword) {
          localStorage.setItem("password", currentPassword);
        }
        
        // 保存新密码
        localStorage.setItem("password", password);
        config.password_value = password;
        
        // 将KV数据存入本地存储
        let loadedCount = 0;
        res.kvlist.forEach(item => {
          if (item.key && item.value && !item.key.endsWith("-count")) {
            localStorage.setItem(item.key, item.value);
            loadedCount++;
          }
        });
        
        // 重新加载列表
        this.loadUrlList();
        utils.showModal(`成功从KV加载 ${loadedCount} 条短链接`);
      } else {
        utils.showModal(res.error || "加载失败，请检查密码和配置", false);
      }
    } catch (err) {
      console.error("从KV加载失败:", err);
      utils.showModal("加载失败: " + (err.message || "网络错误"), false);
    } finally {
      utils.setButtonLoading(btn, false, '从KV加载');
    }
  },

  // 添加URL到列表
  addUrlToList(shortUrl, longUrl) {
    const urlList = document.querySelector("#urlList");
    const item = document.createElement('div');
    item.className = "mb-3 list-group-item d-flex align-items-center p-2";
  
    // 操作按钮容器
    const buttonGroup = document.createElement('div');
    buttonGroup.className = "d-flex align-items-center me-2";
    
    // 按钮配置
    const buttons = [
      { 
        icon: 'trash', text: '删除', 
        className: 'btn-danger btn-xs',
        onClick: () => this.deleteShortUrl(shortUrl) 
      },
      { 
        id: `copyBtn-${shortUrl}`, 
        icon: 'copy', text: '复制',
        className: 'btn-info btn-xs',
        onClick: (e) => this.handleCopyClick(e, shortUrl)
      },
      { 
        icon: 'qrcode', text: '扫码', 
        className: 'btn-secondary btn-xs',
        onClick: () => this.buildQrcode(shortUrl) 
      }
    ];
  
    // 创建按钮
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.innerHTML = `<i class="fas fa-${btn.icon} me-1"></i><span class="d-none d-md-inline">${btn.text}</span>`;
      button.className = `btn ${btn.className} btn-sm me-1`;
      button.style.padding = "0.25rem 0.5rem";
      button.style.minWidth = "60px";
      button.onclick = btn.onClick;
      if (btn.id) button.id = btn.id;
      buttonGroup.appendChild(button);
    });
  
    // 短链接容器
    const urlContainer = document.createElement('div');
    urlContainer.className = "flex-grow-1 d-flex align-items-center border rounded px-2";
    urlContainer.style.minHeight = "36px";
    urlContainer.style.overflow = "hidden";
  
    // 短链接文本
    const urlText = document.createElement('span');
    urlText.textContent = utils.buildFullUrl(shortUrl);
    urlText.className = "text-primary text-truncate w-100";
    urlText.style.cursor = "pointer";
    urlText.onclick = (e) => this.copyFromList(e, shortUrl);
  
    urlContainer.appendChild(urlText);
    item.appendChild(buttonGroup);
    item.appendChild(urlContainer);
    item.appendChild(document.createElement('div')).id = `qrcode-${shortUrl}`;
    
    // 长URL显示
    const longUrlText = buildValueTxt(longUrl);
    longUrlText.className = "form-control rounded-top-0 mt-2 small";
    item.appendChild(longUrlText);
    
    urlList.appendChild(item);
  },

  // 处理复制按钮点击
  handleCopyClick(e, shortUrl) {
    const url = utils.buildFullUrl(shortUrl);
    const copyBtn = e.currentTarget;
    utils.copyToClipboard(url, copyBtn);
  },

  // 从列表复制
  copyFromList(event, shortUrl) {
    const url = utils.buildFullUrl(shortUrl);
    const copyBtn = event.target.closest('.list-group-item').querySelector('[id^="copyBtn-"]');
    utils.copyToClipboard(url, copyBtn);
  },

  // 删除短链接
  async deleteShortUrl(key) {
    const delBtn = document.getElementById(`delBtn-${key}`);
    if (!delBtn) return;

    utils.setButtonLoading(delBtn, true);

    try {
      const response = await fetch(config.apiSrv, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: "del", key, password: config.password_value })
      });

      const res = await response.json();
      if (res.status === "200") {
        localStorage.removeItem(key);
        this.loadUrlList();
        utils.showModal("删除成功");
      } else {
        utils.showModal(res.error, false);
      }
    } catch (err) {
      console.error(err);
      utils.showModal("未知错误，请重试！", false);
    } finally {
      utils.setButtonLoading(delBtn, false);
    }
  },

  // 生成二维码
  buildQrcode(shortUrl) {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const container = $(`#qrcode-${shortUrl.replace(/([:.#[\]|=@])/g, "\\$1")}`);
    
    try {
      container.empty().addClass('qrcode-container');    
      container.qrcode({
        render: 'canvas',
        size: 192,
        minVersion: 5,
        maxVersion: 20,
        ecLevel: 'H',
        fill: darkModeMediaQuery.matches ? '#FFF' : '#2A2B2C',
        background: null,
        text: utils.buildFullUrl(shortUrl),
        radius: 4,
        quiet: 2
      });

      darkModeMediaQuery.addEventListener('change', (e) => {
        container.find('canvas').css('fill', e.matches ? '#FFF' : '#2A2B2C');
      });
    } catch (e) {
      container.html('<div class="alert alert-warning">二维码生成失败</div>');
      console.error("QR Code Error:", e);
    }
  }
};

// 辅助函数
function buildValueTxt(longUrl) {
  const valueTxt = document.createElement('div');
  valueTxt.className = "form-control rounded-top-0";
  valueTxt.textContent = longUrl;
  return valueTxt;
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 绑定按钮事件
  document.getElementById("addBtn").addEventListener('click', () => shortUrlApp.generate());
  document.getElementById("loadListBtn").addEventListener('click', () => shortUrlApp.loadUrlList());
  document.getElementById("clearlocalStgBtn").addEventListener('click', () => {
    localStorage.clear();
    document.querySelector("#longURL").value = "";
    shortUrlApp.loadUrlList();
  });

  // 从KV加载按钮
  document.getElementById("loadKV2localStgBtn")?.addEventListener('click', () => {
    shortUrlApp.loadFromKV();
  });

  // 模态框复制按钮
  document.getElementById("copyResultBtn")?.addEventListener('click', () => {
    const text = document.getElementById("result").textContent;
    utils.copyToClipboard(text);
  });

  // 初始加载
  shortUrlApp.loadUrlList();
});