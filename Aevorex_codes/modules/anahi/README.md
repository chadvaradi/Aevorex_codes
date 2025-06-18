# Anahi - Személyes Galéria Modul

## Áttekintés

Az Anahi modul egy személyes fotó galéria kezelő rendszer, amely lehetővé teszi képek feltöltését, megtekintését, rendezését és kezelését. Modern, reszponzív felhasználói felülettel és teljes backend API-val rendelkezik.

## Funkciók

### 🖼️ Galéria Funkciók
- **Képek megjelenítése**: Grid és lista nézet
- **Rendezési opciók**: Dátum, név, méret szerint
- **Kép megtekintő**: Teljes méretű kép megjelenítés
- **Drag & Drop feltöltés**: Egyszerű képfeltöltés
- **Statisztikák**: Galéria mérete és képek száma

### 📱 Felhasználói Felület
- **Reszponzív design**: Mobil és desktop optimalizált
- **Dark theme**: Modern, szemmellátás-barát megjelenés
- **Animációk**: Smooth transitions és hover effektek
- **Modal ablakok**: Upload, megtekintés, statisztikák

### 🔧 Backend API
- **RESTful API**: CRUD műveletek képekhez
- **Fájl validáció**: Biztonságos feltöltés
- **Metaadat kezelés**: Fájlméret, dátum információk
- **Error handling**: Hibakezelés és válaszok

## Fájl Szerkezet

```
modules/anahi/
├── backend/                    # Backend logika
│   ├── api/
│   │   └── endpoints/
│   │       └── gallery.py      # Galéria API végpontok
│   ├── core/                   # Alap funkciók
│   ├── models/                 # Adatmodellek
│   └── utils/                  # Segéd funkciók
├── frontend/                   # Frontend fájlok
│   ├── index.html             # Főoldal
│   ├── static/
│   │   ├── css/
│   │   │   └── anahi-gallery.css  # Stílusok
│   │   └── js/
│   │       └── anahi-gallery.js   # JavaScript logika
│   └── templates/             # További sablonok
├── photos/
│   └── gallery/               # Feltöltött képek
├── configs/
│   └── config.py              # Konfigurációs beállítások
└── README.md                  # Ez a fájl
```

## Telepítés és Használat

### 1. Függőségek
```bash
pip install fastapi uvicorn python-multipart pillow
```

### 2. API Indítása
```python
from modules.anahi.backend.api.endpoints.gallery import router
# Add to your FastAPI app:
app.include_router(router, prefix="/api/anahi")
```

### 3. Frontend Elérése
Nyisd meg a `modules/anahi/frontend/index.html` fájlt böngészőben, vagy szolgáld ki webszerverrel.

## API Dokumentáció

### Végpontok

#### `GET /api/anahi/gallery/`
Összes kép lekérése a galériából.

**Válasz:**
```json
{
  "success": true,
  "count": 25,
  "photos": [
    {
      "filename": "example.jpg",
      "size": 234567,
      "created": "2024-01-15T10:30:00",
      "modified": "2024-01-15T10:30:00",
      "path": "/static/anahi/gallery/example.jpg"
    }
  ]
}
```

#### `POST /api/anahi/gallery/upload`
Új kép feltöltése.

**Paraméterek:**
- `file`: Kép fájl (multipart/form-data)

#### `DELETE /api/anahi/gallery/{filename}`
Kép törlése fájlnév alapján.

#### `GET /api/anahi/gallery/stats`
Galéria statisztikák lekérése.

## Konfigurációs Beállítások

A `configs/config.py` fájlban személyre szabhatók a beállítások:

```python
GALLERY_CONFIG = {
    "max_file_size": 10 * 1024 * 1024,  # 10MB
    "allowed_extensions": [".jpg", ".jpeg", ".png", ".gif"],
    "enable_upload": True,
    "enable_delete": True,
}
```

## Képek Kezelése

### Támogatott Formátumok
- JPG/JPEG
- PNG
- GIF
- BMP
- WebP

### Feltöltési Módok
1. **Drag & Drop**: Húzd a képeket az upload területre
2. **Fájlböngésző**: Kattints a "Fájlok kiválasztása" gombra
3. **API Upload**: POST kérés a `/upload` végpontra

## Fejlesztési Lehetőségek

### Jövőbeli Funkciók
- [ ] Képszerkesztés (crop, resize, filter)
- [ ] Albumok és kategóriák
- [ ] EXIF adat megjelenítés
- [ ] Kép keresés és címkézés
- [ ] Közösségi megosztás
- [ ] Automatikus biztonsági mentés

### Technikai Fejlesztések
- [ ] Thumbnail generálás
- [ ] Képoptimalizálás
- [ ] CDN integráció
- [ ] Database backend
- [ ] User authentication
- [ ] Rate limiting

## Biztonsági Megfontolások

### Éles Környezetben
1. **Authentikáció**: Állítsd be a felhasználói hitelesítést
2. **Fájl validáció**: Ellenőrizd a feltöltött fájlokat
3. **Rate limiting**: Korlátozd a feltöltési sebességet
4. **HTTPS**: Használj titkosított kapcsolatot
5. **Backup**: Rendszeres biztonsági mentés

## Hibaelhárítás

### Gyakori Problémák

**Képek nem jelennek meg:**
- Ellenőrizd a fájl elérési utakat
- Győződj meg róla, hogy a webszerver szolgálja a static fájlokat

**Feltöltés nem működik:**
- Ellenőrizd a fájlméret korlátokat
- Győződj meg róla, hogy a backend API fut

**API hibák:**
- Nézd meg a szerver logokat
- Ellenőrizd a CORS beállításokat

## Licenc

Ez a modul az Aevorex projekt része. Minden jog fenntartva.

## Kapcsolat

Fejlesztő: Aevorex Team
Verzió: 1.0.0
Utolsó frissítés: 2024-01-15 