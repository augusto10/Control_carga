import runpy
import time
from pathlib import Path

import pyautogui
import pygetwindow as gw


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = PROJECT_ROOT / "scripts" / "erp_emitir_lista_separacao.py"
ENV_PATH = PROJECT_ROOT / ".env"


def load_module():
    return runpy.run_path(str(SCRIPT_PATH), run_name="erp_module")


def activate_erp_window():
    windows = gw.getWindowsWithTitle("Santri ADM - ESPLENDOR")
    if not windows:
        raise RuntimeError("Janela Sanctri ADM - ESPLENDOR nao encontrada.")
    window = windows[0]
    window.activate()
    time.sleep(1)
    return window


def open_adm_and_login(module):
    existing = gw.getWindowsWithTitle("Santri ADM - ESPLENDOR")
    login_windows = gw.getWindowsWithTitle("Login do Sistema")

    if not existing and not login_windows:
        module["load_env_file"](str(ENV_PATH))
        module["start_erp"]()
        time.sleep(10)
        existing = gw.getWindowsWithTitle("Santri ADM - ESPLENDOR")
        login_windows = gw.getWindowsWithTitle("Login do Sistema")

    if login_windows:
        login_windows[0].activate()
        module["load_pyautogui"]()
        gui = module["load_pyautogui"]()
        module["fazer_login_no_erp"](gui)
        time.sleep(5)

    return activate_erp_window()


def navigate_to_controle_separacao():
    pyautogui.FAILSAFE = False
    pyautogui.hotkey("alt", "s")
    time.sleep(1)

    for _ in range(10):
        pyautogui.press("down")
        time.sleep(0.15)

    pyautogui.press("enter")
    time.sleep(3)


def main():
    module = load_module()
    module["load_env_file"](str(ENV_PATH))
    window = open_adm_and_login(module)
    print(f"JANELA ATIVA: {window.title}")
    navigate_to_controle_separacao()

    titles = [item.title for item in gw.getAllWindows() if item.title]
    print("TITULOS APOS ENTER:", titles)
    print("STATUS: FLUXO CHEGOU ATE CONTROLE DE SEPARACAO; CONFIRME A TELA NO ERP")


if __name__ == "__main__":
    main()
