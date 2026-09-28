package uz.kassanazorati.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Ilova ma'lumotlari: har bir hujjat (yo'l -> JSON matn) SQLite jadvalida.
 * Veb ilovadagi mahalliy baza (LocalDB) shu yerga yozadi.
 */
final class DocStore extends SQLiteOpenHelper {
    DocStore(Context c) {
        super(c, "kassa.db", null, 1);
        setWriteAheadLoggingEnabled(true); // har bir chek tezroq yoziladi
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE docs (path TEXT PRIMARY KEY, json TEXT NOT NULL)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldV, int newV) {
        /* hozircha bitta versiya */
    }

    /** Barcha hujjatlar JSON obyekt sifatida; bazani o'qib bo'lmasa null (ilova xato oynasini ko'rsatadi). */
    synchronized String loadAll() {
        try {
            JSONObject out = new JSONObject();
            Cursor c = getReadableDatabase().rawQuery("SELECT path, json FROM docs", null);
            try {
                while (c.moveToNext()) {
                    try {
                        out.put(c.getString(0), c.getString(1));
                    } catch (JSONException e) {
                        /* buzilgan qator tashlab ketiladi */
                    }
                }
            } finally {
                c.close();
            }
            return out.toString();
        } catch (RuntimeException e) {
            return null;
        }
    }

    synchronized boolean put(String path, String json) {
        if (path == null || json == null) return false;
        try {
            ContentValues v = new ContentValues();
            v.put("path", path);
            v.put("json", json);
            return getWritableDatabase().insertWithOnConflict("docs", null, v, SQLiteDatabase.CONFLICT_REPLACE) != -1;
        } catch (Exception e) {
            return false;
        }
    }

    synchronized void del(String path) {
        if (path == null) return;
        try {
            getWritableDatabase().delete("docs", "path=?", new String[]{path});
        } catch (Exception e) {
            /* e'tiborsiz */
        }
    }
}
