from typing import Any, Optional
import asyncpg
import json


def _serialize_value(v: Any) -> Any:
    """Convert asyncpg types to JSON-safe Python types."""
    if hasattr(v, "isoformat"):
        return v.isoformat()
    if isinstance(v, (list, tuple)):
        return [_serialize_value(x) for x in v]
    if v is not None and not isinstance(v, (str, int, float, bool, dict, list)):
        return str(v)
    return v


def row_to_dict(row: Optional[asyncpg.Record]) -> Optional[dict]:
    if row is None:
        return None
    return {k: _serialize_value(v) for k, v in dict(row).items()}


def rows_to_list(rows: list[asyncpg.Record]) -> list[dict]:
    return [row_to_dict(r) for r in rows]


def success(data: Any, message: str = "Success", status_code: int = 200) -> dict:
    return {"success": True, "message": message, "data": data}


def parse_pagination(page: int = 1, limit: int = 20) -> tuple[int, int, int]:
    page  = max(1, page)
    limit = min(100, max(1, limit))
    offset = (page - 1) * limit
    return page, limit, offset


def paginated(data: list, total: int, page: int, limit: int) -> dict:
    return {
        "success": True,
        "data": data,
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if limit else 0,
            "hasNext": page * limit < total,
            "hasPrev": page > 1,
        }
    }
