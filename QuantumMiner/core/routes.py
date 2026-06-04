from __future__ import annotations

import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Cookie, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from core.config import settings
from core.models import ROCKS, MinigameResultRequest, Player, UpgradeRequest
from core import game

router = APIRouter()
BASE_DIR = Path(__file__).parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")

_players: dict[str, Player] = {}


def _get_player(session_id: str | None) -> tuple[str, Player]:
    sid = session_id or str(uuid.uuid4())
    if sid not in _players:
        _players[sid] = Player()
    return sid, _players[sid]


def _set_cookie(response: Response, sid: str) -> None:
    response.set_cookie(settings.session_cookie, sid, httponly=True, samesite="lax")


@router.get("/", response_class=HTMLResponse)
async def index(request: Request, qm_session: Annotated[str | None, Cookie()] = None):
    sid, player = _get_player(qm_session)
    rocks_config = {k: v.model_dump() for k, v in ROCKS.items()}
    response = templates.TemplateResponse(
        "index.html",
        {"request": request, "player": player, "rocks_config": rocks_config},
    )
    _set_cookie(response, sid)
    return response


@router.post("/api/click")
async def click(response: Response, qm_session: Annotated[str | None, Cookie()] = None):
    sid, player = _get_player(qm_session)
    result = game.process_click(player)
    _set_cookie(response, sid)
    if result.get("error"):
        return {"error": True, "message": result["message"]}
    return {**result, "player": player.to_dict()}


@router.post("/api/auto_mine")
async def auto_mine(response: Response, qm_session: Annotated[str | None, Cookie()] = None):
    sid, player = _get_player(qm_session)
    result = game.process_auto_mine(player)
    _set_cookie(response, sid)
    return {**result, "player": player.to_dict()}


@router.post("/api/sell")
async def sell(response: Response, qm_session: Annotated[str | None, Cookie()] = None):
    sid, player = _get_player(qm_session)
    earned = game.process_sell(player)
    _set_cookie(response, sid)
    return {"success": True, "earned": earned, "player": player.to_dict()}


@router.post("/api/upgrade")
async def upgrade(body: UpgradeRequest, response: Response, qm_session: Annotated[str | None, Cookie()] = None):
    sid, player = _get_player(qm_session)
    result = game.process_upgrade(player, body.type)
    _set_cookie(response, sid)
    return {**result, "player": player.to_dict()}


@router.post("/api/prestige")
async def prestige(response: Response, qm_session: Annotated[str | None, Cookie()] = None):
    sid, player = _get_player(qm_session)
    result = game.process_prestige(player)
    _set_cookie(response, sid)
    return {**result, "player": player.to_dict()}


@router.post("/api/market/update")
async def market_update(response: Response, qm_session: Annotated[str | None, Cookie()] = None):
    sid, player = _get_player(qm_session)
    result = game.process_market_update(player)
    _set_cookie(response, sid)
    return {**result, "player": player.to_dict()}


@router.post("/api/minigame/result")
async def minigame_result(body: MinigameResultRequest, response: Response, qm_session: Annotated[str | None, Cookie()] = None):
    sid, player = _get_player(qm_session)
    result = game.process_minigame_reward(player, body.success)
    _set_cookie(response, sid)
    return {**result, "player": player.to_dict()}
