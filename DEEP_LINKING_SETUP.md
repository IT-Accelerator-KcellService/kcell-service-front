# Настройка Deep Linking для мобильных приложений

Этот документ описывает настройку deep linking для iOS и Android приложений, чтобы ссылки на заявки открывались в мобильном приложении вместо веб-браузера.

## Обзор

Система использует:
- **iOS**: Universal Links
- **Android**: App Links

Оба механизма позволяют открывать ссылки вида:
- `https://yourdomain.com?requestId=123`
- `https://yourdomain.com?requestId=123&subRequestId=456`

Если приложение установлено, ссылка откроется в приложении. Если нет - в браузере.

---

## iOS: Настройка Universal Links в Xcode

### Шаг 1: Настройка Associated Domains в Xcode

1. Откройте проект в Xcode
2. Выберите ваш **Target** → вкладка **Signing & Capabilities**
3. Нажмите **+ Capability** → выберите **Associated Domains**
4. Добавьте домен в формате:
   ```
   applinks:yourdomain.com
   ```
   Например:
   ```
   applinks:kcell-service.vercel.app
   ```
   Или для нескольких доменов:
   ```
   applinks:kcell-service.vercel.app
   applinks:savanoriu-workflow-service-front.vercel.app
   ```

### Шаг 2: Обновление apple-app-site-association файла

1. Откройте файл: `public/.well-known/apple-app-site-association`
2. Замените `TEAM_ID.BUNDLE_ID` на ваш реальный App ID:
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         {
           "appID": "ABC123XYZ.com.yourcompany.kcellservice",
           "paths": [
             "*",
             "/?requestId=*",
             "/?requestId=*&subRequestId=*"
           ]
         }
       ]
     }
   }
   ```

   **Где найти App ID:**
   - В Xcode: Target → General → Bundle Identifier
   - Team ID можно найти в Apple Developer Portal → Membership

### Шаг 3: Обработка Universal Links в приложении

Добавьте следующий код в ваш `AppDelegate.swift` или `SceneDelegate.swift`:

#### Для SwiftUI (AppDelegate):

```swift
import UIKit

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL else {
            return false
        }
        
        return handleUniversalLink(url: url)
    }
    
    private func handleUniversalLink(url: URL) -> Bool {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let queryItems = components.queryItems else {
            return false
        }
        
        // Извлекаем параметры
        let requestId = queryItems.first(where: { $0.name == "requestId" })?.value
        let subRequestId = queryItems.first(where: { $0.name == "subRequestId" })?.value
        
        // Навигация к нужному экрану
        if let requestId = requestId {
            if let subRequestId = subRequestId {
                navigateToSubRequest(requestId: requestId, subRequestId: subRequestId)
            } else {
                navigateToRequest(requestId: requestId)
            }
            return true
        }
        
        return false
    }
    
    private func navigateToRequest(requestId: String) {
        // Ваша логика навигации к заявке
        NotificationCenter.default.post(
            name: NSNotification.Name("OpenRequest"),
            object: nil,
            userInfo: ["requestId": requestId]
        )
    }
    
    private func navigateToSubRequest(requestId: String, subRequestId: String) {
        // Ваша логика навигации к подзаявке
        NotificationCenter.default.post(
            name: NSNotification.Name("OpenSubRequest"),
            object: nil,
            userInfo: [
                "requestId": requestId,
                "subRequestId": subRequestId
            ]
        )
    }
}
```

#### Для SwiftUI App:

```swift
import SwiftUI

@main
struct KcellServiceApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    handleUniversalLink(url: url)
                }
        }
    }
    
    private func handleUniversalLink(url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let queryItems = components.queryItems else {
            return
        }
        
        let requestId = queryItems.first(where: { $0.name == "requestId" })?.value
        let subRequestId = queryItems.first(where: { $0.name == "subRequestId" })?.value
        
        if let requestId = requestId {
            if let subRequestId = subRequestId {
                // Навигация к подзаявке
                navigateToSubRequest(requestId: requestId, subRequestId: subRequestId)
            } else {
                // Навигация к заявке
                navigateToRequest(requestId: requestId)
            }
        }
    }
}
```

### Шаг 4: Тестирование

1. Убедитесь, что файл `apple-app-site-association` доступен по адресу:
   ```
   https://yourdomain.com/.well-known/apple-app-site-association
   ```
   Файл должен возвращаться с `Content-Type: application/json`

2. Проверьте файл через Apple's validator:
   ```
   https://search.developer.apple.com/appsearch-validation-tool/
   ```

3. Для тестирования на устройстве:
   - Установите приложение на устройство
   - Отправьте себе ссылку через Notes или Messages
   - Нажмите на ссылку - она должна открыться в приложении

### Важные замечания для iOS:

- Universal Links работают только на реальных устройствах (не в симуляторе)
- После изменений в `apple-app-site-association` может потребоваться переустановка приложения
- Убедитесь, что домен использует HTTPS
- Файл должен быть доступен без редиректов

---

## Android: Настройка App Links в Android Studio

### Шаг 1: Настройка AndroidManifest.xml

Добавьте intent-filter в ваш `AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    ...>
    
    <!-- Существующие intent-filters -->
    
    <!-- App Links для deep linking -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <!-- Замените на ваш домен -->
        <data
            android:scheme="https"
            android:host="kcell-service.vercel.app"
            android:pathPrefix="/" />
    </intent-filter>
    
    <!-- Если у вас несколько доменов, добавьте еще один intent-filter -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <data
            android:scheme="https"
            android:host="savanoriu-workflow-service-front.vercel.app"
            android:pathPrefix="/" />
    </intent-filter>
</activity>
```

### Шаг 2: Обновление assetlinks.json файла

1. Откройте файл: `public/.well-known/assetlinks.json`
2. Замените значения на ваши:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yourcompany.kcellservice",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

**Где найти package_name:**
- В `AndroidManifest.xml`: `<manifest package="com.yourcompany.kcellservice">`
- Или в `build.gradle`: `applicationId "com.yourcompany.kcellservice"`

**Как получить SHA256 fingerprint:**

#### Для debug keystore:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### Для release keystore:
```bash
keytool -list -v -keystore /path/to/your/keystore.jks -alias your-alias
```

Скопируйте значение `SHA256:` и уберите двоеточия, оставив только буквы и цифры.

**Важно:** Для production нужно добавить fingerprint от release keystore. Для тестирования можно использовать debug fingerprint.

### Шаг 3: Обработка App Links в приложении

Добавьте обработку в вашу `MainActivity`:

```kotlin
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Обработка deep link при запуске приложения
        handleIntent(intent)
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }
    
    private fun handleIntent(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null) {
            handleDeepLink(data)
        }
    }
    
    private fun handleDeepLink(uri: Uri) {
        val requestId = uri.getQueryParameter("requestId")
        val subRequestId = uri.getQueryParameter("subRequestId")
        
        if (requestId != null) {
            if (subRequestId != null) {
                // Навигация к подзаявке
                navigateToSubRequest(requestId, subRequestId)
            } else {
                // Навигация к заявке
                navigateToRequest(requestId)
            }
        }
    }
    
    private fun navigateToRequest(requestId: String) {
        // Ваша логика навигации к заявке
        // Например, используя Navigation Component:
        // val action = HomeFragmentDirections.actionHomeToRequestDetail(requestId)
        // findNavController().navigate(action)
    }
    
    private fun navigateToSubRequest(requestId: String, subRequestId: String) {
        // Ваша логика навигации к подзаявке
    }
}
```

#### Для Jetpack Compose:

```kotlin
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext

@Composable
fun MainScreen() {
    val context = LocalContext.current
    
    LaunchedEffect(Unit) {
        // Обработка deep link при запуске
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        intent?.data?.let { handleDeepLink(it) }
    }
    
    DisposableEffect(Unit) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                intent?.data?.let { handleDeepLink(it) }
            }
        }
        context.registerReceiver(receiver, IntentFilter(Intent.ACTION_VIEW))
        onDispose { context.unregisterReceiver(receiver) }
    }
    
    // Ваш UI
}

private fun handleDeepLink(uri: Uri) {
    val requestId = uri.getQueryParameter("requestId")
    val subRequestId = uri.getQueryParameter("subRequestId")
    
    // Навигация
}
```

### Шаг 4: Тестирование

1. Убедитесь, что файл `assetlinks.json` доступен по адресу:
   ```
   https://yourdomain.com/.well-known/assetlinks.json
   ```
   Файл должен возвращаться с `Content-Type: application/json`

2. Проверьте файл через Google's validator:
   ```
   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://yourdomain.com&relation=delegate_permission/common.handle_all_urls
   ```

3. Проверка через ADB:
   ```bash
   adb shell pm get-app-links com.yourcompany.kcellservice
   ```

4. Тестирование на устройстве:
   ```bash
   adb shell am start -a android.intent.action.VIEW \
     -d "https://yourdomain.com?requestId=123" \
     com.yourcompany.kcellservice
   ```

### Важные замечания для Android:

- App Links работают только на Android 6.0 (API 23) и выше
- Для production используйте release keystore fingerprint
- После изменений в `assetlinks.json` может потребоваться переустановка приложения
- Убедитесь, что домен использует HTTPS
- Файл должен быть доступен без редиректов
- `android:autoVerify="true"` обязательно для автоматической верификации

---

## Проверка конфигурации на сервере

### Проверка доступности файлов

1. **iOS файл:**
   ```bash
   curl -I https://yourdomain.com/.well-known/apple-app-site-association
   ```
   Должен вернуть `Content-Type: application/json`

2. **Android файл:**
   ```bash
   curl -I https://yourdomain.com/.well-known/assetlinks.json
   ```
   Должен вернуть `Content-Type: application/json`

### Проверка содержимого

1. **iOS:**
   ```bash
   curl https://yourdomain.com/.well-known/apple-app-site-association
   ```

2. **Android:**
   ```bash
   curl https://yourdomain.com/.well-known/assetlinks.json
   ```

---

## Формат ссылок

Система генерирует ссылки в следующем формате:

- **Простая заявка:**
  ```
  https://yourdomain.com?requestId=123
  ```

- **Подзаявка:**
  ```
  https://yourdomain.com?requestId=123&subRequestId=456
  ```

Эти ссылки автоматически обрабатываются мобильными приложениями при правильной настройке.

---

## Troubleshooting

### iOS

1. **Ссылка открывается в браузере вместо приложения:**
   - Проверьте, что Associated Domains настроены правильно
   - Убедитесь, что App ID в файле совпадает с Bundle ID
   - Переустановите приложение
   - Проверьте, что файл доступен по HTTPS без редиректов

2. **Файл не загружается:**
   - Проверьте headers в `next.config.mjs`
   - Убедитесь, что файл находится в `public/.well-known/`

### Android

1. **Ссылка открывается в браузере вместо приложения:**
   - Проверьте, что `android:autoVerify="true"` установлен
   - Убедитесь, что SHA256 fingerprint правильный
   - Проверьте package_name в `assetlinks.json`
   - Переустановите приложение
   - Проверьте через `adb shell pm get-app-links`

2. **Верификация не проходит:**
   - Убедитесь, что файл доступен по HTTPS
   - Проверьте формат JSON (должен быть валидным)
   - Убедитесь, что fingerprint соответствует keystore

---

## Дополнительные ресурсы

- [Apple Universal Links Documentation](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Android App Links Documentation](https://developer.android.com/training/app-links)
- [Apple App Search API Validation Tool](https://search.developer.apple.com/appsearch-validation-tool/)
- [Google Digital Asset Links API](https://developers.google.com/digital-asset-links/v1/getting-started)

