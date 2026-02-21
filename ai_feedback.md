# claudedash — AI Agent Feedback

Bu dosya, claudedash'i kullanan AI agentların (Claude Code, otonom agentlar) ihtiyaçlarını,
eksiklerini ve önerilerini belgeler. Her geliştirme sonrası agent deneyimi buraya eklenir.

---

## Mevcut Durum (v0.7.0)

### Ne iyi çalışıyor
- `npx claudedash start` ile sıfır kurulum, anında başlatma
- SSE ile gerçek zamanlı todo güncellemeleri — agent çalışırken dashboard canlı güncelleniyor
- Plan modu (queue.md + execution.log) — otonom workflow için temiz protokol
- `/health` endpoint — agent kendi durumunu sorgulayabiliyor

### Agent Perspektifinden Eksikler

#### 1. Queue durumu sorgulanamıyor
- **Problem:** Agent, queue'daki task'ların güncel durumunu API üzerinden okuyamıyor.
  Şu an sadece dosya okuyarak (queue.md + execution.log) durumu anlıyor.
- **İstenen:** `GET /queue` endpoint → task listesi + her task'ın hesaplanmış statüsü
- **Neden önemli:** Sub-agent'lar parent'ın task queue'sunu görebilmeli

#### 2. Agent kendini kayıt edemiyor
- **Problem:** Birden fazla agent (paralel) çalışırken dashboard sadece session bazlı gösteriyor.
  Hangi agent hangi task'ı çalıştırıyor belirsiz.
- **İstenen:** `POST /agent/register` + `POST /agent/heartbeat` — agent adı, task_id, durum
- **Neden önemli:** Multi-agent senaryolarında orkestrasyon görünürlüğü

#### 3. Execution log append API yok
- **Problem:** Agent şu an doğrudan `.claudedash/execution.log` dosyasına yazıyor.
  Bu kısıtlayıcı — farklı dizinlerden çalışan agentlar log dosyasını bulamayabilir.
- **İstenen:** `POST /log` endpoint → `{ task_id, status, agent, reason?, meta? }`
- **Neden önemli:** Agent her yerden HTTP ile log basabilmeli, dosya path bilmesine gerek yok

#### 4. Task blocker bildirimi
- **Problem:** Agent bir task'ı BLOCKED olarak işaretlediğinde kullanıcı ancak dashboard'a
  bakınca görüyor. Anlık uyarı mekanizması yok.
- **İstenen:** BLOCKED log event'i SSE'den push edilmeli, browser bildirim tetiklenmeli
- **Neden önemli:** Agent engellendiğinde kullanıcı müdahalesi gerekiyor

#### 5. Conversation context endpoint yok
- **Problem:** Agent, kendi önceki oturumlarına (JSONL) programatik erişemiyor.
  "Bu projede daha önce ne yaptım?" sorusunu sormak için dosya okumak gerekiyor.
- **İstenen:** `GET /conversations?project=<path>&limit=5` — özet + son tool calls
- **Neden önemli:** Agent hafızasını dashboarddan sorgulayabilmeli

#### 6. Plan modu: workflow.md yokken agent kaybolabiliyor
- **Problem:** Yeni projede sadece queue.md var, workflow.md yok. Agent nasıl ilerleneceğini
  tahmin etmek zorunda.
- **İstenen:** `npx claudedash init` komutunun çıktısında varsayılan workflow.md şablonu olmalı
- **Neden önemli:** Agent-scope entegrasyonu için önemli

---

## Özellik İstekleri (Agent Kullanımı İçin)

### Kısa Vadeli (v0.8)
- [ ] `GET /queue` — hesaplanmış task durumlarıyla queue snapshot
- [ ] `POST /log` — HTTP üzerinden execution log append
- [ ] BLOCKED event → SSE push → browser bildirim

### Orta Vadeli (v0.9)
- [ ] `POST /agent/register` + heartbeat sistemi
- [ ] `GET /conversations?project=` — proje bazlı konuşma geçmişi özeti
- [ ] `npx claudedash init` — workflow.md şablonu dahil

### Uzun Vadeli
- [ ] Agent authentication (basit token yeterli)
- [ ] Multi-project queue federation — birden fazla projenin queue'su tek dashboardda
- [ ] Webhook/Slack entegrasyonu — task complete/failed bildirimi

---

## Rakip Analizi Notları

Araştırılan repolar: ccusage, claude-code-ui, claude-code-hooks-multi-agent-observability,
ccboard, ClaudeWatch, claude-pilot

### ccusage'dan öğrenilenler
- JSONL parsing yaklaşımı: her mesajı satır satır oku, tool_use bloklarını çıkar
- Bunu S5-T1'de `/conversations` endpoint ile yapıyoruz

### claude-code-hooks'tan öğrenilenler
- Hook sistemi (PreToolUse, PostToolUse event'leri) gerçek zamanlı event feed için ideal
- claudedash şu an polling/SSE yapıyor; hook entegrasyonu çok daha hızlı olurdu
- **Öneri:** `~/.claude/settings.json`'a hook ekleyerek claudedash sunucusuna POST at

### ccboard'dan öğrenilenler
- SQLite cache ile 89x hızlı başlatma — büyük JSONL dosyaları için önemli
- Şimdilik JSONL'yi her request'te okuyoruz, caching eklenebilir

### Kimsenin yapmadığı (claudedash fırsatı)
- `usage-data/facets/` verisi (AI session analizi) — S4'te yapıyoruz
- Todo list + plan mode entegrasyonu — sadece claudedash'te var
- Worktree → task eşleştirmesi — sadece claudedash'te var

---

## Hook Entegrasyonu Taslağı (Gelecek)

`~/.claude/settings.json`'a şu hook eklenebilir:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "curl -s -X POST http://localhost:4317/hook -H 'Content-Type: application/json' -d '{\"event\":\"PostToolUse\",\"tool\":\"$CLAUDE_TOOL_NAME\",\"session\":\"$CLAUDE_SESSION_ID\"}'"
      }]
    }]
  }
}
```

Bu hook, her tool kullanımında dashboard'a bildirir → gerçek zamanlı tool timeline mümkün olur.

---

_Son güncelleme: 2026-02-21 — v0.7.0_
