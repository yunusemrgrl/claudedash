# Slice S1 — Activity Stats: Real Usage Data

## S1-T1
Area: Server
Priority: critical
Depends: -
Description: `/usage` endpoint'ini gerçek verilerle besle. `~/.claude/stats-cache.json` dosyasını oku (varsa). Döndür: totalSessions, totalMessages, modelUsage (inputTokens, outputTokens, cacheReadInputTokens by model), dailyActivity (son 7 gün: date, messageCount, sessionCount, toolCallCount), hourCounts, firstSessionDate, longestSession. Bu veri her zaman mevcut (dosya Claude Code tarafından yazılıyor). Dosya yoksa 404 dön.
AC: `curl http://localhost:4317/usage` gerçek stats-cache.json verisini döndürüyor. dailyActivity, modelUsage, totalMessages alanları mevcut.

## S1-T2
Area: Server
Priority: high
Depends: S1-T1
Description: `GET /activity/sessions` endpoint ekle. `~/.claude/usage-data/session-meta/` klasöründeki tüm JSON dosyalarını oku. Her biri: session_id, project_path, start_time, duration_minutes, user_message_count, tool_counts, languages, git_commits, input_tokens, output_tokens, lines_added içeriyor. Son 20 session'ı start_time'a göre sıralayıp döndür.
AC: `curl http://localhost:4317/activity/sessions` session listesi döndürüyor. Her session'da proje adı, süre, mesaj sayısı, token bilgisi var.

## S1-T3
Area: Dashboard
Priority: critical
Depends: S1-T1
Description: Top bar'daki usage widget'ını gerçek veriyle güncelle. Şu an widget hep gizli çünkü `usage.json` yok. Yeni `/usage` endpoint'i (stats-cache.json) gerçek veri döndürdüğünden widget artık görünür olacak. Widget: "14.7K msgs · 37 sessions" formatında bugün değil toplam göstersin. Hover tooltip'te: model breakdown (Sonnet/Opus), dailyActivity son 7 gün özeti, firstSessionDate.
AC: Top bar'da her zaman kullanım özeti görünüyor. Tooltip'te model bazında token breakdown var.

# Slice S2 — Activity View (Yeni Tab)

## S2-T1
Area: Dashboard
Priority: critical
Depends: S1-T1, S1-T2
Description: Dashboard'a "Activity" sekmesi ekle (Radio/ClipboardList/GitBranch'in yanına, BarChart2 ikonu). Bu view: (1) Summary cards: Total Sessions, Total Messages, Lines Added, Git Commits — tüm zamanlar. (2) Son 7 günün bar chart'ı: her gün için messageCount çubuğu (CSS ile, kütüphane olmadan). (3) Model kullanım tablosu: model adı, input tokens, output tokens, cache read tokens. (4) Peak hours: 24 saat için hourCounts'tan activity heatmap (inline CSS ile 24 kutucuk).
AC: Activity sekmesi açılınca veriler yükleniyor. 4 summary card, 7 günlük bar chart, model tablosu ve hour heatmap görünüyor. Tüm veri `/usage` endpoint'inden geliyor.

## S2-T2
Area: Dashboard
Priority: high
Depends: S2-T1, S1-T2
Description: Activity view'a "Recent Sessions" bölümü ekle. `/activity/sessions` endpoint'inden son 10 session'ı göster. Her satır: proje adı (project_path'ten basename), süre, mesaj sayısı, dil listesi (ilk 3), git commits. Satıra tıklayınca expanded detay: tool_counts breakdown, lines_added, ilk prompt (kırpılmış).
AC: Son sessionlar tablo/liste halinde görünüyor. Her session satırı tıklanabilir ve detayları açıyor.

# Slice S3 — Live View Session Zenginleştirme

## S3-T1
Area: Server
Priority: high
Depends: -
Description: `/sessions` endpoint'ini session-meta verileriyle zenginleştir. Mevcut session listesini döndürürken, session ID'ye göre `~/.claude/usage-data/session-meta/<id>.json` dosyasını da oku (varsa). Varsa: lines_added, git_commits, languages, duration_minutes, tool_counts alanlarını session objesine ekle. Dosya yoksa bu alanlar undefined kalır.
AC: `/sessions` response'unda mevcut session'lar için lines_added ve git_commits görünüyor.

## S3-T2
Area: Dashboard
Priority: medium
Depends: S3-T1
Description: LiveView session kartlarında session-meta bilgilerini göster. Session kartının altına küçük badge'ler ekle: "↑ 1.2K lines", "2 commits", kullanılan diller (TypeScript, Python gibi). Veri yoksa badge görünmez.
AC: Session kartlarında lines_added ve git_commits badge'leri görünüyor. Veri yoksa temiz görünüm korunuyor.
