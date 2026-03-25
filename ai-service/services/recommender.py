"""
Smart Vehicle Recommender
--------------------------
Returns similar listings based on make, model, year, and price proximity.

Architecture notes:
- Currently uses a content-based filtering approach (no ML model needed).
- Designed so a collaborative filtering model (e.g. sklearn NearestNeighbors)
  can be dropped in at the `_find_similar` function without changing the API.

── FUTURE ML UPGRADE SLOT ────────────────────────────────────────────────────
When you have enough interaction data (saves, views, clicks):
  1. Build a user-item matrix from favourites / listing views.
  2. Train sklearn NearestNeighbors or a matrix factorisation model.
  3. Replace `_content_based_score` with model inference.
  4. Keep the same `recommend()` interface — Node backend won't need changing.
──────────────────────────────────────────────────────────────────────────────
"""

from typing import Optional


def _content_based_score(candidate: dict, reference: dict) -> float:
    """
    Score how similar `candidate` is to `reference`.
    Higher = more similar. Simple weighted feature matching.
    """
    score = 0.0

    # Same make → strong signal
    if (candidate.get("make") or "").upper() == (reference.get("make") or "").upper():
        score += 40

    # Same model → even stronger
    if (candidate.get("model") or "").upper() == (reference.get("model") or "").upper():
        score += 30

    # Year proximity (within 3 years)
    try:
        year_diff = abs(int(candidate.get("year", 0)) - int(reference.get("year", 0)))
        if year_diff <= 1:
            score += 20
        elif year_diff <= 3:
            score += 10
    except (ValueError, TypeError):
        pass

    # Price proximity (within 20 %)
    try:
        ref_price  = float(reference.get("price", 0))
        cand_price = float(candidate.get("price", 0))
        if ref_price > 0 and cand_price > 0:
            ratio = abs(cand_price - ref_price) / ref_price
            if ratio <= 0.10:
                score += 10
            elif ratio <= 0.20:
                score += 5
    except (ValueError, TypeError):
        pass

    # Same fuel type
    if (candidate.get("fuelType") or "").upper() == (reference.get("fuelType") or "").upper():
        score += 5

    return score


def recommend(
    reference: dict,
    all_listings: list,
    exclude_id: Optional[str] = None,
    top_n: int = 6
) -> list:
    """
    Given a reference listing and a pool of all listings,
    return up to `top_n` most similar listings.

    :param reference:    The listing to find similarities for.
    :param all_listings: All available listings from the database.
    :param exclude_id:   ID of the reference listing to exclude from results.
    :param top_n:        How many recommendations to return.
    :returns:            List of listing dicts sorted by similarity score.
    """
    scored = []
    for listing in all_listings:
        lid = str(listing.get("_id", ""))
        if exclude_id and lid == str(exclude_id):
            continue
        s = _content_based_score(listing, reference)
        if s > 0:
            scored.append((s, listing))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [listing for _, listing in scored[:top_n]]
