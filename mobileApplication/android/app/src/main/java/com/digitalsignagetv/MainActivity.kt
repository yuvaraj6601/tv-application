package com.digitalsignagetv

import android.app.AlertDialog
import android.app.role.RoleManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.KeyEvent
import android.widget.Toast
import com.digitalsignagetv.boot.BootStartup
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    private var launcherPromptShown = false
    private var launcherResultPending = false
    private var bootResultPending = false
    private var launcherDialog: AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        launcherPromptShown = savedInstanceState?.getBoolean("launcherPromptShown") ?: false
        launcherResultPending = savedInstanceState?.getBoolean("launcherResultPending") ?: false
        bootResultPending = savedInstanceState?.getBoolean("bootResultPending") ?: false
        super.onCreate(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean("launcherPromptShown", launcherPromptShown)
        outState.putBoolean("launcherResultPending", launcherResultPending)
        outState.putBoolean("bootResultPending", bootResultPending)
    }

    override fun onResume() {
        super.onResume()
        if (bootResultPending) {
            bootResultPending = false
            if (BootStartup.hasPermission(this)) {
                enableBootStartup()
            } else {
                showBootHelp()
            }
        } else if (launcherResultPending) {
            launcherResultPending = false
            if (isDefaultLauncher()) {
                Toast.makeText(this, R.string.launcher_setup_success, Toast.LENGTH_LONG).show()
            } else {
                showLauncherHelp()
            }
        } else if (!launcherPromptShown && !isDefaultLauncher() &&
            !(BootStartup.isEnabled(this) && BootStartup.hasPermission(this))) {
            launcherPromptShown = true
            launcherDialog = AlertDialog.Builder(this)
                .setTitle(R.string.launcher_prompt_title)
                .setMessage(R.string.launcher_prompt_message)
                .setPositiveButton(R.string.startup_set_launcher) { _, _ -> requestLauncher() }
                .setNeutralButton(R.string.startup_open_on_boot) { _, _ -> requestBootStartup() }
                .setNegativeButton(R.string.startup_cancel, null)
                .show()
        }
    }

    private fun enableBootStartup() {
        BootStartup.enable(this)
        Toast.makeText(this, R.string.startup_boot_enabled, Toast.LENGTH_LONG).show()
    }

    private fun requestBootStartup() {
        if (BootStartup.hasPermission(this)) {
            enableBootStartup()
            return
        }
        launcherDialog = AlertDialog.Builder(this)
            .setTitle(R.string.startup_open_on_boot)
            .setMessage(R.string.startup_permission_message)
            .setPositiveButton(R.string.launcher_open_settings) { _, _ -> openBootSettings() }
            .setNegativeButton(R.string.startup_cancel, null)
            .show()
    }

    private fun openBootSettings() {
        if (launchSettings(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")), BOOT_REQUEST_CODE)) return
        if (launchSettings(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION), BOOT_REQUEST_CODE)) return
        showBootHelp()
    }

    private fun showBootHelp() {
        launcherDialog?.dismiss()
        launcherDialog = AlertDialog.Builder(this)
            .setTitle(R.string.startup_permission_missing)
            .setMessage(R.string.startup_permission_help)
            .setPositiveButton(R.string.launcher_open_settings) { _, _ -> openBootSettings() }
            .setNegativeButton(R.string.startup_cancel, null)
            .show()
    }

    private fun isDefaultLauncher(): Boolean {
        // Verify actual Home resolution: some TV firmware ignores the granted HOME role.
        val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        return packageManager.resolveActivity(homeIntent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
            ?.activityInfo?.packageName == packageName
    }

    private fun requestLauncher() {
        if (isDefaultLauncher()) {
            Toast.makeText(this, R.string.launcher_setup_success, Toast.LENGTH_LONG).show()
            return
        }
        if (isHomeRoleHeld()) {
            showLauncherOverrideHelp()
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roles = getSystemService(RoleManager::class.java)
            if (roles != null && roles.isRoleAvailable(RoleManager.ROLE_HOME) &&
                !roles.isRoleHeld(RoleManager.ROLE_HOME)) {
                if (launchLauncherSettings(roles.createRequestRoleIntent(RoleManager.ROLE_HOME))) return
            }
        }
        openHomeSettings()
    }

    private fun openHomeSettings() {
        // Some TV firmware saves our HOME role but still resolves its priority-2
        // stock launcher. Reopening Home settings in that state launches stock Home.
        if (isHomeRoleHeld() && !isDefaultLauncher()) {
            showLauncherOverrideHelp()
            return
        }
        if (launchLauncherSettings(Intent(Settings.ACTION_HOME_SETTINGS))) return
        if (launchLauncherSettings(Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS))) return
        showLauncherHelp()
    }

    private fun launchLauncherSettings(intent: Intent): Boolean {
        return launchSettings(intent, LAUNCHER_REQUEST_CODE)
    }

    @Suppress("DEPRECATION")
    private fun launchSettings(intent: Intent, requestCode: Int): Boolean {
        return try {
            startActivityForResult(intent, requestCode)
            true
        } catch (_: ActivityNotFoundException) {
            false
        } catch (_: SecurityException) {
            false
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == BOOT_REQUEST_CODE) bootResultPending = true
        if (requestCode == LAUNCHER_REQUEST_CODE) {
            // Settings screens often return CANCELED even after a successful selection.
            // Check the effective launcher when this activity is resumed instead.
            launcherResultPending = true
        }
    }

    private fun showLauncherHelp() {
        if (isHomeRoleHeld() && !isDefaultLauncher()) {
            showLauncherOverrideHelp()
            return
        }
        launcherDialog?.dismiss()
        launcherDialog = AlertDialog.Builder(this)
            .setTitle(R.string.launcher_setup_incomplete)
            .setMessage(R.string.launcher_setup_help)
            .setPositiveButton(R.string.launcher_open_settings) { _, _ -> openHomeSettings() }
            .setNegativeButton(R.string.launcher_later, null)
            .show()
    }

    private fun isHomeRoleHeld(): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            getSystemService(RoleManager::class.java)?.isRoleHeld(RoleManager.ROLE_HOME) == true

    private fun showLauncherOverrideHelp() {
        launcherDialog?.dismiss()
        launcherDialog = AlertDialog.Builder(this)
            .setTitle(R.string.launcher_overridden_title)
            .setMessage(R.string.launcher_overridden_message)
            .setPositiveButton(R.string.startup_open_on_boot) { _, _ -> requestBootStartup() }
            .setNegativeButton(R.string.startup_cancel, null)
            .show()
    }

    override fun onDestroy() {
        launcherDialog?.dismiss()
        launcherDialog = null
        super.onDestroy()
    }

    // Signage must stay on screen: swallow remote Back so it can't exit or reach JS.
    // Setup dialogs use their own window, so Back still dismisses them.
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) return true
        return super.dispatchKeyEvent(event)
    }

    override fun getMainComponentName(): String = "DigitalSignageTV"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
    }

    companion object {
        private const val LAUNCHER_REQUEST_CODE = 4101
        private const val BOOT_REQUEST_CODE = 4102
    }
}
