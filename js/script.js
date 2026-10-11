// 日付を yyyy/mm/dd 形式にフォーマットし、2週間以内なら赤字の「New」を付ける補助関数
function formatDateWithNew(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}/${mm}/${dd}`;

  // 14日以内（2週間以内）か判定
  const now = new Date();
  const diffTime = now - date;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const isNew = diffDays >= 0 && diffDays <= 14;

  if (isNew) {
    return `<span style="color: red; font-weight: bold; margin-right: 5px;">New</span>${formattedDate}`;
  }
  return formattedDate;
}

// 各ファイルの最終更新日時（Last-Modified）を取得する補助関数
async function fetchFileDate(fileName, cacheBuster) {
  try {
    const res = await fetch(`${fileName}${cacheBuster}`, { method: 'HEAD' });
    const lastModified = res.headers.get('Last-Modified');
    if (lastModified) {
      return new Date(lastModified);
    }
  } catch (e) {
    console.error(`${fileName} の日付取得に失敗しました`, e);
  }
  return null;
}

// 自分自身のHTMLファイル名（またはパス）を動的に設定する関数
function setupSelfLink() {
  const siteTitleLink = document.getElementById('site-title');
  if (siteTitleLink) {
    const currentFileName = window.location.pathname.split('/').pop() || './';
    siteTitleLink.href = currentFileName;
  }
}

// リロードするたびにランダムでトップ画像を設定する関数
function setRandomImage() {
  const imgElement = document.getElementById('top-image');
  if (!imgElement) return;

  // 1〜5 のランダムな整数を生成する
  const imageNumber = Math.floor(Math.random() * 5) + 1;

  // 画像のパスをランダムに決定した番号に変更する
  imgElement.src = `top_img${imageNumber}.jpg`;
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
      const fileName = cols[0]; // fileNameのみ取得（fileDateは読み込まない）

      if (fileName === 'ファイル名' || !fileName.endsWith('.md')) {
        continue;
      }

      hasItems = true;
      const baseName = fileName.substring(0, fileName.lastIndexOf('.'));

      // 実際のファイル自体の更新日時を取得
      const fileDateObj = await fetchFileDate(fileName, cacheBuster);
      const dateDisplayStr = formatDateWithNew(fileDateObj);

      // メニュー項目の作成
      const tocItem = document.createElement('li');
      const tocDateHtml = dateDisplayStr ? `<span class="toc-date">${dateDisplayStr}</span>` : '';
      
      const tocLink = document.createElement('a');
      tocLink.href = '#';
      tocLink.innerHTML = `<span class="toc-filename">${baseName}</span>${tocDateHtml}`;
      
      // リンクをクリックしたときの処理
      tocLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const rawDateStr = fileDateObj ? fileDateObj.toISOString() : '';
        await loadAndDisplayMarkdown(fileName, baseName, rawDateStr, cacheBuster);
        
        // 追加：読み込んだ記事エリアの先頭までスムーズにスクロールする
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      container.innerHTML = '<p class="placeholder-text">上のメニューから項目を選択してください。なお「New」は14日以内の更新。</p>';
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

    // 記事内の日付表示のフォーマット（必要に応じてyyyy/mm/dd形式へ）
    let formattedMetaDate = '';
    if (fileDate) {
      const d = new Date(fileDate);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        formattedMetaDate = `${yyyy}/${mm}/${dd}`;
      }
    }

    const metaDateHtml = formattedMetaDate ? `<span class="md-meta-date">更新日時: ${formattedMetaDate}</span>` : '';

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
      container.innerHTML = '<p class="placeholder-text">上のメニューから項目を選択してください。なお「New」は14日以内の更新。</p>';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    container.innerHTML = '';
    container.appendChild(article);

  } catch (error) {
    container.innerHTML = `<div class="error-message">エラー: ${error.message}</div>`;
  }
}

// ページ読み込み完了時に実行
document.addEventListener('DOMContentLoaded', async () => {
  setupSelfLink();
  
  // 1. まずメニューとアプリの初期化を行う（メニューリストを表示するため）
  await initApp();

  // ▼ ページが読み込まれるたびにランダム画像を設定
  setRandomImage();

  // 2. URLのクエリパラメータ（例: ?page=④.開催日一覧.md）をチェックする
  const urlParams = new URLSearchParams(window.location.search);
  const targetPage = urlParams.get('page');

  if (targetPage) {
    const cacheBuster = `?t=${new Date().getTime()}`;
    try {
      const response = await fetch('md_menu.csv' + cacheBuster);
      const csvText = await response.text();
      const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

      for (const line of lines) {
        const cols = line.split(',').map(col => col.trim());
        const fileName = cols[0];

        if (fileName === targetPage) {
          const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
          // 実ファイルの更新日時を取得
          const fileDateObj = await fetchFileDate(fileName, cacheBuster);
          const rawDateStr = fileDateObj ? fileDateObj.toISOString() : '';

          // 該当ページを自動読み込み
          await loadAndDisplayMarkdown(fileName, baseName, rawDateStr, cacheBuster);
          
          // 自動的にその記事の位置までスクロール
          const container = document.getElementById('app');
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    } catch (e) {
      console.error('直接指定されたページの読み込みに失敗しました', e);
    }
  }
});

