import random
import re
from collections import defaultdict

BELT_LEVELS = {
    "BEGINNER": {
        "white",
        "yellow",
        "yellow1",
        "yellow 1",
        "yellow2",
        "yellow 2",
    },

    "INTERMEDIATE": {
        "orange",
        "green",
        "blue",

        "purple",
        "purple stripe",
        "Purple Stripe",
        "purple1",
        "purple 1",
        "purple2",
        "purple 2",
    },

    "ADVANCED": {
        "brown",
        "brown1",
        "brown 1",
        "brown2",
        "brown 2",
        "black",
    },
}


def normalize_belt(belt):
    if not belt:
        return "white"

    belt = belt.strip().lower()

    belt = belt.replace("-", " ")
    belt = belt.replace("_", " ")

    while "  " in belt:
        belt = belt.replace("  ", " ")

    return belt


def get_belt_level(belt):
    belt = normalize_belt(belt)

    for level, belts in BELT_LEVELS.items():
        if belt in belts:
            return level

    return "BEGINNER"


def get_weight_group_from_policy(weight, policy_categories):
    if not policy_categories:
        return "UNASSIGNED"

    for low, high in policy_categories:
        if low <= weight <= high:
            return f"{int(low)}-{int(high)}"

    return "UNASSIGNED"


def extract_lower_weight(weight_str):
    if not weight_str or not isinstance(weight_str, str):
        return float('inf')
    clean = re.sub(r'[–—]', '-', weight_str.strip())

    range_match = re.match(r'^([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)', clean)
    if range_match:
        try:
            return float(range_match.group(1))
        except ValueError:
            return float('inf')

    plus_match = re.search(r'(?:\+|>=?|>)\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*\+', clean)
    if plus_match:
        try:
            val = plus_match.group(1) or plus_match.group(2)
            return float(val)
        except ValueError:
            return float('inf')

    under_match = re.match(r'^(?:-|<|<=)\s*([0-9]+(?:\.[0-9]+)?)', clean)
    if under_match:
        return 0.0

    num_match = re.search(r'([0-9]+(?:\.[0-9]+)?)', clean)
    if num_match:
        try:
            return float(num_match.group(1))
        except ValueError:
            return float('inf')

    return float('inf')


def extract_upper_weight(weight_str):
    if not weight_str or not isinstance(weight_str, str):
        return float('inf')
    clean = re.sub(r'[–—]', '-', weight_str.strip())

    range_match = re.match(r'^([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)', clean)
    if range_match:
        try:
            return float(range_match.group(2))
        except ValueError:
            return float('inf')

    under_match = re.match(r'^(?:-|<|<=)\s*([0-9]+(?:\.[0-9]+)?)', clean)
    if under_match:
        try:
            return float(under_match.group(1))
        except ValueError:
            return float('inf')

    return extract_lower_weight(weight_str)


def sort_group_keys(keys, eventType="KUMITE"):
    if eventType == "KATA":
        return list(keys)

    prefix_first_seen = {}
    for idx, key in enumerate(keys):
        parts = [s.strip() for s in key.split("|")]
        prefix = " | ".join(parts[:-1]) if len(parts) > 1 else key
        if prefix not in prefix_first_seen:
            prefix_first_seen[prefix] = idx

    def sort_key(k):
        parts = [s.strip() for s in k.split("|")]
        if len(parts) <= 1:
            return (0, 0, 0, k)
        prefix = " | ".join(parts[:-1])
        prefix_order = prefix_first_seen.get(prefix, 0)
        weight_str = parts[-1]
        lower = extract_lower_weight(weight_str)
        upper = extract_upper_weight(weight_str)
        return (prefix_order, lower, upper, weight_str)

    return sorted(keys, key=sort_key)


def generate_referees(n):
    return [f"Referee_{i+1}" for i in range(n)]

def schedule_round(
    players,
    tatami_start,
    tatami_count,
    referees,
    tournament_level="DISTRICT",
):
    matches = []
    tatami = tatami_start

    remaining = players[:]

    # Random BYE
    if len(remaining) % 2 == 1:
        bye_index = random.randrange(len(remaining))
        bye_player = remaining.pop(bye_index)

        matches.append({
            "tatami": tatami,
            "players": [bye_player["name"]],
            "status": "BYE",
            "referees": random.sample(referees, 3),
        })

        tatami = tatami % tatami_count + 1

    while remaining:

        p1 = remaining.pop(0)

        best_index = 0
        best_score = -1

        for i, candidate in enumerate(remaining):

            score = 0

            if tournament_level == "DISTRICT":

                if p1["club"] != candidate["club"]:
                    score += 100

            elif tournament_level == "STATE":

                if p1["city"] != candidate["city"]:
                    score += 100

                if p1["club"] != candidate["club"]:
                    score += 20

            elif tournament_level == "NATIONAL":

                if p1["state"] != candidate["state"]:
                    score += 100

                if p1["club"] != candidate["club"]:
                    score += 20

            elif tournament_level == "INTERNATIONAL":

                if p1.get("country", "") != candidate.get("country", ""):
                    score += 100

                if p1["state"] != candidate["state"]:
                    score += 20

                if p1["club"] != candidate["club"]:
                    score += 5

            if score > best_score:
                best_score = score
                best_index = i

        p2 = remaining.pop(best_index)

        matches.append({
            "tatami": tatami,
            "players": [
                p1["name"],
                p2["name"],
            ],
            "status": "PENDING",
            "referees": random.sample(referees, 3),
        })

        tatami = tatami % tatami_count + 1

    return matches, tatami


def schedule_pool(
    players,
    tatami_start,
    tatami_count,
    referees,
    tournament_level="DISTRICT",
):
    rounds = []
    tatami = tatami_start

    matches, tatami = schedule_round(
        players=players,
        tatami_start=tatami,
        tatami_count=tatami_count,
        referees=referees,
        tournament_level=tournament_level,
    )

    rounds.append({
        "round": 1,
        "matches": matches,
    })

    return {
        "rounds": rounds
    }, tatami


def run_kata_pool(players, tatami_start, tatami_count, referees):
    matches = []
    tatami = tatami_start

    for player in players:
        matches.append({
            "tatami": tatami,
            "players": [player["name"]],
            "status": "PENDING",
            "referees": random.sample(referees, 5),
        })

        tatami = tatami % tatami_count + 1

    return {"rounds": [{"round": 1, "matches": matches}]}, tatami


def split_into_balanced_pools(players, max_players_per_pool):
    if max_players_per_pool <= 0:
        max_players_per_pool = 4
    """
    Split players into balanced pools.

    Example:
    18 players, max 4
    Old: 4,4,4,4,2
    New: 4,4,4,3,3

    10 players, max 4
    Old: 4,4,2
    New: 4,3,3
    """

    total_players = len(players)

    if total_players <= max_players_per_pool:
        return [players]

    import math

    pool_count = math.ceil(total_players / max_players_per_pool)

    base_size = total_players // pool_count
    extra = total_players % pool_count

    pools = []

    index = 0

    for i in range(pool_count):

        size = base_size

        if i < extra:
            size += 1

        pools.append(players[index:index + size])

        index += size

    return pools


def distribute_players_random(players):
    """
    Randomize players while spreading clubs as evenly as possible.
    """

    random.shuffle(players)

    clubs = defaultdict(list)

    for p in players:
        clubs[p["club"]].append(p)

    balanced = []

    while True:

        added = False

        club_names = list(clubs.keys())
        random.shuffle(club_names)

        for club in club_names:

            if clubs[club]:
                balanced.append(clubs[club].pop(0))
                added = True

        if not added:
            break

    return balanced

def generate_pools(
    players,
    players_per_pool,
    tatami_count,
    policy_weight_categories,
    minAge=None,
    maxAge=None,
    eventType="KUMITE",
    sortByBelt=False,
    tournamentLevel="DISTRICT",
):
    referees = generate_referees(24)

    age_group = (
        f"{minAge}-{maxAge}"
        if minAge is not None and maxAge is not None
        else "ALL"
    )

    if minAge is not None and maxAge is not None:
        players = [
            p for p in players
            if isinstance(p.get("age"), (int, float))
            and minAge <= p["age"] <= maxAge
        ]

    enriched = []

    for p in players:
        enriched.append({
            **p,
            "age_group": age_group,
            "belt_level": get_belt_level(p["belt"]),
            "weight_group": (
                "ALL"
                if eventType == "KATA"
                else get_weight_group_from_policy(
                    p["weight"],
                    policy_weight_categories,
                )
            ),
        })

    grouped = defaultdict(list)

    # =====================================================
    # GROUP PLAYERS
    # =====================================================
    for p in enriched:
        # -----------------------------
        # KATA
        # -----------------------------
        if eventType == "KATA":
            if sortByBelt:
                # Beginner / Intermediate / Advanced
                key = (
                    f"{p['gender']} | "
                    f"{p['age_group']} | "
                    f"{p['belt_level']} | "
                    f"KATA"
                )
            else:
                # Ignore belt completely
                key = (
                    f"{p['gender']} | "
                    f"{p['age_group']} | "
                    f"KATA"
                )
        # -----------------------------
        # KUMITE
        # -----------------------------
        else:
            if sortByBelt:
                # Separate by belt level
                key = (
                    f"{p['gender']} | "
                    f"{p['belt_level']} | "
                    f"{p['age_group']} | "
                    f"{p['weight_group']}"
                )
            else:
                # Ignore belt completely
                key = (
                    f"{p['gender']} | "
                    f"{p['age_group']} | "
                    f"{p['weight_group']}"
                )

        grouped[key].append(p)

    # =====================================================
    # CREATE POOLS
    # =====================================================
    output = {"groups": {}}
    tatami = 1

    sorted_keys = sort_group_keys(list(grouped.keys()), eventType=eventType)
    pool_index = 1

    for key in sorted_keys:
        plist = grouped[key]
        # -----------------------------------
        # RANDOM MODE
        # -----------------------------------
        if not sortByBelt:
            plist = distribute_players_random(plist)
        # -----------------------------------
        # BELT-WISE MODE
        # -----------------------------------
        else:
            plist = sorted(
                plist,
                key=lambda x: (
                    x["club"],
                    x["name"],
                ),
            )

        output["groups"][key] = {"pools": {}}

        pools = split_into_balanced_pools(
            plist,
            players_per_pool,
        )

        for pool_players in pools:
            pool_name = f"POOL_{pool_index}"
            pool_index += 1

            # ----------------------------
            # KATA
            # ----------------------------
            if eventType == "KATA":
                pool_data, tatami = run_kata_pool(
                    pool_players,
                    tatami,
                    tatami_count,
                    referees,
                )
            # ----------------------------
            # KUMITE
            # ----------------------------
            else:
                pool_data, tatami = schedule_pool(
                    players=pool_players,
                    tatami_start=tatami,
                    tatami_count=tatami_count,
                    referees=referees,
                    tournament_level=tournamentLevel,
                )

            output["groups"][key]["pools"][pool_name] = pool_data

    return output