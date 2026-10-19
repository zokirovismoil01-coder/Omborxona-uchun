package uz.baliqxona.oylik;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Veb-ilovani (assets/www) WebView ichida ochadi va unga Android imkoniyatlarini
 * "AndroidBridge" nomli JavaScript ko'prigi orqali beradi: fayl saqlash (Excel, zaxira),
 * ulashish, chop etish va ma'lumotlarning ilova faylidagi nusxasi.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "file:///android_asset/www/index.html";
    private static final String STATE_FILE = "state.json";

    private static final int REQ_FILE_CHOOSER = 1;
    private static final int REQ_SAVE_FILE = 2;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingSaveBytes;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowContentAccess(false);

        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("file".equals(uri.getScheme())) return false;
                // Tashqi havolalar brauzerda ochiladi
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }
        });
        webView.setWebChromeClient(new ChromeClient());
        webView.loadUrl(START_URL);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        // Avval veb-ilovaga imkon beramiz (masalan, ochiq oynani yopish)
        webView.evaluateJavascript(
                "(window.onNativeBack && window.onNativeBack()) ? 1 : 0",
                value -> {
                    if (!"1".equals(value)) super.onBackPressed();
                });
    }

    /** JavaScript'dagi window.<fn>(arg) funksiyasini xavfsiz chaqiradi. */
    private void callJs(String fn, String arg) {
        runOnUiThread(() -> {
            if (webView == null) return;
            String js = "window." + fn + " && window." + fn + "(" + JSONObject.quote(arg) + ")";
            webView.evaluateJavascript(js, null);
        });
    }

    // ---------- Natijalar ----------

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE_CHOOSER) {
            if (fileCallback != null) {
                Uri[] result = null;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                    result = new Uri[]{data.getData()};
                }
                fileCallback.onReceiveValue(result);
                fileCallback = null;
            }
        } else if (requestCode == REQ_SAVE_FILE) {
            handleSaveResult(resultCode, data);
        }
    }

    private void handleSaveResult(int resultCode, Intent data) {
        byte[] bytes = pendingSaveBytes;
        pendingSaveBytes = null;
        if (resultCode != RESULT_OK || data == null || data.getData() == null || bytes == null) {
            callJs("onNativeFileSaved", "cancelled");
            return;
        }
        try (OutputStream out = openForWrite(data.getData())) {
            if (out == null) throw new IOException("stream");
            out.write(bytes);
            callJs("onNativeFileSaved", "saved");
        } catch (Exception e) {
            callJs("onNativeFileSaved", "error");
        }
    }

    /** "wt" — faylni qayta yozish (eski mazmun qolmasin); ba'zi provayderlar faqat "w" ni biladi. */
    private OutputStream openForWrite(Uri uri) throws IOException {
        try {
            return getContentResolver().openOutputStream(uri, "wt");
        } catch (IllegalArgumentException | IOException e) {
            return getContentResolver().openOutputStream(uri, "w");
        }
    }

    /** Foydalanuvchiga "Qayerga saqlash" oynasini ochadi; tanlangach baytlar yoziladi. */
    @SuppressWarnings("deprecation")
    private void startSave(String name, byte[] bytes, String mime) {
        runOnUiThread(() -> {
            pendingSaveBytes = bytes;
            String type = mime == null || mime.isEmpty() ? "*/*" : mime.split(";")[0].trim();
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(type)
                    .putExtra(Intent.EXTRA_TITLE, name);
            try {
                startActivityForResult(intent, REQ_SAVE_FILE);
            } catch (ActivityNotFoundException e) {
                pendingSaveBytes = null;
                callJs("onNativeFileSaved", "error");
            }
        });
    }

    // ---------- Ma'lumotlarning ilova faylidagi nusxasi ----------

    private File stateFile() {
        return new File(getFilesDir(), STATE_FILE);
    }

    private synchronized void writeState(String json) {
        File target = stateFile();
        if (json == null || json.isEmpty()) {
            //noinspection ResultOfMethodCallIgnored
            target.delete();
            return;
        }
        // Avval vaqtinchalik faylga yozib, so'ng almashtiramiz — yozish uzilsa ham eski nusxa butun qoladi
        File tmp = new File(getFilesDir(), STATE_FILE + ".tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            out.write(json.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        } catch (IOException e) {
            //noinspection ResultOfMethodCallIgnored
            tmp.delete();
            return;
        }
        if (!tmp.renameTo(target)) {
            //noinspection ResultOfMethodCallIgnored
            target.delete();
            //noinspection ResultOfMethodCallIgnored
            tmp.renameTo(target);
        }
    }

    private synchronized String readState() {
        File f = stateFile();
        if (!f.exists()) return "";
        try (InputStream in = new FileInputStream(f)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "";
        }
    }

    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int n;
        while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
        return buf.toByteArray();
    }

    // ---------- WebChromeClient: fayl tanlash va dialoglar ----------

    private class ChromeClient extends WebChromeClient {
        @Override
        @SuppressWarnings("deprecation")
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                         FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("*/*");
            try {
                startActivityForResult(Intent.createChooser(intent, getString(R.string.choose_backup)),
                        REQ_FILE_CHOOSER);
                return true;
            } catch (ActivityNotFoundException e) {
                fileCallback = null;
                return false;
            }
        }

        @Override
        public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
            new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton(R.string.ok, (d, w) -> result.confirm())
                    .setOnCancelListener(d -> result.cancel())
                    .show();
            return true;
        }

        @Override
        public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
            new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton(R.string.yes, (d, w) -> result.confirm())
                    .setNegativeButton(R.string.no, (d, w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel())
                    .show();
            return true;
        }
    }

    // ---------- JavaScript ko'prigi ----------

    private class Bridge {

        /** Matnli faylni (zaxira nusxa) foydalanuvchi tanlagan joyga saqlaydi. */
        @JavascriptInterface
        public void saveFile(String name, String content, String mime) {
            startSave(name, content == null ? new byte[0] : content.getBytes(StandardCharsets.UTF_8), mime);
        }

        /** Ikkilik faylni (Excel) base64 ko'rinishida qabul qilib saqlaydi. */
        @JavascriptInterface
        public void saveFileBase64(String name, String base64, String mime) {
            byte[] bytes;
            try {
                bytes = Base64.decode(base64, Base64.DEFAULT);
            } catch (IllegalArgumentException e) {
                callJs("onNativeFileSaved", "error");
                return;
            }
            startSave(name, bytes, mime);
        }

        /** APK ichidagi faylni (masalan, Excel shablon) foydalanuvchiga saqlab beradi. */
        @JavascriptInterface
        public void saveAsset(String assetPath, String name, String mime) {
            try (InputStream in = getAssets().open(assetPath)) {
                startSave(name, readAll(in), mime);
            } catch (IOException e) {
                callJs("onNativeFileSaved", "error");
            }
        }

        /** Telegram, SMS va boshqa ilovalar orqali matn ulashish. */
        @JavascriptInterface
        public void shareText(String title, String text) {
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND)
                        .setType("text/plain")
                        .putExtra(Intent.EXTRA_SUBJECT, title)
                        .putExtra(Intent.EXTRA_TEXT, text);
                try {
                    startActivity(Intent.createChooser(send, getString(R.string.share_title)));
                } catch (ActivityNotFoundException ignored) {
                }
            });
        }

        /** Joriy sahifani chop etish yoki PDF sifatida saqlash (qaydnoma uchun). */
        @JavascriptInterface
        public void printPage(String jobName) {
            runOnUiThread(() -> {
                if (webView == null) return;
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                if (pm == null) return;
                String job = jobName == null || jobName.isEmpty() ? getString(R.string.app_name) : jobName;
                PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(job);
                PrintAttributes attrs = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4.asLandscape())
                        .build();
                pm.print(job, adapter, attrs);
            });
        }

        /** Ma'lumotlarning zaxira nusxasi ilova fayliga yoziladi (WebView xotirasi o'chsa ham qoladi). */
        @JavascriptInterface
        public void saveState(String json) {
            writeState(json);
        }

        @JavascriptInterface
        public String loadState() {
            return readState();
        }

        @JavascriptInterface
        public String appVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }
    }
}
