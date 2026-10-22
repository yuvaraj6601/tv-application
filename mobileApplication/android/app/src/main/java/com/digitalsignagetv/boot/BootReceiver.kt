package com.digitalsignagetv.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.ActivityNotFoundException
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.digitalsignagetv.MainActivity

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // React Native and the saved playlist require unlocked credential storage.
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) {
            return
        }

        // Android 10+ restricts activity starts from background receivers. This
        // user-granted permission is a documented exception; no overlay is drawn.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !Settings.canDrawOverlays(context)) {
            Log.w("SignageBoot", "Startup skipped: display-over-other-apps permission is required")
            return
        }

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        try {
            context.startActivity(launchIntent)
            Log.i("SignageBoot", "Requested signage activity after boot")
        } catch (error: SecurityException) {
            Log.e("SignageBoot", "TV policy rejected startup", error)
        } catch (error: ActivityNotFoundException) {
            Log.e("SignageBoot", "Signage activity is unavailable", error)
        }
    }
}
