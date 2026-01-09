# Быстрый старт: Deep Linking для мобильных приложений

## Что было сделано

Реализована поддержка deep linking для iOS и Android приложений. Теперь ссылки на заявки, отправленные через WhatsApp, будут открываться в мобильном приложении (если оно установлено), а не в браузере.

## Структура файлов

```
kcell-service-front/
├── public/
│   └── .well-known/
│       ├── apple-app-site-association    # Конфигурация для iOS
│       └── assetlinks.json               # Конфигурация для Android
├── app/
│   └── .well-known/
│       ├── apple-app-site-association/
│       │   └── route.ts                  # API route для iOS
│       └── assetlinks.json/
│           └── route.ts                  # API route для Android
└── next.config.mjs                        # Обновлен с headers для .well-known
```

## Что нужно сделать разработчикам мобильных приложений

### Для iOS разработчика:

1. **Откройте файл:** `public/.well-known/apple-app-site-association`
2. **Замените:** `TEAM_ID.BUNDLE_ID` на ваш реальный App ID (например: `ABC123XYZ.com.yourcompany.kcellservice`)
3. **В Xcode:**
   - Target → Signing & Capabilities → + Capability → Associated Domains
   - Добавьте: `applinks:yourdomain.com`
4. **Добавьте обработку Universal Links** (см. подробную документацию в `DEEP_LINKING_SETUP.md`)

### Для Android разработчика:

1. **Откройте файл:** `public/.well-known/assetlinks.json`
2. **Замените:**
   - `com.yourcompany.kcellservice` на ваш package name
   - `SHA256_FINGERPRINT_HERE` на SHA256 fingerprint вашего keystore
3. **В AndroidManifest.xml** добавьте intent-filter (см. подробную документацию)
4. **Добавьте обработку App Links** в MainActivity (см. подробную документацию)

## Как получить необходимые данные

### iOS - App ID:
- Формат: `TEAM_ID.BUNDLE_ID`
- Team ID: Apple Developer Portal → Membership
- Bundle ID: Xcode → Target → General → Bundle Identifier

### Android - Package Name:
- `AndroidManifest.xml` → `<manifest package="...">`
- Или `build.gradle` → `applicationId`

### Android - SHA256 Fingerprint:

**Debug keystore:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Release keystore:**
```bash
keytool -list -v -keystore /path/to/your/keystore.jks -alias your-alias
```

Скопируйте значение `SHA256:` (без двоеточий).

## Тестирование

### Проверка доступности файлов:

```bash
# iOS
curl https://yourdomain.com/.well-known/apple-app-site-association

# Android
curl https://yourdomain.com/.well-known/assetlinks.json
```

### Проверка на устройстве:

1. Установите приложение на устройство
2. Отправьте себе ссылку через WhatsApp или Notes
3. Нажмите на ссылку - она должна открыться в приложении

## Формат ссылок

Система автоматически генерирует ссылки в формате:
- Простая заявка: `https://yourdomain.com?requestId=123`
- Подзаявка: `https://yourdomain.com?requestId=123&subRequestId=456`

## Подробная документация

Полная документация с примерами кода находится в файле: **`DEEP_LINKING_SETUP.md`**

## Важные замечания

1. **Домен должен использовать HTTPS** - это обязательное требование
2. **Файлы должны быть доступны без редиректов**
3. **После изменений может потребоваться переустановка приложения**
4. **Для production используйте release keystore fingerprint (Android)**

## Troubleshooting

Если ссылки открываются в браузере вместо приложения:

1. Проверьте, что файлы конфигурации обновлены с правильными данными
2. Убедитесь, что файлы доступны по HTTPS
3. Переустановите приложение
4. Проверьте логи приложения на наличие ошибок

Для подробной информации см. раздел Troubleshooting в `DEEP_LINKING_SETUP.md`.

