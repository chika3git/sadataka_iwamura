#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

import requests


NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = os.getenv("NOTION_VERSION", "2022-06-28")


@dataclass(frozen=True)
class SyncConfig:
    token: str
    database_id: str
    out_path: str
    title_prop: str
    category_prop: str
    description_prop: str
    date_prop: str
    image_prop: str
    source_url_prop: str


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required env var: {name}")
    return value


def _get_config() -> SyncConfig:
    return SyncConfig(
        token=_required_env("NOTION_TOKEN"),
        database_id=_required_env("NOTION_DATABASE_ID"),
        out_path=os.getenv("NOTION_OUT_PATH", "5_output/web/data/notion_documents.json"),
        title_prop=os.getenv("NOTION_PROP_TITLE", "名前"),
        category_prop=os.getenv("NOTION_PROP_CATEGORY", "カテゴリ"),
        description_prop=os.getenv("NOTION_PROP_DESCRIPTION", "説明"),
        date_prop=os.getenv("NOTION_PROP_DATE", "日付"),
        image_prop=os.getenv("NOTION_PROP_IMAGE", "画像"),
        source_url_prop=os.getenv("NOTION_PROP_SOURCE_URL", "出典URL"),
    )


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _rich_text_to_plain(rich_text: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for item in rich_text or []:
        text = (item.get("plain_text") or "").strip()
        if text:
            parts.append(text)
    return "".join(parts).strip()


def _property_to_value(prop: dict[str, Any]) -> Any:
    prop_type = prop.get("type")
    if prop_type == "title":
        return _rich_text_to_plain(prop.get("title", []))
    if prop_type == "rich_text":
        return _rich_text_to_plain(prop.get("rich_text", []))
    if prop_type == "number":
        return prop.get("number")
    if prop_type == "select":
        sel = prop.get("select")
        return sel.get("name") if sel else None
    if prop_type == "multi_select":
        return [x.get("name") for x in (prop.get("multi_select") or []) if x.get("name")]
    if prop_type == "date":
        d = prop.get("date")
        if not d:
            return None
        return {
            "start": d.get("start"),
            "end": d.get("end"),
            "time_zone": d.get("time_zone"),
        }
    if prop_type == "url":
        return prop.get("url")
    if prop_type == "files":
        files = prop.get("files") or []
        out: list[dict[str, Any]] = []
        for f in files:
            ftype = f.get("type")
            if ftype == "file":
                file_obj = f.get("file") or {}
                out.append(
                    {
                        "name": f.get("name"),
                        "url": file_obj.get("url"),
                        "expiry_time": file_obj.get("expiry_time"),
                    }
                )
            elif ftype == "external":
                ext_obj = f.get("external") or {}
                out.append({"name": f.get("name"), "url": ext_obj.get("url")})
        return out
    if prop_type == "checkbox":
        return bool(prop.get("checkbox"))
    if prop_type == "email":
        return prop.get("email")
    if prop_type == "phone_number":
        return prop.get("phone_number")
    if prop_type == "created_time":
        return prop.get("created_time")
    if prop_type == "last_edited_time":
        return prop.get("last_edited_time")
    return None


def _query_database(session: requests.Session, token: str, database_id: str) -> list[dict[str, Any]]:
    url = f"{NOTION_API_BASE}/databases/{database_id}/query"
    payload: dict[str, Any] = {"page_size": 100}
    results: list[dict[str, Any]] = []
    while True:
        resp = session.post(url, headers=_headers(token), json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        results.extend(data.get("results") or [])
        if not data.get("has_more"):
            break
        payload["start_cursor"] = data.get("next_cursor")
    return results


def _pick_first_image_url(files_value: Any) -> Optional[str]:
    if not isinstance(files_value, list) or not files_value:
        return None
    first = files_value[0]
    if isinstance(first, dict):
        url = first.get("url")
        return url if isinstance(url, str) and url else None
    return None


def _build_documents(pages: list[dict[str, Any]], cfg: SyncConfig) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []
    for page in pages:
        props = page.get("properties") or {}
        computed: dict[str, Any] = {}
        for key, prop in props.items():
            computed[key] = _property_to_value(prop)

        title = computed.get(cfg.title_prop)
        category = computed.get(cfg.category_prop)
        description = computed.get(cfg.description_prop)
        date_value = computed.get(cfg.date_prop)
        image_value = computed.get(cfg.image_prop)
        source_url = computed.get(cfg.source_url_prop)

        documents.append(
            {
                "id": page.get("id"),
                "url": page.get("url"),
                "title": title if isinstance(title, str) else "",
                "category": category if isinstance(category, str) else None,
                "description": description if isinstance(description, str) else None,
                "date": date_value,
                "image_url": _pick_first_image_url(image_value),
                "source_url": source_url if isinstance(source_url, str) else None,
                "properties": computed,
                "last_edited_time": page.get("last_edited_time"),
            }
        )
    return documents


def main() -> int:
    cfg = _get_config()
    os.makedirs(os.path.dirname(cfg.out_path), exist_ok=True)

    with requests.Session() as session:
        pages = _query_database(session, cfg.token, cfg.database_id)
        documents = _build_documents(pages, cfg)

    out = {
        "generated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "notion_version": NOTION_VERSION,
        "database_id": cfg.database_id,
        "count": len(documents),
        "documents": documents,
    }

    with open(cfg.out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote {len(documents)} documents -> {cfg.out_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except requests.HTTPError as e:
        detail = ""
        try:
            detail = json.dumps(e.response.json(), ensure_ascii=False, indent=2)
        except Exception:
            if e.response is not None:
                detail = e.response.text
        print("Notion API error:", detail, file=sys.stderr)
        raise

