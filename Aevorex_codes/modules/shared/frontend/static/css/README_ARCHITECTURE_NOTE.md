# 🚨 AEVOREX CSS ARCHITEKTÚRÁLIS FIGYELMEZTETÉS

## ⚠️ ELAVULT KÖZÖS CSS KOMPONENSEK

**Jelenlegi állapot:** Ez a `shared/` mappa **elavult** és **nem robosztus** CSS architektúrát tartalmaz.

### 📊 Architektúrális rangsor

1. **🥇 FinanceHub CSS** - Master-tier enterprise architektúra  
   - 7-szintes hierarchia (01-base → 07-vendor)
   - Szofisztikált design tokens
   - Duplikáció-detektálás built-in
   - Premium komponens rendszer

2. **🥈 ContentHub CSS** - Önálló, fejlesztés alatt
   - Saját build_contenthub_css.py
   - Közepes szintű struktúra

3. **🥉 Ez a mappa** - Alapszintű, csak mainpage használja
   - Nem elég robosztus enterprise-használatra
   - Limitált funkcionalitás

## 🔄 MIGRÁCIÓS TERV

**FÁZIS 1:** FinanceHub CSS → 100% tiszta állapot ✅ (FOLYAMATBAN)
**FÁZIS 2:** FinanceHub architektúra → Aevorex Master Framework
**FÁZIS 3:** Minden hub → migráció az új rendszerre

## 🚫 NE HASZNÁLD

- Új projektek esetén **NE** hivatkozz erre a CSS-re
- Inkább használd a **FinanceHub CSS komponenseket**
- Ez a mappa **sunset** módban van

## 📞 Kapcsolat

Ha CSS komponensekre van szükséged, használd a FinanceHub CSS Master Framework-öt:
`/modules/financehub/frontend/static/css/`

---
*Utolsó frissítés: 2025-01-12*  
*Státusz: SUNSET MODE - DO NOT EXTEND* 
 