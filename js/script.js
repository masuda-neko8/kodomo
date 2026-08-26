// 自分自身のHTMLファイル名（またはパス）を動的に設定する関数
function setupSelfLink() {
  const siteTitleLink = document.getElementById('site-title');
  if (siteTitleLink) {
    // 現在のURLのパスからファイル名（例: "memo.html" や "index.html"）を取得
    const currentFileName = window.location.pathname.split('/').pop() || './';
    
    // hrefに設定
    siteTitleLink.href = currentFileName;
  }
}

async function loadMarkdownFiles() {
  const container = document.getElementById('app');
  const tocContainer = document.getElementById('toc');
  
  container.innerHTML = '読み込み中...';
  tocContainer.innerHTML = '';

  try {
    const response = await fetch('md_menu.csv' + `?t=${new Date().getTime()}`);
    if (!response.ok) throw new Error('md_menu.csv が見つかりません。');
    
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    container.innerHTML = ''; 

    const tocList = document.createElement('ul');
    let fileIndex = 0;

    // キャッシュ回避用のタイムスタンプ
    const cacheBuster = `?t=${new Date().getTime()}`;

    for (const line of lines) {
      const cols = line.split(',').map(col => col.trim());
      const fileName = cols[0];
      const fileDate = cols[1] || '';

      if (fileName === 'ファイル名' || !fileName.endsWith('.md')) {
        continue;
      }

      // マークダウンファイル自体にも cacheBuster を付与して最新版を強制取得
      const mdResponse = await fetch(`${fileName}${cacheBuster}`);
      if (!mdResponse.ok) {
        console.warn(`${fileName} の読み込みに失敗しました`);
        continue;
      }
      
      let mdText = await mdResponse.text();

      // 拡張子を除いたベース名を取得（例: "aaa.md" -> "aaa"）
      const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
      
      // HTMLタグを使って中央揃えタイトルを指定
      mdText = `<h1 style="text-align: center;">${baseName}</h1>\n\n` + mdText;

      // マークダウンをHTMLに変換
      const htmlContent = marked.parse(mdText);

      // 画像の判定と設定
      const targetImgPath = `${baseName}.jpg`;
      const fallbackImgPath = 'title_bg.jpg';

      let imageSrc = fallbackImgPath;
      try {
        const imgCheck = await fetch(`${targetImgPath}${cacheBuster}`, { method: 'HEAD' });
        if (imgCheck.status === 200) {
          imageSrc = targetImgPath;
        }
      } catch (e) {
        imageSrc = fallbackImgPath;
      }

      const sectionId = `section-${fileIndex}`;

      // 1つの .md を囲むボックスを作成
      const article = document.createElement('article');
      article.className = 'md-content';
      article.id = sectionId;

      // 日時表示用HTML
      const metaDateHtml = fileDate ? `<span class="md-meta-date">更新日時: ${fileDate}</span>` : '';

      article.innerHTML = `
        <div class="md-header-image">
          <img src="${imageSrc}${cacheBuster}" alt="${baseName}" onerror="this.onerror=null; this.src='${fallbackImgPath}${cacheBuster}';">
        </div>
        <div class="md-meta-info">
          ${metaDateHtml}
        </div>
        <div class="md-body">
          ${htmlContent}
        </div>
        <!-- 各表示の最後に「戻る」ボタンを追加 -->
        <div class="back-to-top-container">
          <a href="#" class="btn-back-to-top">▲ 戻る</a>
        </div>
      `;
      
      container.appendChild(article);

      // 目次項目の作成
      const tocItem = document.createElement('li');
      const tocDateHtml = fileDate ? `<span class="toc-date">${fileDate}</span>` : '';
      
      tocItem.innerHTML = `<a href="#${sectionId}">
        <span class="toc-filename">${baseName}</span>
        ${tocDateHtml}
      </a>`;
      
      tocList.appendChild(tocItem);

      fileIndex++;
    }

    if (container.children.length === 0) {
      container.innerHTML = '<p>読み込み可能なマークダウンファイルが見つかりませんでした。</p>';
      tocContainer.style.display = 'none';
    } else {
      tocContainer.style.display = 'block';
      tocContainer.innerHTML = '<h2>メニュー</h2>';
      tocContainer.appendChild(tocList);
    }

  } catch (error) {
    container.innerHTML = `<div class="error-message">エラー: ${error.message}</div>`;
    tocContainer.style.display = 'none';
  }
}

// ページ読み込み完了時に一括実行（末尾にあった重複のイベントリスナーは削除）
document.addEventListener('DOMContentLoaded', () => {
  setupSelfLink();
  loadMarkdownFiles();
});
