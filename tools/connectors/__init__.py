"""Connector integration boundary for managed gateway accounts and local MCP servers.

Only the names below are cross-package surface; imports beyond it need a design decision.
Siblings: ``contract`` (states, actors, transition table), ``operation`` (the record),
``live`` (open operation per session), ``run`` (the lifecycle loop), ``managed`` / ``mcp``
(per-kind hooks), ``targets``, ``search``, ``dispatch``, ``gateway/`` (HTTP wire + client).
"""

from typing import TYPE_CHECKING

from tools.connectors.dispatch import dispatch_connector_batch, dispatch_connector_call
from tools.connectors.gateway.bridge import connector_describe, connector_search_hits
from tools.connectors.gateway.config import connectors_available
from tools.connectors.gateway.names import CONNECTOR_BATCH_SENTINEL, is_connector_name

if TYPE_CHECKING:
    from tools.connectors.tool import MANAGE_CONNECTIONS_SCHEMA, manage_connections


def __getattr__(name):
    """Load the registering tool only when a caller requests its public exports.

    Other connector modules (notably ``operation``) are imported by the TUI
    during server registration. Keeping that package path free of the tool
    import avoids racing registry discovery for ``tools.connectors.tool``.
    """
    if name not in {"MANAGE_CONNECTIONS_SCHEMA", "manage_connections"}:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    from tools.connectors.tool import MANAGE_CONNECTIONS_SCHEMA, manage_connections

    globals()["MANAGE_CONNECTIONS_SCHEMA"] = MANAGE_CONNECTIONS_SCHEMA
    globals()["manage_connections"] = manage_connections
    return globals()[name]

__all__ = [
    "CONNECTOR_BATCH_SENTINEL",
    "MANAGE_CONNECTIONS_SCHEMA",
    "connector_describe",
    "connector_search_hits",
    "connectors_available",
    "dispatch_connector_batch",
    "dispatch_connector_call",
    "is_connector_name",
    "manage_connections",
]
