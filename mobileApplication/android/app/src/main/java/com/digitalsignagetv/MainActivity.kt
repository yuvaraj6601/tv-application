package com.digitalsignagetv

import android.app.AlertDialog
import android.app.role.RoleManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    private var launcherPromptShown = false
    private var launcherResultPending = false
    private var launcherDialog: AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        launcherPromptShown = savedInstanceState?.getBoolean("launcherPromptShown") ?: false
        launcherResultPending = savedInstanceState?.getBoolean("launcherResultPending") ?: false
        super.onCreate(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean("launcherPromptShown", launcherPromptShown)
        outState.putBoolean("launcherResultPending", launcherResultPending)
    }

    override fun onResume() {
        super.onResume()
        if (launcherResultPending) {
            launcherResultPending = false
            if (isDefaultLauncher()) {
                Toast.makeText(this, R.string.launcher_setup_success, Toast.LENGTH_LONG).show()
            } else {
                showLauncherHelp()
            }
        } else if (!launcherPromptShown && !isDefaultLauncher()) {
            launcherPromptShown = true
            launcherDialog = AlertDialog.Builder(this)
                .setTitle(R.string.launcher_prompt_title)
                .setMessage(R.string.launcher_prompt_message)
                .setPositiveButton(R.string.launcher_yes) { _, _ -> requestLauncher() }
                .setNegativeButton(R.string.launcher_later, null)
                .show()
        }
    }

    private fun isDefaultLauncher(): Boolean {
        // Verify actual Home resolution: some TV firmware ignores the granted HOME role.
        val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        return packageManager.resolveActivity(homeIntent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
            ?.activityInfo?.packageName == packageName
    }

    private fun requestLauncher() {
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
        if (launchLauncherSettings(Intent(Settings.ACTION_HOME_SETTINGS))) return
        if (launchLauncherSettings(Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS))) return
        showLauncherHelp()
    }

    @Suppress("DEPRECATION")
    private fun launchLauncherSettings(intent: Intent): Boolean {
        return try {
            startActivityForResult(intent, LAUNCHER_REQUEST_CODE)
            true
        } catch (_: ActivityNotFoundException) {
            false
        } catch (_: SecurityException) {
            false
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == LAUNCHER_REQUEST_CODE) {
            // Settings screens often return CANCELED even after a successful selection.
            // Check the effective launcher when this activity is resumed instead.
            launcherResultPending = true
        }
    }

    private fun showLauncherHelp() {
        launcherDialog?.dismiss()
        launcherDialog = AlertDialog.Builder(this)
            .setTitle(R.string.launcher_setup_incomplete)
            .setMessage(R.string.launcher_setup_help)
            .setPositiveButton(R.string.launcher_open_settings) { _, _ -> openHomeSettings() }
            .setNegativeButton(R.string.launcher_later, null)
            .show()
    }

    override fun onDestroy() {
        launcherDialog?.dismiss()
        launcherDialog = null
        super.onDestroy()
    }

    override fun getMainComponentName(): String = "DigitalSignageTV"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
    }

    companion object {
        private const val LAUNCHER_REQUEST_CODE = 4101
    }
}
