# Agent Workflow

Claudedash Plan mode için otonom yürütme protokolü.
Her görev `.claudedash/queue.md`'den alınır ve aşağıdaki fazlardan geçer.

---

## Faz 1 — INTAKE

`.claudedash/queue.md`'den sonraki READY görevi oku.

1. Görevi parse et: ID, Area, Priority, Description, AC, Depends.
2. Depends listesindeki tüm görevlerin DONE olduğunu doğrula.
3. Görevi `in_progress` olarak TodoWrite ile işaretle.

Başlamadan önce: Description ve AC'yi tam oku. Eksik bağlam varsa BLOCKED yaz.

---

## Faz 2 — EXECUTE

Görevi uygula.

1. AC'yi hedef al — description "nasıl", AC "ne zaman bitmiş sayılır"ı tanımlar.
2. Yalnızca kapsam dahili dosyaları değiştir.
3. 2 başarısız denemeden sonra dur, FAILED logla.
4. Her değişiklikten sonra testleri çalıştır: `npm test` (core için) veya `npm run build` (server/dashboard için).

---

## Faz 3 — LOG

Sonucu `.claudedash/execution.log`'a ekle (bir JSON satırı):

Başarı:
```json
{"task_id":"S1-T1","status":"DONE","timestamp":"<ISO>","agent":"claude"}
```

Başarısız:
```json
{"task_id":"S1-T1","status":"FAILED","timestamp":"<ISO>","agent":"claude","meta":{"reason":"<açıklama>"}}
```

Engel:
```json
{"task_id":"S1-T1","status":"BLOCKED","timestamp":"<ISO>","agent":"claude","reason":"<ne eksik>"}
```

---

## Kurallar

1. Kalite kapısı: her görev sonrası `npm test` geçmeli.
2. Kapsam genişletme yasak — görev dışı iyileştirme yapma.
3. Faz 3'ü atlama — her görev loglanmalı.
4. queue.md salt okunur — asla değiştirme.
5. Timestamp için `new Date().toISOString()` kullan.
