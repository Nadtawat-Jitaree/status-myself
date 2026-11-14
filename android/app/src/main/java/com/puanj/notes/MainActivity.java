package com.puanj.notes;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ── Cookie Setup ──────────────────────────────────────────────
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // ── WebView Performance Tweaks ────────────────────────────
            WebSettings settings = webView.getSettings();

            // เปิด DOM Storage (localStorage, sessionStorage)
            settings.setDomStorageEnabled(true);
            // เปิด Database storage API
            settings.setDatabaseEnabled(true);
            // ใช้ Cache ที่มีอยู่ก่อน ถ้าไม่หมดอายุ จะไม่ยิง network ซ้ำ
            settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
            // เปิด JavaScript (ต้องมีแน่นอนอยู่แล้ว แต่ให้ชัดเจน)
            settings.setJavaScriptEnabled(true);
            // ให้ render ก่อน layout เสร็จได้ (ลด white flash)
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);
            // เปิด smooth scrolling
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            // Hardware layer สำหรับ GPU compositing
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            Log.i("NJNotes", "WebView performance settings applied");
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // บันทึก Cookies จาก RAM ลงสู่ Disk ทันทีเมื่อผู้ใช้สลับแอปหรือเตรียมปัดแอปทิ้ง
        CookieManager.getInstance().flush();
    }

    @Override
    public void onStop() {
        super.onStop();
        CookieManager.getInstance().flush();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        CookieManager.getInstance().flush();
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle == null) {
                Log.i("Google Activity Result", "SocialLogin login handle is null");
                return;
            }
            Plugin plugin = pluginHandle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
                Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
                return;
            }
            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
        }
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
