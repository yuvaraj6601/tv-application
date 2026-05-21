package com.digitalsignagetv.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.digitalsignagetv.MainActivity

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val isBootAction = action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_LOCKED_BOOT_COMPLETED

        if (!isBootAction) {
            return
        }

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        context.startActivity(launchIntent)
    }
}
