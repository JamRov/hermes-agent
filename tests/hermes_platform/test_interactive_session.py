"""Exercise Windows session eligibility on the real console/RDP host."""
from __future__ import annotations

import json
import subprocess
import sys

import pytest

from hermes_platform.host import facts


@pytest.mark.platforms("windows")
def test_current_window_station_determines_interactive_session():
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.WinDLL("user32", use_last_error=True)
    user32.GetProcessWindowStation.argtypes = []
    user32.GetProcessWindowStation.restype = wintypes.HANDLE
    user32.GetUserObjectInformationW.argtypes = [
        wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p,
        wintypes.DWORD, ctypes.POINTER(wintypes.DWORD),
    ]
    user32.GetUserObjectInformationW.restype = wintypes.BOOL
    name = ctypes.create_unicode_buffer(256)
    needed = wintypes.DWORD()
    assert user32.GetUserObjectInformationW(
        user32.GetProcessWindowStation(), 2, name,
        ctypes.sizeof(name), ctypes.byref(needed),
    )
    # WinSta0 is the interactive station in both console and RDP sessions.
    assert facts.interactive_session() == (name.value.casefold() == "winsta0")


@pytest.mark.platforms("windows")
def test_private_window_station_is_not_interactive():
    # Change only the child process's station; never disturb the test runner's UI.
    result = subprocess.run([sys.executable, "-c", r'''
import ctypes
from ctypes import wintypes
import json
from hermes_platform.host import facts
user32 = ctypes.WinDLL("user32", use_last_error=True)
user32.CreateWindowStationW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.c_void_p]
user32.CreateWindowStationW.restype = wintypes.HANDLE
user32.SetProcessWindowStation.argtypes = [wintypes.HANDLE]
user32.SetProcessWindowStation.restype = wintypes.BOOL
user32.CloseWindowStation.argtypes = [wintypes.HANDLE]
user32.CloseWindowStation.restype = wintypes.BOOL
user32.GetProcessWindowStation.argtypes = []
user32.GetProcessWindowStation.restype = wintypes.HANDLE
original = user32.GetProcessWindowStation()
station = user32.CreateWindowStationW(None, 0, 0x37f, None)
if not station:
    raise ctypes.WinError(ctypes.get_last_error())
try:
    if not user32.SetProcessWindowStation(station):
        raise ctypes.WinError(ctypes.get_last_error())
    print(json.dumps(facts.interactive_session()))
finally:
    if not user32.SetProcessWindowStation(original):
        raise ctypes.WinError(ctypes.get_last_error())
    if not user32.CloseWindowStation(station):
        raise ctypes.WinError(ctypes.get_last_error())
'''], capture_output=True, text=True, timeout=20, check=True)
    assert json.loads(result.stdout) is False
