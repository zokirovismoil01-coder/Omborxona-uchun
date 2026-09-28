package uz.kundalik.yordamchi;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Vazifa eslatmalarini AlarmManager orqali rejalashtiradi, shunda ilova
 * yopiq bo'lsa ham vaqti kelganda bildirishnoma chiqadi.
 */
final class ReminderScheduler {

    static final String CHANNEL_ID = "eslatmalar";
    static final String EXTRA_ID = "id";
    static final String EXTRA_TEXT = "text";

    private static final String PREFS = "reminders";
    private static final String KEY_LIST = "list";

    private ReminderScheduler() {
    }

    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                context.getString(R.string.channel_name), NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(context.getString(R.string.channel_description));
        channel.enableVibration(true);
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    static boolean notificationsAllowed(Context context) {
        if (Build.VERSION.SDK_INT >= 33
                && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return context.getSystemService(NotificationManager.class).areNotificationsEnabled();
    }

    /** Eski eslatmalarni bekor qilib, yangi ro'yxatni rejalashtiradi va saqlaydi. */
    static synchronized void sync(Context context, String json) {
        JSONArray next;
        try {
            next = new JSONArray(json);
        } catch (JSONException e) {
            return;
        }
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray previous = parse(prefs.getString(KEY_LIST, "[]"));
        for (int i = 0; i < previous.length(); i++) {
            JSONObject o = previous.optJSONObject(i);
            if (o != null) cancel(context, o.optString("id"));
        }
        prefs.edit().putString(KEY_LIST, next.toString()).apply();
        scheduleAll(context, next);
    }

    /** Telefon qayta yoqilganda yoki ilova yangilanganda chaqiriladi. */
    static synchronized void rescheduleSaved(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        scheduleAll(context, parse(prefs.getString(KEY_LIST, "[]")));
    }

    private static JSONArray parse(String json) {
        try {
            return new JSONArray(json);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static void scheduleAll(Context context, JSONArray list) {
        long now = System.currentTimeMillis();
        for (int i = 0; i < list.length(); i++) {
            JSONObject o = list.optJSONObject(i);
            if (o == null) continue;
            String id = o.optString("id");
            long at = o.optLong("at");
            if (id.isEmpty() || at <= now) continue;
            schedule(context, id, at, o.optString("text"));
        }
    }

    private static PendingIntent pendingIntent(Context context, String id, String text, int flags) {
        Intent intent = new Intent(context, ReminderReceiver.class)
                // Har bir eslatma o'z manziliga ega bo'lishi uchun
                .setData(Uri.parse("kundalik://reminder/" + Uri.encode(id)))
                .putExtra(EXTRA_ID, id)
                .putExtra(EXTRA_TEXT, text);
        return PendingIntent.getBroadcast(context, 0, intent, flags | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void schedule(Context context, String id, long at, String text) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        PendingIntent pi = pendingIntent(context, id, text, PendingIntent.FLAG_UPDATE_CURRENT);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
        try {
            if (exact) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            }
        } catch (SecurityException e) {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    private static void cancel(Context context, String id) {
        if (id == null || id.isEmpty()) return;
        PendingIntent pi = pendingIntent(context, id, "", PendingIntent.FLAG_NO_CREATE);
        if (pi != null) {
            context.getSystemService(AlarmManager.class).cancel(pi);
            pi.cancel();
        }
    }

    @SuppressWarnings("deprecation")
    static void showNotification(Context context, String id, String text) {
        if (!notificationsAllowed(context)) return;
        createChannel(context);

        Intent open = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(context, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context)
                        .setPriority(Notification.PRIORITY_HIGH)
                        .setDefaults(Notification.DEFAULT_ALL);
        builder.setSmallIcon(R.drawable.ic_notification)
                .setColor(context.getColor(R.color.brand))
                .setContentTitle(context.getString(R.string.reminder_title))
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setCategory(Notification.CATEGORY_REMINDER)
                .setContentIntent(content)
                .setAutoCancel(true)
                .setShowWhen(true);

        context.getSystemService(NotificationManager.class)
                .notify(id == null ? 0 : id.hashCode(), builder.build());
    }
}
