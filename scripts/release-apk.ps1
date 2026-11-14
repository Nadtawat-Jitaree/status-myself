# ============================================================
#  NJ Notes — APK Release Script
#  ใช้: .\scripts\release-apk.ps1 -Version "3.1"
#  หรือ: .\scripts\release-apk.ps1 -Version "3.1" -SkipBuild
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [switch]$SkipBuild,     # ข้ามขั้นตอน npm build + gradle (ถ้า APK build ไว้แล้ว)
    [switch]$SkipWebBuild,  # ข้ามแค่ npm run build (แต่ยัง build APK)
    [switch]$DryRun         # แสดงผลเท่านั้น ไม่ upload จริง
)

# ── Config ───────────────────────────────────────────────────
$REPO         = "Nadtawat-Jitaree/status-myself"
$JAVA_HOME    = "C:\Program Files\Java\jdk-22"
$PROJECT_ROOT = $PSScriptRoot | Split-Path -Parent
$APK_SRC      = "$PROJECT_ROOT\android\app\build\outputs\apk\debug\app-debug.apk"
$APK_NAME     = "NJ-Notes-v$Version.apk"
$TAG          = "v$Version"
$TOKEN_FILE   = "$PROJECT_ROOT\.github-token"   # เก็บ token ใน file (gitignore แล้ว)

# ── Colors ──────────────────────────────────────────────────
function Info  { param($msg) Write-Host "  $msg" -ForegroundColor Cyan }
function OK    { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Err   { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red; exit 1 }
function Title { param($msg) Write-Host "`n━━━ $msg ━━━" -ForegroundColor Magenta }

# ── Load Token ───────────────────────────────────────────────
Title "🔑 GitHub Token"
if (Test-Path $TOKEN_FILE) {
    $GH_TOKEN = (Get-Content $TOKEN_FILE -Raw).Trim()
    OK "โหลด token จาก .github-token"
} else {
    $GH_TOKEN = Read-Host "ป้อน GitHub PAT token (ghp_...)"
    if ($GH_TOKEN -notmatch "^ghp_") { Err "Token ไม่ถูกต้อง" }
    # บันทึกสำหรับครั้งหน้า
    $GH_TOKEN | Set-Content $TOKEN_FILE
    OK "บันทึก token ลงไฟล์ .github-token (gitignore แล้ว)"
}

$HEADERS = @{
    Authorization = "token $GH_TOKEN"
    Accept        = "application/vnd.github+json"
}

# ── Validate token ───────────────────────────────────────────
try {
    $me = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $HEADERS
    OK "Login เป็น: $($me.login)"
} catch {
    Err "Token ไม่ถูกต้องหรือหมดอายุ — กรุณาลบไฟล์ .github-token แล้วรันใหม่"
}

Set-Location $PROJECT_ROOT

# ── Step 1: npm build ────────────────────────────────────────
if (-not $SkipBuild -and -not $SkipWebBuild) {
    Title "📦 Step 1/4 — Next.js Build"
    npm run build
    if ($LASTEXITCODE -ne 0) { Err "npm run build ล้มเหลว" }
    OK "Next.js build สำเร็จ"
} else {
    Warn "ข้าม Next.js build (SkipBuild/SkipWebBuild)"
}

# ── Step 2: cap sync ─────────────────────────────────────────
if (-not $SkipBuild) {
    Title "🔄 Step 2/4 — Capacitor Sync"
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { Err "cap sync ล้มเหลว" }
    OK "Capacitor sync สำเร็จ"
} else {
    Warn "ข้าม Capacitor sync (SkipBuild)"
}

# ── Step 3: Gradle build ─────────────────────────────────────
if (-not $SkipBuild) {
    Title "🤖 Step 3/4 — Gradle Build APK"
    $env:JAVA_HOME = $JAVA_HOME
    Set-Location "$PROJECT_ROOT\android"
    .\gradlew assembleDebug
    if ($LASTEXITCODE -ne 0) { Err "Gradle build ล้มเหลว" }
    Set-Location $PROJECT_ROOT
    OK "APK build สำเร็จ"
} else {
    Warn "ข้าม Gradle build (SkipBuild)"
}

# ── ตรวจว่ามี APK ────────────────────────────────────────────
if (-not (Test-Path $APK_SRC)) {
    Err "ไม่พบไฟล์ APK ที่: $APK_SRC"
}
$apkSize = [math]::Round((Get-Item $APK_SRC).Length / 1MB, 1)
OK "APK พร้อม: $apkSize MB"

if ($DryRun) {
    Warn "DryRun mode — หยุดที่นี่ ไม่ upload จริง"
    exit 0
}

# ── Step 4: GitHub Release + Upload ─────────────────────────
Title "🚀 Step 4/4 — GitHub Release"

# ตรวจว่า tag นี้มีอยู่แล้วไหม
Info "ตรวจสอบ tag $TAG ..."
try {
    $existingRelease = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/$REPO/releases/tags/$TAG" `
        -Headers $HEADERS
    Warn "Release $TAG มีอยู่แล้ว (ID: $($existingRelease.id)) — จะ upload asset เพิ่ม"
    $releaseId  = $existingRelease.id
    $uploadBase = "https://uploads.github.com/repos/$REPO/releases/$releaseId/assets"
} catch {
    # สร้าง Release ใหม่
    Info "สร้าง Release $TAG ใหม่ ..."
    $releaseBody = @"
## NJ Notes $TAG

### สิ่งที่เปลี่ยนแปลง
- Performance: ลด auth/DB calls ต่อ navigation จาก 4 ครั้ง → 1 ครั้ง
- WebView: Hardware acceleration + DOM Storage + Cache mode
- Session: ไม่ต้อง login ใหม่เมื่อปัดแอปทิ้ง
- Native Google Sign-In

### วิธีติดตั้ง
1. ดาวน์โหลด **$APK_NAME** ด้านล่าง
2. เปิด **การตั้งค่า → ความปลอดภัย → แหล่งที่มาที่ไม่รู้จัก** (อนุญาต)
3. เปิดไฟล์ APK แล้วติดตั้ง
"@
    $newRelease = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/$REPO/releases" `
        -Method POST `
        -Headers $HEADERS `
        -Body (@{
            tag_name         = $TAG
            target_commitish = "main"
            name             = "NJ Notes $TAG"
            body             = $releaseBody
            draft            = $false
            prerelease       = $false
        } | ConvertTo-Json) `
        -ContentType "application/json"
    $releaseId  = $newRelease.id
    $uploadBase = "https://uploads.github.com/repos/$REPO/releases/$releaseId/assets"
    OK "สร้าง Release สำเร็จ (ID: $releaseId)"
}

# Upload APK
Info "กำลัง upload $APK_NAME ($apkSize MB) ..."
$uploadUrl  = "$($uploadBase)?name=$APK_NAME"
$apkBytes   = [System.IO.File]::ReadAllBytes($APK_SRC)
$uploadResp = Invoke-RestMethod `
    -Uri $uploadUrl `
    -Method POST `
    -Headers @{
        Authorization  = "token $GH_TOKEN"
        Accept         = "application/vnd.github+json"
        "Content-Type" = "application/vnd.android.package-archive"
    } `
    -Body $apkBytes

$downloadUrl = $uploadResp.browser_download_url
OK "Upload สำเร็จ!"
Info "Download URL: $downloadUrl"

# ── อัปเดต DownloadAPKButton.tsx ─────────────────────────────
Title "📝 อัปเดต DownloadAPKButton"
$btnFile = "$PROJECT_ROOT\components\DownloadAPKButton.tsx"
$btnContent = Get-Content $btnFile -Raw

# แทนที่ URL เดิม (รองรับทั้ง GitHub URL และ local path)
$newContent = $btnContent -replace 'href="https://github\.com[^"]+\.apk"', "href=`"$downloadUrl`""
$newContent = $newContent -replace 'download="[^"]*\.apk"', "download=`"$APK_NAME`""
# อัปเดต version badge
$newContent = $newContent -replace '(v\d+\.\d+)', $TAG

$newContent | Set-Content $btnFile -NoNewline
OK "อัปเดต DownloadAPKButton.tsx แล้ว"

# ── Git commit + push ────────────────────────────────────────
Title "📤 Git Push"
git add components/DownloadAPKButton.tsx
git commit -m "release: APK $TAG → GitHub Releases"
git push origin main
if ($LASTEXITCODE -eq 0) {
    OK "Push สำเร็จ → Vercel จะ deploy อัตโนมัติ"
} else {
    Warn "Push มีปัญหา — ตรวจสอบ git status ด้วยตัวเอง"
}

# ── สรุป ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  🎉 NJ Notes $TAG Release เสร็จสมบูรณ์!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  📦 APK:  $downloadUrl" -ForegroundColor White
Write-Host "  🌐 Web:  https://github.com/$REPO/releases/tag/$TAG" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
