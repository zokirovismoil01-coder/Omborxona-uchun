package uz.kundalik.yordamchi;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

/**
 * Veb-ilovani (assets/www) WebView ichida ochadi va unga Android imkoniyatlarini
 * "AndroidBridge" nomli JavaScript ko'prigi orqali beradi: ovozni tanish,
 * fayl saqlash, eslatmalarni rejalashtirish.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "file:///android_asset/www/index.html";

    private static final int REQ_SPEECH = 1;
    private static final int REQ_FILE_CHOOSER = 2;
    private static final int REQ_SAVE_FILE = 3;
    private static final int REQ_NOTIFICATIONS = 4;

    private static final String PREFS = "app";
    private static final String KEY_ASKED_NOTIFICATIONS = "asked_notifications";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingSaveContent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ReminderScheduler.createChannel(this);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);

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
        switch (requestCode) {
            case REQ_SPEECH:
                handleSpeechResult(resultCode, data);
                break;
            case REQ_FILE_CHOOSER:
                if (fileCallback != null) {
                    Uri[] result = null;
                    if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                        result = new Uri[]{data.getData()};
                    }
                    fileCallback.onReceiveValue(result);
                    fileCallback = null;
                }
                break;
            case REQ_SAVE_FILE:
                handleSaveResult(resultCode, data);
                break;
            default:
                break;
        }
    }

    private void handleSpeechResult(int resultCode, Intent data) {
        if (resultCode == RESULT_OK && data != null) {
            ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (results != null && !results.isEmpty() && !results.get(0).trim().isEmpty()) {
                callJs("onNativeSpeechResult", results.get(0));
            } else {
                callJs("onNativeSpeechError", "no-match");
            }
            return;
        }
        // RecognizerIntent natija kodlari: 1 — tushunilmadi, 2 — mijoz xatosi,
        // 3 — server xatosi, 4 — tarmoq xatosi, 5 — mikrofon xatosi
        String code;
        switch (resultCode) {
            case RESULT_CANCELED:
                code = "cancelled";
                break;
            case 1:
                code = "no-match";
                break;
            case 3:
                code = "server";
                break;
            case 4:
                code = "network";
                break;
            case 5:
                code = "audio";
                break;
            default:
                code = "error";
                break;
        }
        callJs("onNativeSpeechError", code);
    }

    private void handleSaveResult(int resultCode, Intent data) {
        String content = pendingSaveContent;
        pendingSaveContent = null;
        if (resultCode != RESULT_OK || data == null || data.getData() == null || content == null) {
            callJs("onNativeFileSaved", "cancelled");
            return;
        }
        try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
            if (out == null) throw new java.io.IOException("stream");
            out.write(content.getBytes(StandardCharsets.UTF_8));
            callJs("onNativeFileSaved", "saved");
        } catch (Exception e) {
            callJs("onNativeFileSaved", "error");
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_NOTIFICATIONS) {
            callJs("onNativeNotifyPermission", ReminderScheduler.notificationsAllowed(this) ? "granted" : "denied");
        }
    }

    // ---------- Bildirishnoma ruxsati ----------

    private void requestNotificationPermission() {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_ASKED_NOTIFICATIONS, true).apply();
        requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
    }

    private void openNotificationSettings() {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getPackageName()));
        }
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException ignored) {
        }
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

        /** Google ovoz tanish oynasini o'zbek tilida ochadi. */
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void startListening() {
            runOnUiThread(() -> {
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "uz-UZ")
                        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "uz-UZ")
                        .putExtra(RecognizerIntent.EXTRA_PROMPT, getString(R.string.speech_prompt))
                        .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                try {
                    startActivityForResult(intent, REQ_SPEECH);
                } catch (ActivityNotFoundException e) {
                    callJs("onNativeSpeechError", "no-recognizer");
                }
            });
        }

        /** Faylni foydalanuvchi tanlagan joyga saqlaydi (CSV, zaxira nusxa). */
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void saveFile(String name, String content, String mime) {
            runOnUiThread(() -> {
                pendingSaveContent = content;
                String type = mime == null ? "*/*" : mime.split(";")[0].trim();
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                        .addCategory(Intent.CATEGORY_OPENABLE)
                        .setType(type)
                        .putExtra(Intent.EXTRA_TITLE, name);
                try {
                    startActivityForResult(intent, REQ_SAVE_FILE);
                } catch (ActivityNotFoundException e) {
                    pendingSaveContent = null;
                    callJs("onNativeFileSaved", "error");
                }
            });
        }

        /** Barcha kelgusi eslatmalar ro'yxati: [{id, at, text}, ...] */
        @JavascriptInterface
        public void syncReminders(String json) {
            ReminderScheduler.sync(getApplicationContext(), json);
        }

        @JavascriptInterface
        public boolean notificationsAllowed() {
            return ReminderScheduler.notificationsAllowed(MainActivity.this);
        }

        /** Foydalanuvchi 🔔 tugmasini bosganda: ruxsat so'raydi yoki sozlamalarni ochadi. */
        @JavascriptInterface
        public void requestNotifications() {
            runOnUiThread(() -> {
                if (ReminderScheduler.notificationsAllowed(MainActivity.this)) {
                    callJs("onNativeNotifyPermission", "granted");
                    return;
                }
                boolean asked = getSharedPreferences(PREFS, MODE_PRIVATE)
                        .getBoolean(KEY_ASKED_NOTIFICATIONS, false);
                if (Build.VERSION.SDK_INT >= 33
                        && (!asked || shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS))) {
                    requestNotificationPermission();
                } else {
                    openNotificationSettings();
                    callJs("onNativeNotifyPermission", "settings");
                }
            });
        }

        /** Birinchi eslatma qo'shilganda bir marta ruxsat so'raydi (Android 13+). */
        @JavascriptInterface
        public void askNotificationsOnce() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT < 33 || ReminderScheduler.notificationsAllowed(MainActivity.this)) return;
                SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
                if (!prefs.getBoolean(KEY_ASKED_NOTIFICATIONS, false)) requestNotificationPermission();
            });
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
