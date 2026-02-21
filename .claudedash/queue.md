# Slice S10 — Agent API (ai_feedback.md eksikler)

## S10-T1
Area: Server
Priority: critical
Depends: -
Description: `POST /log` endpoint ekle. Agent HTTP üzerinden execution.log'a entry yazabilsin. Body: `{ task_id: string, status: "DONE"|"FAILED"|"BLOCKED", agent?: string, reason?: string, meta?: object }`. Endpoint, `.claudedash/execution.log` dosyasına JSONL formatında append eder (timestamp otomatik). agentScopeDir yoksa 404 dön. BLOCKED status gelirse SSE üzerinden `{ type: "blocked", task_id, reason }` event'i push et.
AC: `curl -X POST http://localhost:4317/log -d '{"task_id":"S1-T1","status":"DONE","agent":"test"}'` → 200 + execution.log'a satır eklendi. BLOCKED gönderince SSE client'lar event alıyor.

## S10-T2
Area: Server
Priority: critical
Depends: -
Description: `GET /queue` endpoint ekle. queue.md + execution.log dosyalarını parse et. queue.md'deki her task için: id, area, description (ilk 200 karakter), dependsOn (Depends: satırından). execution.log'dan son status'u al. Her task'ın computed status'unu hesapla: log'da DONE ise DONE, FAILED ise FAILED, BLOCKED ise BLOCKED; dependency'leri DONE değilse BLOCKED; hiçbiri yoksa READY. Döndür: `{ tasks: ComputedTask[], summary: { total, done, failed, blocked, ready } }`.
AC: `curl http://localhost:4317/queue` → task listesi + summary. Her task'ta status alanı doğru hesaplanmış. Dependency chain çalışıyor.

## S10-T3
Area: Server
Priority: high
Depends: -
Description: `POST /agent/register` ve `POST /agent/heartbeat` endpoint'leri ekle. Register body: `{ agentId: string, sessionId?: string, taskId?: string, name?: string }`. Heartbeat body: `{ agentId: string, status?: string, taskId?: string }`. Server memory'de aktif agent'ları tut (Map). Son heartbeat'ten 60 saniye geçmişse agent "stale" sayılsın. `GET /agents` endpoint: kayıtlı agent'ların listesini döndür (agentId, name, taskId, status, lastSeen, isStale). SSE'den `{ type: "agent-update" }` push et.
AC: register + heartbeat → 200. GET /agents → aktif agent listesi. 60s timeout ile stale detection çalışıyor.

## S10-T4
Area: Dashboard
Priority: high
Depends: S10-T2, S10-T3
Description: LiveView sidebar'a "Agent API" durum göstergesi ekle. Sidebar footer'ına küçük bir panel: (1) /queue summary badge'leri: `4 READY · 2 DONE · 1 BLOCKED`. BLOCKED varsa kırmızı vurgulu. (2) Kayıtlı agent'lar: her biri için isim + taskId + son görülme. Stale agent'lar soluk gösterilir. (3) BLOCKED SSE event gelince browser notification tetikle ("Task BLOCKED: <task_id> — <reason>"). Bu mevcut notification sistemini genişletir.
AC: LiveView sidebar'da queue summary görünüyor. BLOCKED bildirim çalışıyor. Agent listesi var.

## S10-T5
Area: Server+CLI
Priority: medium
Depends: -
Description: `npx claudedash init` komutuna `workflow.md` şablonu ekle. Mevcut init komutu .claudedash/queue.md + CLAUDE.md oluşturuyor. Buna ek olarak `.claudedash/workflow.md` oluştur. Şablon: INTAKE (queue'dan task al), EXECUTE (işi yap), LOG (execution.log'a yaz VEYA POST /log endpoint'e), CHECKPOINT (blocker varsa BLOCKED logla ve dur) fazları. Log için tercih sırası: server çalışıyorsa HTTP, değilse dosya. Ayrıca workflow.md'de `POST /log` kullanım örneği göster.
AC: `npx claudedash init` → .claudedash/workflow.md oluşturuyor. workflow.md'de POST /log kullanım örneği var. CLAUDE.md snippet'ı workflow.md'yi referans ediyor.
