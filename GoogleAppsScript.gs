/**
 * AI ONE ポイント申請ログ・ジェネレーター用
 * Google Apps Script (GAS) テンプレート
 * 
 * =====================================
 * 準備・設定手順：
 * =====================================
 * 1. Googleスプレッドシートを新規作成し、シート名を「ログ一覧」などに適宜変更します。（デフォルトは「シート1」）
 * 2. スプレッドシートの1行目を以下のヘッダーとして設定してください。
 *    ・A1: タイムスタンプ
 *    ・B1: お名前
 *    ・C1: 使用AI  <-- ※ご要望の通り、左から3番目に配置しています！アナリティクス確認用。
 *    ・D1: 申請項目
 *    ・E1: 詳細情報
 * 3. スプレッドシート上部のメニューから [拡張機能] > [Apps Script] を開きます。
 * 4. エディタに記述されている元のコードを全て消去し、このファイルの内容を貼り付けて保存します。
 * 5. 以下の「SHEET_NAME」を、1で設定したシート名に変更してください。
 * 6. 画面右上の [デプロイ] > [新しいデプロイ] をクリックします。
 *    - 種類の選択: 「ウェブアプリ」の歯車アイコンをクリック
 *    - アクセスできるユーザー: 「全員」に設定して「デプロイ」を実行
 * 7. 発行された「ウェブアプリのURL」をコピーし、
 *    Webアプリ側の main.js にある `GAS_WEBAPP_URL` 変数に貼り付けてください。
 */

// ▼▼▼ シート名をここに入力 ▼▼▼
const SHEET_NAME = 'シート1';

function doPost(e) {
  try {
    // Webアプリから送られたデータを取得
    // 安全で確実なアプリケーションフォーム送信対応
    const payloadStr = (e.parameter && e.parameter.payload) ? e.parameter.payload : e.postData.contents;
    const data = JSON.parse(payloadStr);
    
    const timestamp = new Date();
    const userName = data.userName || '';
    const usedAI = data.usedAI || '';
    const category = data.category || '';
    const details = data.details || '';
    
    // スプレッドシートのシートを取得
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`シート「${SHEET_NAME}」が見つかりませんでした。設定を確認してください。`);
    }
    
    // ▼常に一番上（2行目）に新しい行を追加して書き込む
    sheet.insertRowBefore(2);
    
    const newRowData = [timestamp, userName, usedAI, category, details];
    // 2行目のA〜E列にデータをセット
    sheet.getRange(2, 1, 1, newRowData.length).setValues([newRowData]);
    
    // 追加した2行目のF列・G列に「空のチェックボックス」を自動で書き出す
    sheet.getRange(2, 6, 1, 2).insertCheckboxes();
    
    // 成功レスポンスを返す（CORS対応）
    return ContentService.createTextOutput(JSON.stringify({
      result: "success", 
      message: "スプレッドシートに記録しました"
    })).setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // エラーレスポンスを返す
    return ContentService.createTextOutput(JSON.stringify({
      result: "error", 
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// OPTIONSリクエスト（CORSのプレフライトリクエスト）対応
function doOptions(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  return ContentService.createTextOutput("")
    .setHeaders(headers);
}
