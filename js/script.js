// 自分自身のHTMLファイル名（またはパス）を動的に設定する関数
function setupSelfLink() {
  const siteTitleLink = document.getElementById('site-title');
  if (siteTitleLink) {
    const currentFileName = window.location.pathname.split('/').pop() || './';
    siteTitleLink.href = currentFileName;
  }
}

// メニューとアプリの初期化
async function initApp() {
  const container = document.getElementById('app');
  const tocContainer = document.getElementById('toc');
  
  container.innerHTML = '';
  tocContainer.innerHTML = '<h2>メニュー</h2><p>読み込み中...</p>';

  try {
    const response = await fetch('md_menu.csv' + `?t=${new Date().getTime()}`);
    if (!response.ok) throw new Error('md_menu.csv が見つかりません。');
    
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    const tocList = document.createElement('ul');
    const cacheBuster = `?t=${new Date().getTime()}`;

    let hasItems = false;

    for (const line of lines) {
      const cols = line.split(',').map(col => col.trim());
      const fileName = cols[0];
      const fileDate = cols[1] || '';

      if (fileName === 'ファイル名' || !fileName.endsWith('.md')) {
        continue;
      }

      hasItems = true;
      const baseName = fileName.substring(0, fileName.lastIndexOf('.'));

      // メニュー項目の作成
      const tocItem = document.createElement('li');
      const tocDateHtml = fileDate ? `<span class="toc-date">${fileDate}</span>` : '';
      
      const tocLink = document.createElement('a');
      tocLink.href = '#';
      tocLink.innerHTML = `<span class="toc-filename">${baseName}</span>${tocDateHtml}`;
      
      // リンクをクリックしたときの処理
      tocLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await loadAndDisplayMarkdown(fileName, baseName, fileDate, cacheBuster);
        
        // スマホなどでクリック後に内容へスクロールさせたい場合は有効化
        // container.scrollIntoView({ behavior: 'smooth' });
      });

      tocItem.appendChild(tocLink);
      tocList.appendChild(tocItem);
    }

    if (!hasItems) {
      tocContainer.innerHTML = '<p>読み込み可能なマークダウンファイルが見つかりませんでした。</p>';
    } else {
      tocContainer.style.display = 'block';
      tocContainer.innerHTML = '<h2>メニュー</h2>';
      tocContainer.appendChild(tocList);
      container.innerHTML = '<p class="placeholder-text">上のメニューから項目を選択してください。</p>';
    }

  } catch (error) {
    tocContainer.style.display = 'none';
    container.innerHTML = `<div class="error-message">エラー: ${error.message}</div>`;
  }
}

// 選択された個別のマークダウンファイルを読み込んで表示する関数
async function loadAndDisplayMarkdown(fileName, baseName, fileDate, cacheBuster) {
  const container = document.getElementById('app');
  container.innerHTML = '読み込み中...';

  try {
    const mdResponse = await fetch(`${fileName}${cacheBuster}`);
    if (!mdResponse.ok) throw new Error(`${fileName} の読み込みに失敗しました`);
    
    let mdText = await mdResponse.text();

    // HTMLタグを使って中央揃えタイトルを指定
    mdText = `<h1 style="text-align: center;">${baseName}</h1>\n\n` + mdText;
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

    const metaDateHtml = fileDate ? `<span class="md-meta-date">更新日時: ${fileDate}</span>` : '';

    const article = document.createElement('article');
    article.className = 'md-content';

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
      <div class="back-to-top-container">
        <a href="#" class="btn-back-to-top">▲ メニューに戻る</a>
      </div>
    `;

    // 「戻る」ボタンの挙動（クリックしたら内容を消して初期メッセージに戻すか、メニューへスクロール）
    const backBtn = article.querySelector('.btn-back-to-top');
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      container.innerHTML = '<p class="placeholder-text">上のメニューから項目を選択してください。</p>';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    container.innerHTML = '';
    container.appendChild(article);

  } catch (error) {
    container.innerHTML = `<div class="error-message">エラー: ${error.message}</div>`;
  }
}

// ページ読み込み完了時に実行
document.addEventListener('DOMContentLoaded', () => {
  setupSelfLink();
  initApp();
});

