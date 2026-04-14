document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('applicationForm');
  const categorySelect = document.getElementById('category');
  const aiFieldGroup = document.getElementById('aiFieldGroup');
  const aiCheckboxes = document.querySelectorAll('input[name="usedAI"]');
  const aiOtherCheck = document.getElementById('aiOtherCheck');
  const usedAIOtherText = document.getElementById('usedAIOtherText');
  const generateBtn = document.getElementById('generateBtn');
  const outputSection = document.getElementById('outputSection');
  const outputText = document.getElementById('outputText');
  const copyBtn = document.getElementById('copyBtn');
  const toast = document.getElementById('toast');
  const loader = document.getElementById('loader');
  const btnText = generateBtn.querySelector('span');

  // Change details label based on category
  const detailsLabel = document.getElementById('detailsLabel');

  // GAS Web App URL
  // 稼働させるには、Google Apps Scriptで発行したWebアプリのURLをここに設定します。
  // 空文字またはYOUR_GAS_WEBAPP_URL_HEREのままだと送信ステップはスキップされます。
  const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw6gAnFX8pthrHcncNqBxw86bHTTBSVZzBHhvOm272Ny7wPdMI4mLuuqeDZ7GOFlw/exec";

  // Check if category is a practical report
  const isPracticalReport = (val) => ['案件応募', '案件受注', 'マネタイズ報告', 'LINEスタンプ制作'].includes(val);

  categorySelect.addEventListener('change', (e) => {
    const val = e.target.value;

    const detailsField = document.getElementById('details');
    const dynamicSpecificFields = document.getElementById('dynamicSpecificFields');
    const countGroup = document.getElementById('countGroup');
    const categoryGroup = document.getElementById('categoryGroup');
    const categoryGroupLabel = document.getElementById('categoryGroupLabel');
    const platformGroupLabel = document.getElementById('platformGroupLabel');
    const amountGroup = document.getElementById('amountGroup');
    const amountGroupLabel = document.getElementById('amountGroupLabel');

    // Change label text dynamically
    document.getElementById('lineStampSpecificFields').classList.add('hidden');
    document.getElementById('detailsGroup').classList.remove('hidden');

    if (val === '案件応募') {
      dynamicSpecificFields.classList.remove('hidden');
      countGroup.classList.remove('hidden');
      categoryGroup.classList.remove('hidden');
      categoryGroupLabel.innerHTML = '案件カテゴリ<span class="required">*</span>';
      platformGroup.classList.remove('hidden');
      platformGroupLabel.innerHTML = '応募媒体<span class="required">*</span>';
      amountGroup.classList.add('hidden');

      detailsLabel.innerHTML = 'ひとこと<span class="required">*</span>';
      detailsField.placeholder = "面談希望、連絡待ちなどひとことご記入ください";
    } else if (val === '案件受注' || val === 'マネタイズ報告') {
      dynamicSpecificFields.classList.remove('hidden');
      countGroup.classList.add('hidden');
      categoryGroup.classList.remove('hidden');
      platformGroup.classList.remove('hidden');
      amountGroup.classList.remove('hidden');

      if (val === '案件受注') {
        categoryGroupLabel.innerHTML = '案件カテゴリ<span class="required">*</span>';
        platformGroupLabel.innerHTML = '受注媒体<span class="required">*</span>';
        amountGroupLabel.innerHTML = '受注金額：（非公開でもOK）';
      } else {
        categoryGroupLabel.innerHTML = '収益カテゴリ<span class="required">*</span>';
        platformGroupLabel.innerHTML = '媒体（プラットフォーム）<span class="required">*</span>';
        amountGroupLabel.innerHTML = '収益金額：（非公開でもOK）';
      }

      detailsLabel.innerHTML = 'ひとこと<span class="required">*</span>';
      detailsField.placeholder = "取引先の反応や工夫した点などひとことご記入ください";
    } else {
      dynamicSpecificFields.classList.add('hidden');
      if (val === 'LINEスタンプ制作') {
        document.getElementById('lineStampSpecificFields').classList.remove('hidden');
        document.getElementById('detailsGroup').classList.add('hidden');
      } else {
        detailsLabel.innerHTML = '詳細情報<span class="required">*</span>';
        detailsField.placeholder = "媒体名、場所、またはその他の自由記述をご記入ください";
      }
    }

    // Highlight AI field if it's a practical report
    if (isPracticalReport(val)) {
      aiFieldGroup.classList.add('highlight-field');
    } else {
      aiFieldGroup.classList.remove('highlight-field');
    }
  });

  // Checkbox group other toggle helper
  function setupOtherToggle(checkId, textId) {
    const checkElem = document.getElementById(checkId);
    const textElem = document.getElementById(textId);
    if (!checkElem || !textElem) return;
    checkElem.addEventListener('change', (e) => {
      if (e.target.checked) {
        textElem.classList.remove('hidden');
        textElem.focus();
      } else {
        textElem.classList.add('hidden');
      }
    });
  }

  // Setup UI toggles
  setupOtherToggle('aiOtherCheck', 'usedAIOtherText');
  setupOtherToggle('appCategoryOtherCheck', 'appCategoryOtherText');
  setupOtherToggle('appPlatformOtherCheck', 'appPlatformOtherText');

  function showToast(message, type = 'error') {
    toast.textContent = message;
    if (type === 'success') {
      toast.classList.add('toast-success');
    } else {
      toast.classList.remove('toast-success');
    }
    toast.classList.remove('hidden');
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 400);
    }, 3000);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userName = document.getElementById('userName').value.trim();
    const category = categorySelect.value;
    let details = document.getElementById('details').value.trim();

    // LINEスタンプ用のフィールドを取得
    const stampTheme = document.getElementById('stampTheme') ? document.getElementById('stampTheme').value.trim() : '';
    const stampImpression = document.getElementById('stampImpression') ? document.getElementById('stampImpression').value.trim() : '';
    const stampMessage = document.getElementById('stampMessage') ? document.getElementById('stampMessage').value.trim() : '';

    if (category === 'LINEスタンプ制作') {
      details = `▷ スタンプのテーマ・コンセプト：\n${stampTheme}\n\n▷ 作成してみての感想・工夫した点：\n${stampImpression}\n\n▷ これからチャレンジする方へひとこと：\n${stampMessage}`;
    }

    // 案件応募用フィールド等
    const appCount = document.getElementById('appCount').value.trim();
    const appAmountElem = document.getElementById('appAmount');
    const appAmount = appAmountElem ? appAmountElem.value.trim() : '';

    // Helper to gather checkbox data
    function getCheckboxData(name, otherTextId) {
      const cbs = document.querySelectorAll(`input[name="${name}"]`);
      const otherTextInput = document.getElementById(otherTextId);
      const otherText = otherTextInput ? otherTextInput.value.trim() : '';
      let selected = [];
      let hasOther = false;
      cbs.forEach(cb => {
        if (cb.checked) {
          if (cb.value === 'その他') {
            hasOther = true;
            if (otherText) selected.push(otherText);
          } else {
            selected.push(cb.value);
          }
        }
      });
      return { value: selected.join(', '), hasOther, otherText };
    }

    const aiData = getCheckboxData('usedAI', 'usedAIOtherText');
    const usedAI = aiData.value;

    const catData = getCheckboxData('appCategory', 'appCategoryOtherText');
    const appCategory = catData.value;

    const platData = getCheckboxData('appPlatform', 'appPlatformOtherText');
    const appPlatform = platData.value;

    // Custom Validation
    if (!userName || !category) {
      showToast('お名前とカテゴリを選択してください。');
      return;
    }

    if (category === 'LINEスタンプ制作') {
      if (!stampTheme || !stampImpression || !stampMessage) {
        showToast('スタンプのすべての詳細項目を入力してください。');
        return;
      }
    } else if (!details) {
      showToast('詳細情報を入力してください。');
      return;
    }

    if (category === '案件応募' && (!appCount || !appCategory || !appPlatform)) {
      showToast('応募件数、カテゴリ、媒体を入力してください。');
      return;
    }

    if ((category === '案件受注' || category === 'マネタイズ報告') && (!appCategory || !appPlatform)) {
      showToast('カテゴリと媒体を選択してください。');
      return;
    }

    if (aiData.hasOther && !aiData.otherText) {
      showToast('その他のAI名をご記入ください。');
      document.getElementById('usedAIOtherText').focus();
      return;
    }

    if (category === '案件応募' || category === '案件受注' || category === 'マネタイズ報告') {
      if (catData.hasOther && !catData.otherText) {
        showToast('その他のカテゴリをご記入ください。');
        document.getElementById('appCategoryOtherText').focus();
        return;
      }
      if (platData.hasOther && !platData.otherText) {
        showToast('その他の媒体をご記入ください。');
        document.getElementById('appPlatformOtherText').focus();
        return;
      }
    }

    if (isPracticalReport(category) && !usedAI) {
      showToast('AI ONEの実践報告には、使用したAIの選択が必須です！');
      return;
    } else if (!usedAI) {
      showToast('使用したAIを選択してください。');
      return;
    }

    // Show Loading
    generateBtn.disabled = true;
    loader.classList.remove('loader-hidden');
    btnText.style.opacity = '0';

    try {
      // 1. Generate formatted text
      let formattedText = '';
      let gasDetails = details;

      if (category === '案件応募') {
        formattedText = `📩【応募報告】
▷ 本日の応募件数：${appCount}
▷ 案件カテゴリ：${appCategory}
▷ 応募媒体：${appPlatform}
▷ 使用AI：${usedAI}
▷ ひとこと：${details}`;
        gasDetails = `応募件数: ${appCount}\nカテゴリ: ${appCategory}\n媒体: ${appPlatform}\nひとこと: ${details}`;
      } else if (category === '案件受注') {
        formattedText = `📩【案件受注報告】
▷ 案件カテゴリ：${appCategory}
▷ 受注媒体：${appPlatform}
▷ 受注金額：${appAmount || '非公開'}
▷ 使用AI：${usedAI}
▷ ひとこと：${details}`;
        gasDetails = `カテゴリ: ${appCategory}\n媒体: ${appPlatform}\n受注金額: ${appAmount || '非公開'}\nひとこと: ${details}`;
      } else if (category === 'マネタイズ報告') {
        formattedText = `📩【マネタイズ報告】
▷ 収益カテゴリ：${appCategory}
▷ 媒体：${appPlatform}
▷ 収益金額：${appAmount || '非公開'}
▷ 使用AI：${usedAI}
▷ ひとこと：${details}`;
        gasDetails = `カテゴリ: ${appCategory}\n媒体: ${appPlatform}\n収益金額: ${appAmount || '非公開'}\nひとこと: ${details}`;
      } else if (category === 'LINEスタンプ制作') {
        formattedText = `📩【LINEスタンプ制作報告】\n●使用AI：${usedAI}\n\n${details}`;
        gasDetails = details;
      } else {
        const titleCategory = category.endsWith('報告') ? category : category + '報告';
        formattedText = `【${titleCategory}】
●使用AI：${usedAI}
●詳細・感想：
${details}`;
      }

      outputText.value = formattedText;
      outputSection.classList.remove('hidden');

      showToast('テキストを生成しました！', 'success');

      // 2. Mock POST request to GAS if configured
      if (GAS_WEBAPP_URL && GAS_WEBAPP_URL !== "YOUR_GAS_WEBAPP_URL_HERE") {
        const payload = {
          userName: userName,
          category: category,
          usedAI: usedAI,
          details: gasDetails,
          timestamp: new Date().toISOString()
        };

        // 確実な送信のため、fetchではなく隠しformとiframeを使用する（CORS完全回避）
        const iframeId = 'hidden_iframe_for_gas';
        if (!document.getElementById(iframeId)) {
          const iframe = document.createElement('iframe');
          iframe.name = iframeId;
          iframe.id = iframeId;
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
        }

        const form = document.createElement('form');
        form.action = GAS_WEBAPP_URL;
        form.method = 'POST';
        form.target = iframeId;
        form.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'payload';
        input.value = JSON.stringify(payload);

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();

        // クリーンアップ
        setTimeout(() => form.remove(), 1000);
      }

    } catch (error) {
      showToast('エラーが発生しました。');
      console.error(error);
    } finally {
      // 擬似的なローディング遅延（UX向上のため）
      setTimeout(() => {
        generateBtn.disabled = false;
        loader.classList.add('loader-hidden');
        btnText.style.opacity = '1';

        // スクロールして結果を見せる
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 500);
    }
  });

  copyBtn.addEventListener('click', () => {
    outputText.select();
    document.execCommand('copy');

    // Modern clipboard API fallback
    if (navigator.clipboard) {
      navigator.clipboard.writeText(outputText.value);
    }

    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> コピー完了！`;
    copyBtn.style.color = '#10B981';

    setTimeout(() => {
      copyBtn.innerHTML = originalText;
      copyBtn.style.color = '';
    }, 2000);
  });
});
