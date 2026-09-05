from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from karate_pooling import generate_pools

app = FastAPI()


class Player(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    weight: float
    belt: str

    club: str = ""
    city: str = ""
    state: str = ""
    country: str = ""


class Payload(BaseModel):
    players: List[Player]

    playersPerPool: int
    tatamiCount: int

    minAge: Optional[int] = None
    maxAge: Optional[int] = None

    eventType: str

    weightCategories: Optional[List[List[float]]] = None

    # Belt Wise / Random
    sortByBelt: bool = False

    # DISTRICT / STATE / NATIONAL / INTERNATIONAL
    tournamentLevel: str = "DISTRICT"


@app.post("/generate-pools")
def generate(payload: Payload):

    print("\n========================================")
    print("🚀 AI ENGINE REQUEST RECEIVED")
    print("Players:", len(payload.players))
    print("Event:", payload.eventType)
    print("Sort By Belt:", payload.sortByBelt)
    print("Tournament Level:", payload.tournamentLevel)
    print("Age:", payload.minAge, "-", payload.maxAge)
    print("Weight Categories:", payload.weightCategories)
    print("========================================")

    for player in payload.players:
        print(
            player.name,
            "| Age:", player.age,
            "| Gender:", player.gender,
            "| Weight:", player.weight,
            "| Belt:", player.belt,
            "| Club:", player.club,
            "| City:", player.city,
            "| State:", player.state,
        )

    return generate_pools(
        players=[player.dict() for player in payload.players],

        players_per_pool=payload.playersPerPool,

        tatami_count=payload.tatamiCount,

        policy_weight_categories=payload.weightCategories or [],

        minAge=payload.minAge,

        maxAge=payload.maxAge,

        eventType=payload.eventType.upper(),

        sortByBelt=payload.sortByBelt,

        tournamentLevel=payload.tournamentLevel.upper(),
    )