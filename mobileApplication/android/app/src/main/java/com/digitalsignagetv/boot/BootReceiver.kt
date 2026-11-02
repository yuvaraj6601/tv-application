package com.digitalsignagetv.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.ActivityNotFoundException
import android.util.Log
import com.digitalsignagetv.MainActivity

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // Wait for credential storage, and only start after explicit opt-in.
        if (intent.action != Intent.ACTION_BOOT_COMPLETED ||
            !BootStartup.isEnabled(context) || !BootStartup.hasPermission(context)) {
            return
        }

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        try {
            context.startActivity(launchIntent)
        } catch (error: SecurityException) {
            Log.e("SignageBoot", "TV policy rejected startup", error)
        } catch (error: ActivityNotFoundException) {
            Log.e("SignageBoot", "Signage activity is unavailable", error)
        }
    }
}
