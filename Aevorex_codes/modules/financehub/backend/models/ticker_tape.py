# backend/models/ticker_tape.py
# =============================================================================
# Pydantic Modellek a Ticker Tape (Árszalag) Komponenshez
#
# Felelősségek:
# - A ticker szalagon megjelenő egyes elemek (TickerTapeItem) adatstruktúrájának definiálása.
# - A teljes ticker szalag (TickerTapeData) válaszmodelljének definiálása.
# - Szigorú validáció biztosítása az áradatokhoz és a változásokhoz.
# =============================================================================

from pydantic import BaseModel, Field, StrictFloat, StrictStr, ConfigDict
from typing import List, Optional

class TickerTapeItem(BaseModel):
    """Egyetlen elem a ticker szalagon."""
    model_config = ConfigDict(extra='ignore', validate_assignment=True)

    symbol: StrictStr = Field(..., description="Értékpapír szimbóluma.")
    price: StrictFloat = Field(..., description="Aktuális ár.")
    change: StrictFloat = Field(..., description="Változás az előző záróárhoz képest.")
    change_percent: StrictFloat = Field(..., alias="changesPercentage", description="Százalékos változás.")
    
class TickerTapeData(BaseModel):
    """
    A teljes adatszerkezet a ticker tape API végponthoz.
    Egy listát tartalmaz a TickerTapeItem elemekből.
    """
    model_config = ConfigDict(extra='ignore')
    
    data: List[TickerTapeItem] = Field(..., description="Ticker elemek listája.") 