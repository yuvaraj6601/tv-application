package com.digitalsignagetv.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val isBootAction = action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_LOCKED_BOOT_COMPLETED

        if (!isBootAction) {
            return
        }

        val serviceIntent = Intent(context, BootLaunchService::class.java)
        ContextCompat.startForegroundService(context, serviceIntent)
    }
}
