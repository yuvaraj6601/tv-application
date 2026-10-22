package com.digitalsignagetv

import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    private var startupPromptShown = false
    private var startupResultPending = false
    private var startupDialog: AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        startupPromptShown = savedInstanceState?.getBoolean("startupPromptShown") ?: false
        startupResultPending = savedInstanceState?.getBoolean("startupResultPending") ?: false
        super.onCreate(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean("startupPromptShown", startupPromptShown)
        outState.putBoolean("startupResultPending", startupResultPending)
    }

    override fun onResume() {
        super.onResume()
        if (startupResultPending) {
            startupResultPending = false
            if (canStartAtBoot()) {
                Toast.makeText(this, R.string.startup_permission_enabled, Toast.LENGTH_LONG).show()
            } else {
                showStartupHelp()
            }
        } else if (!startupPromptShown && !canStartAtBoot()) {
            startupPromptShown = true
            startupDialog = AlertDialog.Builder(this)
                .setTitle(R.string.startup_prompt_title)
                .setMessage(R.string.startup_prompt_message)
                .setPositiveButton(R.string.startup_enable) { _, _ -> openStartupSettings() }
                .setNegativeButton(R.string.startup_later, null)
                .show()
        }
    }

    private fun canStartAtBoot(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || Settings.canDrawOverlays(this)

    private fun openStartupSettings() {
        val settingsIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$packageName"))
        if (openSettings(settingsIntent)) return
        if (openSettings(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION))) return
        showStartupHelp()
    }

    @Suppress("DEPRECATION")
    private fun openSettings(intent: Intent): Boolean = try {
        startActivityForResult(intent, STARTUP_REQUEST_CODE)
        true
    } catch (_: ActivityNotFoundException) {
        false
    } catch (_: SecurityException) {
        false
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == STARTUP_REQUEST_CODE) startupResultPending = true
    }

    private fun showStartupHelp() {
        startupDialog?.dismiss()
        startupDialog = AlertDialog.Builder(this)
            .setTitle(R.string.startup_help_title)
            .setMessage(R.string.startup_help_message)
            .setPositiveButton(R.string.startup_enable) { _, _ -> openStartupSettings() }
            .setNegativeButton(R.string.startup_later, null)
            .show()
    }

    override fun onDestroy() {
        startupDialog?.dismiss()
        startupDialog = null
        super.onDestroy()
    }

    override fun getMainComponentName(): String = "DigitalSignageTV"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
    }

    companion object {
        private const val STARTUP_REQUEST_CODE = 4102
    }
}
