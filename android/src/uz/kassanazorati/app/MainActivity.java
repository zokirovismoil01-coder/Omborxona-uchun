package uz.kassanazorati.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Kassa Nazorati: veb ilovani ilova ichidagi fayllardan ochadi.
 * Sahifa https://app.kassa.local manzilida xizmat qilinadi (xavfsiz kontekst, doimiy xotira),
 * ma'lumotlar esa telefonning SQLite bazasiga KassaNative ko'prigi orqali yoziladi.
 */
public class MainActivity extends Activity {
    static final String HOST = "app.kassa.local";
    static final String START = "https://" + HOST + "/index.html";
    static final String VERSION = "2.0.0";
    static final int REQ_FILE = 41;

    private WebView web;
    private DocStore store;
    private ValueCallback<Uri[]> fileCallback;
    private WebView printView;
    /* sahifa jarayoni ketma-ket to'xtasa, cheksiz qayta ochilmasin */
    private static long lastGone;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        store = new DocStore(this);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new Bridge(), "KassaNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return asset(u.getPath());
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openExternal(u);
                return true;
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                /* sahifa jarayoni to'xtadi (masalan, xotira yetmadi): oyna qayta ochiladi, ma'lumotlar bazada saqlangan */
                long now = System.currentTimeMillis();
                if (now - lastGone < 10000) finish();
                else recreate();
                lastGone = now;
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                try {
                    Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    startActivityForResult(Intent.createChooser(i, "Zaxira faylini tanlang"), REQ_FILE);
                    return true;
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
            }
        });
        setContentView(web);
        web.loadUrl(START);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_FILE) {
            Uri[] result = null;
            if (res == RESULT_OK && data != null && data.getData() != null) result = new Uri[]{data.getData()};
            if (fileCallback != null) fileCallback.onReceiveValue(result);
            fileCallback = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__knBack && window.__knBack()) ? '1' : '0'", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if (v == null || !v.contains("1")) moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        if (store != null) store.close();
        super.onDestroy();
    }

    /* ---------- ilova ichidagi fayllar ---------- */
    private WebResourceResponse asset(String path) {
        if (path == null || path.length() == 0 || path.equals("/")) path = "/index.html";
        if (path.contains("..")) return notFound();
        try {
            InputStream in = getAssets().open("www" + path);
            WebResourceResponse r = new WebResourceResponse(mime(path), "UTF-8", in);
            Map<String, String> h = new HashMap<String, String>();
            h.put("Cache-Control", "no-store");
            r.setResponseHeaders(h);
            return r;
        } catch (IOException e) {
            return notFound();
        }
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    private static String mime(String p) {
        String l = p.toLowerCase();
        if (l.endsWith(".html")) return "text/html";
        if (l.endsWith(".js")) return "application/javascript";
        if (l.endsWith(".css")) return "text/css";
        if (l.endsWith(".woff2")) return "font/woff2";
        if (l.endsWith(".png")) return "image/png";
        if (l.endsWith(".svg")) return "image/svg+xml";
        if (l.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    private void openExternal(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception e) {
            /* brauzer topilmadi */
        }
    }

    /* ---------- fayl ulashish (CSV, zaxira nusxa) ---------- */
    private boolean share(String name, String mime, String data) {
        try {
            File dir = new File(getCacheDir(), "share");
            if (!dir.exists() && !dir.mkdirs()) return false;
            String safe = name == null ? "" : name.replaceAll("[^A-Za-z0-9._-]", "_");
            if (safe.length() == 0) safe = "fayl.txt";
            File f = new File(dir, safe);
            FileOutputStream os = new FileOutputStream(f);
            try {
                os.write(data.getBytes("UTF-8"));
            } finally {
                os.close();
            }
            final Uri uri = Uri.parse("content://" + ShareProvider.AUTHORITY + "/" + Uri.encode(safe));
            final Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime == null || mime.length() == 0 ? "text/plain" : mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.putExtra(Intent.EXTRA_SUBJECT, safe);
            send.setClipData(ClipData.newRawUri(safe, uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent c = Intent.createChooser(send, "Faylni yuborish");
                        c.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(c);
                    } catch (Exception e) {
                        /* ulashish oynasi ochilmadi */
                    }
                }
            });
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /* ---------- chop etish (Android printer xizmatlari orqali) ---------- */
    private void doPrint(String html, final String title) {
        final WebView pv = new WebView(this);
        pv.getSettings().setJavaScriptEnabled(false);
        pv.setWebViewClient(new WebViewClient() {
            private boolean done = false;

            @Override
            public void onPageFinished(WebView view, String url) {
                if (done) return;
                done = true;
                PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (pm == null) return;
                String job = title == null || title.length() == 0 ? "Kassa Nazorati" : title;
                PrintDocumentAdapter ad = view.createPrintDocumentAdapter(job);
                pm.print(job, ad, new PrintAttributes.Builder().build());
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (printView == view) printView = null;
                view.destroy();
                return true;
            }
        });
        pv.loadDataWithBaseURL("https://" + HOST + "/print/", html, "text/html", "UTF-8", null);
        printView = pv;
    }

    /* ---------- JavaScript ko'prigi ---------- */
    final class Bridge {
        @JavascriptInterface
        public String dbLoadAll() {
            return store.loadAll();
        }

        @JavascriptInterface
        public boolean dbPut(String path, String json) {
            return store.put(path, json);
        }

        @JavascriptInterface
        public void dbDel(String path) {
            store.del(path);
        }

        @JavascriptInterface
        public boolean share(String name, String mime, String data) {
            return MainActivity.this.share(name, mime, data);
        }

        @JavascriptInterface
        public boolean print(final String html, final String title) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    doPrint(html, title);
                }
            });
            return true;
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean on) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }

        @JavascriptInterface
        public boolean openUrl(final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    openExternal(Uri.parse(url));
                }
            });
            return true;
        }

        @JavascriptInterface
        public String appVersion() {
            return VERSION;
        }
    }
}
