# Slice S1 — Güvenlik

## S1-T1
Area: Server
Priority: critical
Depends: -
Description: Fastify sunucusunu 0.0.0.0 yerine 127.0.0.1'e bind et. Opsiyonel --host flag'i ile kullanıcı açıkça isterse ağ erişimi açılabilir; bu durumda terminal'de uyarı gösterilir.
AC: Server varsayılan olarak yalnızca localhost'ta dinler. `claudedash start --host 0.0.0.0` çalışır ve "⚠️ exposed to network" uyarısı basar.

## S1-T2
Area: Server
Priority: critical
Depends: S1-T1
Description: CORS politikasını wildcard `origin: true`'dan `http://localhost:{port}` ve `http://127.0.0.1:{port}` ile sınırla. Port dinamik olarak config'den alınır.
AC: Cross-origin istekler farklı origin'den reddedilir. Dashboard kendi origin'inden çalışmaya devam eder.

## S1-T3
Area: Server
Priority: high
Depends: S1-T2
Description: /claude-insights endpoint'i HTML dosyasını doğrudan text/html olarak serve ediyor. `sandbox; default-src 'none'` CSP header'ı ile iframe içinde sun veya Content-Disposition: attachment kullan.
AC: HTML report browser'da script çalıştıramaz. Manuel test: Chrome DevTools'da CSP violation olmaz, eski yöntemle console'da XSS çalışmaz.

## S1-T4
Area: Server
Priority: high
Depends: S1-T1
Description: @fastify/rate-limit ekle. Localhost istekleri (127.0.0.1, ::1) limitsiz; uzak bağlantılar için 100 istek/dakika sınırı. 429 yanıtında Retry-After header'ı gönderilir.
AC: `npm ls @fastify/rate-limit` paketi gösterir. Uzak IP'den 101. istek 429 döner.

## S1-T5
Area: CLI
Priority: medium
Depends: -
Description: src/cli.ts'de tarayıcı açmak için kullanılan `exec()` çağrısını `execFile()` ile değiştir. URL her zaman sabit port'tan gelir ama tutarlılık açısından tüm child_process kullanımı execFile olmalı.
AC: cli.ts'de `exec(` ifadesi kalmaz. Mevcut testler geçer.

# Slice S2 — Teknik Borç

## S2-T1
Area: Docs
Priority: high
Depends: -
Description: LICENSE dosyasındaki telif hakkı adını "agent-scope contributors"'dan "claudedash contributors"'a güncelle.
AC: `grep -r "agent-scope" LICENSE` sonuç döndürmez.

## S2-T2
Area: Docs
Priority: high
Depends: S2-T1
Description: CONTRIBUTING.md başlığındaki "agent-scope" ibaresini ve ölü clone URL'ini (`yunusemrgrl/agent-scope`) düzelt. Doğru URL: `yunusemrgrl/claudedash`.
AC: `grep -r "agent-scope" CONTRIBUTING.md` sonuç döndürmez. Clone URL çalışır.

## S2-T3
Area: Docs
Priority: high
Depends: -
Description: Repo kökündeki CLAUDE.md'de Plan Mode yolu `.agent-scope/queue.md` yerine `.claudedash/queue.md` olarak güncellenmeli. `npx agent-scope start` → `npx claudedash start` olarak düzelt.
AC: CLAUDE.md'de "agent-scope" ve "agent_scope" ifadesi kalmaz.

## S2-T4
Area: Core
Priority: high
Depends: -
Description: src/server/watcher.ts classifyEvent fonksiyonundaki `.agent-scope` path kontrolü `.claudedash` olarak güncellenmeli.
AC: `grep -r "agent-scope" src/` sonuç döndürmez. Plan mode olayları doğru sınıflandırılır.

## S2-T5
Area: Docs
Priority: medium
Depends: -
Description: Repo kökünde SECURITY.md dosyası oluştur. GitHub'ın standart şablonunu kullan: güvenlik açığı bildirme süreci, iletişim e-postası, kapsam dışı konular.
AC: GitHub "Security" sekmesinde policy görünür. `gh api repos/yunusemrgrl/claudedash --jq .security_and_analysis` security policy enabled döner.

## S2-T6
Area: Tooling
Priority: medium
Depends: -
Description: ESLint ekle. En az şu kurallar aktif olmalı: no-floating-promises, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars. CI'a lint adımı ekle.
AC: `npm run lint` komutu çalışır. Mevcut kod temiz geçer. CI lint hatası varsa fail olur.

## S2-T7
Area: Tooling
Priority: medium
Depends: -
Description: Dependabot'u etkinleştir. `.github/dependabot.yml` oluştur: npm ekosistemi için haftalık güncelleme PR'ları, GitHub Actions için haftalık pin güncellemeleri.
AC: `.github/dependabot.yml` commit'lendi. GitHub'da Dependabot alerts ve updates aktif.

# Slice S3 — Oturum Sürekliliği

## S3-T1
Area: Core
Priority: high
Depends: -
Description: `/clear` komutu sonrası oturum kurtarma özelliği. `~/.claude/projects/` dizinindeki önceki oturum JSONL dosyalarını tarayarak son aktif planlama durumunu özetle ve terminale yansıt. Python veya Node ile stdlib-only implementasyon.
AC: Kullanıcı `/clear` yaptıktan sonra `claudedash recover` komutu son oturumdan ne yapıldığını, hangi görevin kaldığını özetler.

## S3-T2
Area: Core
Priority: medium
Depends: S3-T1
Description: Pre-compact ve Post-compact hook şablonları ekle. `claudedash init` çıktısına dahil edilsin. Pre-compact: aktif plan durumu ve görev sayısını kaydet. Post-compact: kaydedilen durumu context'e yeniden enjekte et.
AC: `claudedash init` sonrası `.claudedash/` içinde `hooks/pre-compact.md` ve `hooks/post-compact.md` şablonları bulunur. Kılavuzda nasıl kurulacağı açıklanır.

## S3-T3
Area: Core
Priority: medium
Depends: S3-T2
Description: Stop hook şablonu: görev tamamlanmadan agent'ın durmasını engelle. `followup_message` ile eksik görevler varsa devam et. `loop_limit: 3` ile sonsuz döngü engelle.
AC: `.claudedash/hooks/stop.md` şablonu mevcut. Döngü sınırı belgelenmiş.

# Slice S4 — Kalite Kapıları Genişletme

## S4-T1
Area: Core
Priority: high
Depends: -
Description: PostToolUse hook şablonu: Bash/Edit/Write araç çağrısı sonrası otomatik lint ve typecheck çalıştır. Sonuçları execution.log'a `meta.quality` alanıyla yaz. Mevcut Quality Gates görünümü bu veriyi zaten tüketiyor.
AC: `claudedash init` ile oluşan şablonda PostToolUse hook örneği var. Quality Gates panelinde lint/typecheck sonuçları görünür.

## S4-T2
Area: Core
Priority: medium
Depends: S4-T1
Description: TDD zorlama hook şablonu: yeni Python/TS/Go dosyası yazıldığında karşılık gelen test dosyasının varlığını kontrol et. Yoksa uyarı ver. Test dosyasını bulmak için standart isimlendirme kuralları kullan.
AC: Şablon dosyası `test_{module}.py`, `{module}.test.ts`, `{module}_test.go` varlığını kontrol eder. Yanlış pozitif için `should_skip()` listesi yapılandırılabilir.

## S4-T3
Area: Dashboard
Priority: medium
Depends: S4-T1
Description: Quality Gates zaman çizelgesine dosya bazlı filtreleme ekle. Şu anda `?taskId=` parametresi var; buna ek olarak `?file=` parametresi ile belirli bir dosyanın geçmiş kalite sonuçları görüntülenebilmeli.
AC: `GET /quality-timeline?file=src/core/todoReader.ts` o dosyaya ait tüm quality event'lerini döner. Dashboard'da dosya adına tıklanabilir link ile filtreleme yapılır.

# Slice S5 — Workflow ve Bellek

## S5-T1
Area: CLI
Priority: medium
Depends: -
Description: `/spec` komutu ekle. Üç fazlı yapılandırılmış geliştirme akışı: spec-plan (keşif ve onay), spec-implement (TDD ile kod yazımı), spec-verify (test + bağımsız inceleme). Her faz execution.log'a DONE/FAILED kaydeder.
AC: `claudedash init --spec` ile spec modu şablonları oluşturulur. CLAUDE.md snippet'i /spec komutunu tanımlar. Faz geçişleri dashboard'da görünür.

## S5-T2
Area: Core
Priority: low
Depends: -
Description: Çok worktree'li paralel ajan çalıştırmaları için worktree izolasyon şablonu. `claudedash worktree create <branch>` ile yeni izole bir çalışma ortamı oluştur, mevcut Worktrees sekmesinde göster.
AC: `claudedash worktree create feature/xyz` komutu yeni git worktree açar ve dashboard Worktrees sekmesinde o branch'e ait oturumlar listelenir.
