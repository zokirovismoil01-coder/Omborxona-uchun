package uz.kundalik.yordamchi;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Eslatma vaqti kelganda AlarmManager chaqiradi. */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        ReminderScheduler.showNotification(context,
                intent.getStringExtra(ReminderScheduler.EXTRA_ID),
                intent.getStringExtra(ReminderScheduler.EXTRA_TEXT));
    }
}
