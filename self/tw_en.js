document.addEventListener("DOMContentLoaded", function () {
  const { defaultEncoding, translateDelay, msgToTraditionalChinese } =
    GLOBAL_CONFIG.translate;
  const msgToEnglish = "EN";
  const snackbarData = GLOBAL_CONFIG.Snackbar;
  let currentEncoding = defaultEncoding;
  const targetEncodingCookie = "translate-en-cht";
  let targetEncoding =
    saveToLocal.get(targetEncodingCookie) === undefined
      ? defaultEncoding
      : Number(saveToLocal.get("translate-en-cht"));
  let translateButtonObject;
  const isSnackbar = snackbarData !== undefined;
  const isIncludeEN = (item) => {
    const key = "/en/";
    return item.includes(key);
  };

  const nowIncludeEN = isIncludeEN(window.location.href);

  function translatePage() {
    console.log("translatePage trigger");
    let currentUrl = window.location.href;

    if (nowIncludeEN) {
      // 把文字顯示成繁體中文
      translateButtonObject.textContent = msgToTraditionalChinese;
      // 然後導向繁體中文的網址 目前網址 /en/... => /...
      let newUrl = currentUrl.replace("/en/", "/");
      console.log(`Redirect to ${newUrl}`);
      window.location.href = newUrl;
    } else {
      // 把文字顯示成英文
      translateButtonObject.textContent = msgToEnglish;
      // 然後導向英文的網址 目前網址 /... => /en/...
      let newUrl = currentUrl.replace(/^(https?:\/\/[^\/]+)(\/)?/, "$1/en/");
      console.log(`Redirect to ${newUrl}`);
      window.location.href = newUrl;
    }
  }

  function translateInitialization() {
    translateButtonObject = document.getElementById("translateLink");
    if (translateButtonObject) {
      if (nowIncludeEN) {
        translateButtonObject.textContent = msgToTraditionalChinese;
      } else {
        translateButtonObject.textContent = msgToEnglish;
      }
    }
  }

  document.addEventListener("pjax:complete", translateInitialization);

  window.translateFn = {
    translatePage,
  };

  translateInitialization();
});
