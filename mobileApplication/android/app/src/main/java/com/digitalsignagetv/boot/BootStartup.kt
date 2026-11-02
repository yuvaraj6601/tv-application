package com.digitalsignagetv.boot

import android.content.Context
import android.os.Build
import android.provider.Settings

object BootStartup {
    fun hasPermission(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || Settings.canDrawOverlays(context)

    fun isEnabled(context: Context): Boolean =
        context.getSharedPreferences("startup", Context.MODE_PRIVATE)
            .getBoolean("openOnBoot", false)

    fun enable(context: Context) {
        context.getSharedPreferences("startup", Context.MODE_PRIVATE)
            .edit().putBoolean("openOnBoot", true).apply()
    }
}
