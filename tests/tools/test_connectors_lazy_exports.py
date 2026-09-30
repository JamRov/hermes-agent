"""Connector package exports must not import the tool during submodule imports."""

import subprocess
import sys
from pathlib import Path


def test_operation_import_is_lightweight_and_lazy_exports_register_tool():
    repo = Path(__file__).resolve().parents[2]
    code = """
import importlib
import sys

operation = importlib.import_module("tools.connectors.operation")
assert operation.ConnectionOperation
assert "tools.connectors.tool" not in sys.modules, (
    "importing the operation module eagerly loaded the connector tool"
)

from tools.connectors import MANAGE_CONNECTIONS_SCHEMA, manage_connections
from tools.registry import registry

assert callable(manage_connections)
assert MANAGE_CONNECTIONS_SCHEMA["name"] == "manage_connections"
entry = registry.get_entry("manage_connections")
assert entry is not None
assert entry.schema is MANAGE_CONNECTIONS_SCHEMA
assert "tools.connectors.tool" in sys.modules
"""
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=repo,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )

    assert result.returncode == 0, result.stderr or result.stdout
