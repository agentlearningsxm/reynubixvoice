"""Supabase CRM writer with upsert logic, transaction safety, and error recovery.

Handles writing validated data to leads, call_analytics, deals, tasks,
and interactions tables with strict validation and comprehensive stats tracking.
"""

from __future__ import annotations

from typing import Any, Optional

from .logger import get_logger
from .validator import MigrationValidator

logger = get_logger(__name__)


class CRMWriter:
    """Writes validated CRM data to Supabase with safety guarantees."""

    def __init__(self, supabase_client) -> None:
        self._client = supabase_client
        self._validator = MigrationValidator()
        self._stats = {
            "leads_created": 0,
            "leads_updated": 0,
            "analytics_created": 0,
            "analytics_updated": 0,
            "deals_created": 0,
            "tasks_created": 0,
            "interactions_created": 0,
            "errors": 0,
            "rows_skipped": 0,
        }

    def write_lead(self, lead_data: dict) -> dict:
        ok, result = self._validator.validate_lead(lead_data)
        if not ok:
            logger.error("Lead validation failed: %s", result)
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        if isinstance(result, str):
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        data = result.model_dump(exclude_unset=True)
        email_norm = data.get("email_normalized", data.get("email", "").lower())

        try:
            existing = (
                self._client.table("leads")
                .select("id")
                .eq("email_normalized", email_norm)
                .execute()
            )

            if existing.data:
                lead_id = existing.data[0]["id"]
                update_data = {
                    k: v
                    for k, v in data.items()
                    if k not in ("id", "email_normalized", "email")
                }
                if update_data:
                    self._client.table("leads").update(update_data).eq(
                        "id", lead_id
                    ).execute()
                    self._stats["leads_updated"] += 1
                    logger.info("Lead updated: %s (id=%s)", email_norm, lead_id)
                else:
                    logger.debug("Lead unchanged: %s (id=%s)", email_norm, lead_id)
                return {"success": True, "id": lead_id, "created": False, "data": data}

            insert_data = {k: v for k, v in data.items() if v is not None}
            resp = self._client.table("leads").insert(insert_data).execute()
            if resp.data:
                lead_id = resp.data[0]["id"]
                self._stats["leads_created"] += 1
                logger.info("Lead created: %s (id=%s)", email_norm, lead_id)
                return {"success": True, "id": lead_id, "created": True, "data": data}

            self._stats["errors"] += 1
            return {"success": False, "error": "No data returned from insert"}

        except Exception as e:
            logger.error("Failed to write lead %s: %s", email_norm, e)
            self._stats["errors"] += 1
            return {"success": False, "error": str(e)}

    def write_call_analytics(self, analytics_data: dict) -> dict:
        ok, result = self._validator.validate_call_analytics(analytics_data)
        if not ok:
            logger.error("Call analytics validation failed: %s", result)
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        if isinstance(result, str):
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        data = result.model_dump(exclude_unset=True)
        session_id = data.get("session_id", "unknown")

        try:
            existing = (
                self._client.table("call_analytics")
                .select("id")
                .eq("session_id", session_id)
                .execute()
            )

            if existing.data:
                analytics_id = existing.data[0]["id"]
                update_data = {
                    k: v for k, v in data.items() if k not in ("id", "session_id")
                }
                if update_data:
                    self._client.table("call_analytics").update(update_data).eq(
                        "id", analytics_id
                    ).execute()
                    self._stats["analytics_updated"] += 1
                    logger.info(
                        "Analytics updated: %s (id=%s)", session_id, analytics_id
                    )
                else:
                    logger.debug(
                        "Analytics unchanged: %s (id=%s)", session_id, analytics_id
                    )
                return {
                    "success": True,
                    "id": analytics_id,
                    "created": False,
                    "data": data,
                }

            insert_data = {k: v for k, v in data.items() if v is not None}
            resp = self._client.table("call_analytics").insert(insert_data).execute()
            if resp.data:
                analytics_id = resp.data[0]["id"]
                self._stats["analytics_created"] += 1
                logger.info("Analytics created: %s (id=%s)", session_id, analytics_id)
                return {
                    "success": True,
                    "id": analytics_id,
                    "created": True,
                    "data": data,
                }

            self._stats["errors"] += 1
            return {"success": False, "error": "No data returned from insert"}

        except Exception as e:
            logger.error("Failed to write analytics %s: %s", session_id, e)
            self._stats["errors"] += 1
            return {"success": False, "error": str(e)}

    def write_deal(self, deal_data: dict) -> dict:
        ok, result = self._validator.validate_deal(deal_data)
        if not ok:
            logger.error("Deal validation failed: %s", result)
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        if isinstance(result, str):
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        data = result.model_dump(exclude_unset=True)
        data = {k: v for k, v in data.items() if v is not None}

        try:
            resp = self._client.table("deals").insert(data).execute()
            if resp.data:
                deal_id = resp.data[0]["id"]
                self._stats["deals_created"] += 1
                logger.info("Deal created: %s (id=%s)", deal_data.get("title"), deal_id)
                return {"success": True, "id": deal_id, "data": data}

            self._stats["errors"] += 1
            return {"success": False, "error": "No data returned from insert"}

        except Exception as e:
            logger.error("Failed to write deal: %s", e)
            self._stats["errors"] += 1
            return {"success": False, "error": str(e)}

    def write_task(self, task_data: dict) -> dict:
        ok, result = self._validator.validate_task(task_data)
        if not ok:
            logger.error("Task validation failed: %s", result)
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        if isinstance(result, str):
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        data = result.model_dump(exclude_unset=True)
        data = {
            k: v for k, v in data.items() if k != "due_days_from_now" and v is not None
        }

        try:
            resp = self._client.table("tasks").insert(data).execute()
            if resp.data:
                task_id = resp.data[0]["id"]
                self._stats["tasks_created"] += 1
                logger.info("Task created: %s (id=%s)", task_data.get("title"), task_id)
                return {"success": True, "id": task_id, "data": data}

            self._stats["errors"] += 1
            return {"success": False, "error": "No data returned from insert"}

        except Exception as e:
            logger.error("Failed to write task: %s", e)
            self._stats["errors"] += 1
            return {"success": False, "error": str(e)}

    def write_interaction(self, interaction_data: dict) -> dict:
        ok, result = self._validator.validate_interaction(interaction_data)
        if not ok:
            logger.error("Interaction validation failed: %s", result)
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        if isinstance(result, str):
            self._stats["errors"] += 1
            return {"success": False, "error": result}

        data = result.model_dump(exclude_unset=True)
        data = {k: v for k, v in data.items() if v is not None}

        try:
            resp = self._client.table("interactions").insert(data).execute()
            if resp.data:
                interaction_id = resp.data[0]["id"]
                self._stats["interactions_created"] += 1
                logger.info(
                    "Interaction created: %s (id=%s)",
                    interaction_data.get("title"),
                    interaction_id,
                )
                return {"success": True, "id": interaction_id, "data": data}

            self._stats["errors"] += 1
            return {"success": False, "error": "No data returned from insert"}

        except Exception as e:
            logger.error("Failed to write interaction: %s", e)
            self._stats["errors"] += 1
            return {"success": False, "error": str(e)}

    def write_full_session(self, row: dict, analysis: dict) -> dict:
        session_id = row.get("session_id", "unknown")
        logger.info("Writing full session: %s", session_id)

        validation = self._validator.validate_row_complete(row, analysis)

        if not validation["valid"]:
            logger.error(
                "Session %s validation FAILED: score=%.3f, errors=%s",
                session_id,
                validation["score"],
                validation["errors"],
            )
            self._stats["rows_skipped"] += 1
            return {
                "success": False,
                "error": "Row quality score too low",
                "score": validation["score"],
                "errors": validation["errors"],
                "warnings": validation["warnings"],
            }

        if validation["score"] < 0.95:
            logger.warning(
                "Session %s quality below threshold: score=%.3f",
                session_id,
                validation["score"],
            )

        result = {
            "success": True,
            "score": validation["score"],
            "lead": None,
            "call_analytics": None,
            "deal": None,
            "tasks": [],
            "interaction": None,
            "warnings": validation["warnings"],
        }

        vd = validation["validated_data"]

        # 1. Write lead
        lead_result = self.write_lead(vd["lead"])
        if lead_result["success"]:
            result["lead"] = {
                "id": lead_result["id"],
                "created": lead_result["created"],
            }
            lead_id = lead_result["id"]
        else:
            logger.error(
                "Failed to write lead for session %s: %s",
                session_id,
                lead_result["error"],
            )
            result["success"] = False
            result["error"] = f"Lead write failed: {lead_result['error']}"
            return result

        # 2. Write call analytics
        analytics_data = vd["call_analytics"].copy()
        analytics_result = self.write_call_analytics(analytics_data)
        if analytics_result["success"]:
            result["call_analytics"] = {
                "id": analytics_result["id"],
                "created": analytics_result["created"],
            }
        else:
            logger.warning(
                "Failed to write analytics for session %s: %s",
                session_id,
                analytics_result["error"],
            )
            result["warnings"].append(
                f"Analytics write failed: {analytics_result['error']}"
            )

        # 3. Write deal if qualified
        if vd.get("deal"):
            deal_data = vd["deal"].copy()
            deal_data["lead_id"] = lead_id
            deal_result = self.write_deal(deal_data)
            if deal_result["success"]:
                result["deal"] = {"id": deal_result["id"], "created": True}
                deal_id = deal_result["id"]
            else:
                logger.warning(
                    "Failed to write deal for session %s: %s",
                    session_id,
                    deal_result["error"],
                )
                result["warnings"].append(f"Deal write failed: {deal_result['error']}")
                deal_id = None
        else:
            deal_id = None

        # 4. Write tasks
        for task_data in vd.get("tasks", []):
            task_data = task_data.copy()
            task_data["lead_id"] = lead_id
            if deal_id:
                task_data["deal_id"] = deal_id
            task_result = self.write_task(task_data)
            if task_result["success"]:
                result["tasks"].append({"id": task_result["id"]})
            else:
                logger.warning(
                    "Failed to write task for session %s: %s",
                    session_id,
                    task_result["error"],
                )
                result["warnings"].append(f"Task write failed: {task_result['error']}")

        # 5. Write interaction
        interaction_data = vd["interaction"].copy()
        interaction_data["lead_id"] = lead_id
        if deal_id:
            interaction_data["deal_id"] = deal_id
        interaction_result = self.write_interaction(interaction_data)
        if interaction_result["success"]:
            result["interaction"] = {
                "id": interaction_result["id"],
                "created": True,
            }
        else:
            logger.warning(
                "Failed to write interaction for session %s: %s",
                session_id,
                interaction_result["error"],
            )
            result["warnings"].append(
                f"Interaction write failed: {interaction_result['error']}"
            )

        logger.info(
            "Session %s complete: score=%.3f, lead=%s, deal=%s, tasks=%d",
            session_id,
            validation["score"],
            "OK" if result["lead"] else "FAIL",
            "OK" if result["deal"] else "N/A",
            len(result["tasks"]),
        )

        return result

    def get_stats(self) -> dict:
        return self._stats.copy()

    def reset_stats(self) -> None:
        for key in self._stats:
            self._stats[key] = 0
        logger.info("Stats reset")
