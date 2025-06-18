import os
import requests
from fastapi import FastAPI, HTTPException # HTTPException a jobb hibakezeléshez
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from datetime import datetime, timedelta # Szükséges lehet dátumkezeléshez

# .env fájl betöltése a környezeti változók beolvasásához
# Győződj meg róla, hogy a .env fájl a projekt gyökerében (Aevorex_codes) van
# és a FastAPI alkalmazást is onnan indítod, vagy add meg a pontos utat: load_dotenv(dotenv_path='../.env')
# Egyszerűbb, ha az uvicorn-t a projekt gyökeréből indítod: uvicorn backend.main:app
load_dotenv()

# API kulcs kiolvasása a környezeti változókból
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

# --- Alkalmazás Inicializálása ---
app = FastAPI(
    title="AEVOREX FinBot Alpha API",
    description="API a FinBot Alpha MVP-hez, amely pénzügyi adatokat szolgáltat.",
    version="0.1.0"
)

# --- CORS Beállítások ---
# Engedélyezzük a szükséges forrásokat (fejlesztéshez tágabb, élesben szűkítsd!)
origins = [
    "http://localhost",
    "http://localhost:8080", # Gyakori frontend dev port
    "http://127.0.0.1",
    "http://127.0.0.1:8080",
    "null", # file:// protokollhoz
    # TODO: Élesben add hozzá a frontend domainjét!
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

@app.get("/")
async def read_root():
    """
    Egyszerű üdvözlő végpont.
    """
    return {"message": "Üdvözöl az AEVOREX FinBot Alpha Backend!"}

@app.get("/ping")
async def ping():
    """
    Egyszerű 'ping' végpont a szerver állapotának ellenőrzéséhez.
    """
    return {"status": "ok"}

@app.get("/api/stock/{symbol}")
async def get_stock_data(symbol: str):
    """
    Lekéri egy adott részvény alapvető napi adatait az Alpha Vantage API-ról.

    - **symbol**: A részvény ticker szimbóluma (pl. AAPL, MSFT).
    """
    if not ALPHA_VANTAGE_API_KEY:
        # Jobb hibakezelés HTTPException-nel
        raise HTTPException(status_code=500, detail="API kulcs nincs konfigurálva a szerveren.")

    # Összeállítjuk az API URL-t (TIME_SERIES_DAILY_ADJUSTED javasolt)
    # 'compact' az utolsó 100 napot adja, 'full' a teljeset (MVP-hez compact elég)
    function = "TIME_SERIES_DAILY_ADJUSTED"
    output_size = "compact"
    api_url = f"https://www.alphavantage.co/query?function={function}&symbol={symbol.upper()}&outputsize={output_size}&apikey={ALPHA_VANTAGE_API_KEY}"

    try:
        response = requests.get(api_url, timeout=10) # Adjunk hozzá timeout-ot
        response.raise_for_status() # Ellenőrzi a HTTP hibákat (4xx, 5xx)
        data = response.json()

        # Alpha Vantage specifikus hibák ellenőrzése
        if "Error Message" in data:
            raise HTTPException(status_code=400, detail=f"Hibás ticker vagy Alpha Vantage hiba: {data['Error Message']}")
        if "Note" in data and "API call frequency" in data["Note"]:
             raise HTTPException(status_code=429, detail=f"Alpha Vantage API limit elérve: {data['Note']}")
        if "Time Series (Daily)" not in data or not data["Time Series (Daily)"]:
            raise HTTPException(status_code=404, detail=f"Nem található napi idősor adat a(z) {symbol} szimbólumhoz.")

        # --- Sikeres válasz feldolgozása ---
        time_series = data.get("Time Series (Daily)", {})
        sorted_dates = sorted(time_series.keys(), reverse=True) # Legfrissebb dátum elöl

        latest_date = sorted_dates[0]
        latest_data = time_series[latest_date]
        # Kulcsok az Adjusted endpoint válaszában: "1. open", "2. high", "3. low", "4. close", "5. adjusted close", "6. volume", "7. dividend amount", "8. split coefficient"
        latest_adjusted_close = float(latest_data.get("5. adjusted close"))

        previous_adjusted_close = None
        if len(sorted_dates) > 1:
            previous_date = sorted_dates[1]
            previous_data = time_series[previous_date]
            previous_adjusted_close = float(previous_data.get("5. adjusted close"))

        change_percent = None
        if previous_adjusted_close and latest_adjusted_close:
            # Elkerüljük a nullával való osztást (bár árfolyamnál ritka)
            if previous_adjusted_close != 0:
                 change_percent = round(((latest_adjusted_close - previous_adjusted_close) / previous_adjusted_close) * 100, 2)
            else:
                 change_percent = 0.0 # Vagy None, vagy ahogy kezelni akarod

        # Adatok előkészítése a grafikonhoz (utolsó 30 nap)
        history_for_chart = []
        limit = 30
        # Vegyük a legfrissebb 'limit' számú dátumot
        relevant_dates = sorted_dates[:limit]
        # De a grafikonhoz időben növekvő sorrend kell, ezért megfordítjuk
        relevant_dates.reverse()

        for date in relevant_dates:
            daily_data = time_series.get(date, {}) # Használjunk get-et, hátha hiányzik egy nap
            adjusted_close = daily_data.get("5. adjusted close")
            if adjusted_close: # Csak akkor adjuk hozzá, ha van érték
                history_for_chart.append({
                    "date": date,
                    "close": float(adjusted_close)
                })

        # TODO: Hírek lekérése (külön API hívás vagy másik forrásból) - MVP után
        news_headlines = [
            {"title": "Placeholder Hír 1: Nagy bejelentés várható."},
            {"title": "Placeholder Hír 2: Elemzők optimisák."}
        ] # Csak placeholder most!

        # TODO: AI Összefoglaló generálása (OpenRouter hívás) - Következő lépés
        ai_summary = f"AI által generált összefoglaló helye a(z) {symbol.upper()} részvényről az adatok és hírek alapján..." # Csak placeholder most!

        # Strukturált válasz összeállítása
        return {
            "symbol": symbol.upper(),
            "last_refreshed": latest_date,
            "last_close_price": latest_adjusted_close, # Korrigált záróárat használunk
            "change_percent": change_percent,
            "history": history_for_chart,
            "news": news_headlines, # Egyelőre placeholder
            "ai_summary": ai_summary # Egyelőre placeholder
        }

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Az adatszolgáltató API időtúllépést okozott.")
    except requests.exceptions.RequestException as e:
        print(f"Hiba az Alpha Vantage API hívásakor: {e}")
        raise HTTPException(status_code=503, detail="Hiba történt a külső adatszolgáltató elérésekor.")
    except (KeyError, ValueError, IndexError) as e:
        # Hibák a JSON feldolgozása vagy adatkinyerés során
        print(f"Hiba az adatok feldolgozásakor ({symbol}): {e}")
        raise HTTPException(status_code=500, detail=f"Hiba történt a(z) {symbol} adatainak feldolgozása közben.")
    except Exception as e:
        # Bármilyen egyéb váratlan hiba
        print(f"Váratlan szerverhiba ({symbol}): {e}")
        raise HTTPException(status_code=500, detail="Belső szerverhiba.")


# Fő alkalmazás indítása (ha közvetlenül futtatnánk, de jobb a uvicorn parancs)
# if __name__ == "__main__":
#     import uvicorn
#     # Port beolvasása környezeti változóból (pl. hostinghoz kellhet)
#     port = int(os.environ.get("PORT", 8000))
#     uvicorn.run(app, host="0.0.0.0", port=port)