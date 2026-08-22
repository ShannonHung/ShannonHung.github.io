// Obsidian / GitHub 風格 callout（> [!TIP] 標題）的轉換器。
// 依 CLAUDE.md 的規則走 inject.bottom，不動 themes/butterfly 原始碼。
//
// markdown-it 把
//
//   > [!TIP] 標題
//   > 內容
//
// 渲染成 <blockquote><p>[!TIP] 標題<br>內容</p></blockquote>，
// 這支腳本在瀏覽器端把它改寫成 .callout 結構，配色與 icon 由 /self/callout.css 負責。
(function () {
  // icon 用 SVG inline，避免依賴 fontawesome 是否載入。stroke 走 currentColor，
  // 顏色就跟著 CSS 的 --callout-color 走。
  var STROKE =
    'fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"';

  var TYPES = {
    // 燈泡
    TIP:
      '<path d="M9 18h6M10 22h4"/>' +
      '<path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    // 三角形驚嘆號
    WARNING:
      '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>' +
      '<path d="M12 9v4M12 17h.01"/>',
    // 筆
    NOTE:
      '<path d="M12 20h9"/>' +
      '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    // 圓框驚嘆號
    IMPORTANT:
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16h.01"/>',
    // 八角警示
    CAUTION:
      '<path d="M8.6 2h6.8L22 8.6v6.8L15.4 22H8.6L2 15.4V8.6L8.6 2z"/>' +
      '<path d="M12 8v5M12 16h.01"/>'
  };

  function icon(type) {
    return (
      '<svg class="callout-icon" viewBox="0 0 24 24" ' + STROKE +
      ' aria-hidden="true">' + TYPES[type] + '</svg>'
    );
  }

  // 從 blockquote 第一個 <p> 的開頭抓出 [!TYPE]，並把它連同後面的標題文字切下來。
  // 回傳 { type, title } 或 null。會直接修改該 <p>（移除標記與標題那一行）。
  function extract(p) {
    // 只看第一個 text node，避免把內文裡剛好提到 [!TIP] 的字誤判。
    var first = p.firstChild;
    if (!first || first.nodeType !== Node.TEXT_NODE) return null;

    var m = /^\s*\[!([A-Za-z]+)\]\s*/.exec(first.nodeValue);
    if (!m) return null;

    var type = m[1].toUpperCase();
    if (!TYPES[type]) return null;

    // 切掉標記本身，剩下的同一行文字就是標題。
    first.nodeValue = first.nodeValue.slice(m[0].length);

    // 標題延伸到第一個 <br>（或整個 <p> 結束）為止，中間可能夾著 <code>、<a> 等元素。
    var title = document.createDocumentFragment();
    while (p.firstChild) {
      var node = p.firstChild;
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
        p.removeChild(node); // <br> 本身不留，後面的內容變成 body 第一行
        break;
      }
      title.appendChild(node);
    }

    return { type: type, title: title };
  }

  function transform(bq) {
    if (bq.classList.contains('callout')) return; // pjax 重入時避免重複處理

    var p = bq.querySelector('p');
    if (!p || p.parentNode !== bq) return; // 標記必須在最外層第一段

    var found = extract(p);
    if (!found) return;

    // 標題被抽走後如果整段空了（只有 > [!TIP] 標題、沒有內容），就把空的 <p> 移掉。
    if (!p.textContent.trim() && !p.querySelector('img, code, a')) p.remove();

    var titleEl = document.createElement('div');
    titleEl.className = 'callout-title';
    titleEl.innerHTML = icon(found.type);
    var text = document.createElement('span');
    text.appendChild(found.title);
    if (text.textContent.trim()) titleEl.appendChild(text);

    var body = document.createElement('div');
    body.className = 'callout-body';
    while (bq.firstChild) body.appendChild(bq.firstChild);
    // 只有標題沒有內容時，剩下的多半是換行造成的空白 text node，
    // CSS 的 :empty 選不到，所以直接把整個 body 拿掉。
    if (!body.textContent.trim() && !body.querySelector('img, svg, pre, table, hr')) {
      body = null;
    }

    bq.appendChild(titleEl);
    if (body) bq.appendChild(body);
    bq.classList.add('callout', 'callout-' + found.type.toLowerCase());
  }

  function run() {
    document.querySelectorAll('blockquote').forEach(transform);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // Butterfly 開 pjax 時頁面切換不會重跑 DOMContentLoaded。
  document.addEventListener('pjax:complete', run);
})();
