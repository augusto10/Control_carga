import argparse
import contextlib
import io
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple


Coord = Tuple[int, int]
ACTIVE_ERP_WINDOW = None
ACTIVE_UI_WINDOW = None


COORD_CONFIG_STEPS = [
    ("ERP_COORD_CAMPO_CODIGO", "campo Codigo do login"),
    ("ERP_COORD_CAMPO_SENHA", "campo Senha do login"),
    ("ERP_COORD_CAMPO_EMPRESA", "campo Empresa"),
    ("ERP_COORD_MENU_ESTOQUE", "menu Estoque"),
    ("ERP_COORD_MENU_CONTROLE_SEPARACAO", "menu Controle de Separacao"),
    ("ERP_COORD_CAMPO_LOCAL_PRODUTO", "campo Local de Produto"),
    ("ERP_COORD_RETIRADA_LOJAS_REDE", "campo Retirada lojas Rede"),
    ("ERP_COORD_CAMPO_PREVISAO_INICIAL", "campo Previsao Inicial"),
    ("ERP_COORD_CAMPO_PREVISAO_FINAL", "campo Previsao Final"),
    ("ERP_COORD_CAMPO_ORDENACAO", "campo Ordenacao"),
    ("ERP_COORD_BOTAO_PROCESSAR", "botao Processar"),
    ("ERP_COORD_ABA_AGUARDANDO_SEPARACAO", "aba Aguardando Separacao"),
    ("ERP_COORD_CAMPO_PESQUISA_PEDIDO", "campo de pesquisa do pedido, se existir"),
    ("ERP_COORD_GRADE_PEDIDOS", "grade/linha de pedidos"),
    ("ERP_COORD_BOTAO_MARCAR_SIM", "botao Marcar como Sim"),
    ("ERP_COORD_BOTAO_SEPARAR", "botao Separar"),
]


def emit_log(message: str) -> None:
    print(message, flush=True)


def env_str(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on", "sim", "s"}


def env_list(name: str) -> list[str]:
    raw = env_str(name)
    if not raw:
        return []
    return [piece.strip() for piece in raw.split("|||") if piece.strip()]


def load_env_file(env_path: str) -> None:
    path = Path(env_path)
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


def parse_coord(name: str) -> Optional[Coord]:
    raw = env_str(name)
    if not raw:
        return None
    pieces = [piece.strip() for piece in raw.split(",")]
    if len(pieces) != 2:
        raise RuntimeError(f"Coordenada invalida em {name}. Use o formato X,Y.")
    try:
        return int(pieces[0]), int(pieces[1])
    except ValueError as exc:
        raise RuntimeError(f"Coordenada invalida em {name}. Use o formato X,Y.") from exc


def require_coord(name: str) -> Coord:
    coord = parse_coord(name)
    if coord is None:
        raise RuntimeError(f"Configure {name} com coordenadas no formato X,Y.")
    return coord


def load_pyautogui():
    try:
        import pyautogui  # type: ignore

        pyautogui.PAUSE = env_float("ERP_PYAUTOGUI_PAUSE", 0.4)
        pyautogui.FAILSAFE = env_bool("ERP_PYAUTOGUI_FAILSAFE", True)
        return pyautogui
    except Exception as exc:
        raise RuntimeError(
            "pyautogui nao esta disponivel. Instale com: pip install pyautogui pygetwindow"
        ) from exc


def load_window_tools():
    try:
        import pygetwindow as gw  # type: ignore

        return gw
    except Exception:
        return None


def load_pywinauto():
    try:
        from pywinauto import Desktop  # type: ignore

        return Desktop
    except Exception as exc:
        raise RuntimeError(
            "pywinauto nao esta disponivel. Instale com: pip install pywinauto"
        ) from exc


def use_hybrid_driver() -> bool:
    return env_str("ERP_DRIVER", "hybrid").lower() == "hybrid"


def get_ui_window():
    global ACTIVE_UI_WINDOW
    if ACTIVE_UI_WINDOW is not None:
        return ACTIVE_UI_WINDOW

    Desktop = load_pywinauto()
    title_hint = env_str("ERP_WINDOW_TITLE", "Santri ADM")
    desktop = Desktop(backend="uia")
    window = desktop.window(title_re=f".*{re.escape(title_hint)}.*")
    if not window.exists(timeout=2):
        raise RuntimeError(f"Nao encontrei a janela do ERP com titulo contendo {title_hint!r}.")
    ACTIVE_UI_WINDOW = window
    return window


def ui_control(title: str, control_type: str):
    window = get_ui_window()
    control = window.child_window(title=title, control_type=control_type)
    return control if control.exists(timeout=1) else None


def ui_click_named(title: str, control_type: str, label: str) -> bool:
    control = ui_control(title, control_type)
    if not control:
        emit_log(f"Controle pywinauto nao encontrado: {label}")
        return False
    emit_log(f"Clicando via pywinauto em {label}")
    control.click_input()
    return True


def ui_set_text(control, text: str):
    if hasattr(control, "select"):
        try:
            control.select(text)
            return
        except Exception:
            pass
    try:
        control.set_edit_text(text)
    except Exception:
        control.click_input()
        control.type_keys("^a{BACKSPACE}" + text, with_spaces=True)


def ui_set_filter_by_class(control_type: str, class_name: str, index: int, text: str, label: str) -> bool:
    window = get_ui_window()
    controls = window.descendants(control_type=control_type, class_name=class_name)
    if index >= len(controls):
        emit_log(f"Controle pywinauto nao encontrado: {label}; usando coordenada")
        return False
    emit_log(f"Preenchendo via pywinauto: {label}")
    ui_set_text(controls[index], text)
    return True


def parse_args():
    parser = argparse.ArgumentParser(
        description="Automacao local para emissao da lista de separacao no ERP."
    )
    parser.add_argument("--pedidos-json", help="Array JSON com os pedidos.")
    parser.add_argument(
        "--capture-mouse",
        action="store_true",
        help="Mostra a posicao do mouse continuamente para mapear coordenadas.",
    )
    parser.add_argument(
        "--capture-config",
        action="store_true",
        help="Assistente para capturar coordenadas e salvar no .env.",
    )
    parser.add_argument(
        "--env-path",
        default=".env",
        help="Arquivo .env onde as coordenadas serao gravadas.",
    )
    parser.add_argument(
        "--coord-mode",
        choices=["screen", "window"],
        default=None,
        help="screen salva coordenadas absolutas; window salva relativo a janela do ERP.",
    )
    parser.add_argument(
        "--inspect-ui",
        action="store_true",
        help="Inspeciona os controles da janela do ERP usando pywinauto.",
    )
    parser.add_argument(
        "--inspect-output",
        default="tmp/erp_ui_inspection.txt",
        help="Arquivo onde o relatorio de inspecao sera salvo.",
    )
    parser.add_argument(
        "--driver",
        choices=["coords", "hybrid"],
        default=None,
        help="coords usa apenas PyAutoGUI; hybrid usa pywinauto com fallback por coordenadas.",
    )
    return parser.parse_args()


def capture_mouse_position(pyautogui):
    emit_log("Mova o mouse para os campos/botoes desejados. Ctrl+C para sair.")
    try:
        while True:
            x, y = pyautogui.position()
            print(f"\rX={x} Y={y}   ", end="", flush=True)
            time.sleep(0.1)
    except KeyboardInterrupt:
        print()
        emit_log("Captura finalizada.")


def find_erp_window(pyautogui):
    gw = load_window_tools()
    title_hint = env_str("ERP_WINDOW_TITLE")

    if gw and title_hint:
        windows = gw.getWindowsWithTitle(title_hint)
        if windows:
            return windows[0]

    try:
        return pyautogui.getActiveWindow()
    except Exception:
        return None


def get_erp_window(pyautogui):
    global ACTIVE_ERP_WINDOW

    if ACTIVE_ERP_WINDOW is not None:
        return ACTIVE_ERP_WINDOW

    ACTIVE_ERP_WINDOW = find_erp_window(pyautogui)
    return ACTIVE_ERP_WINDOW


def get_coord_mode() -> str:
    return env_str("ERP_COORD_MODE", "screen").lower()


def to_screen_coord(pyautogui, coord: Coord) -> Coord:
    if get_coord_mode() != "window":
        return coord

    window = get_erp_window(pyautogui)
    if not window:
        raise RuntimeError(
            "ERP_COORD_MODE=window exige que a janela do ERP esteja ativa ou que ERP_WINDOW_TITLE esteja configurado."
        )

    return int(window.left) + coord[0], int(window.top) + coord[1]


def from_screen_coord(pyautogui, coord: Coord, mode: str) -> Coord:
    if mode != "window":
        return coord

    window = get_erp_window(pyautogui)
    if not window:
        raise RuntimeError(
            "Nao encontrei a janela do ERP para salvar coordenadas relativas. Configure ERP_WINDOW_TITLE ou deixe o ERP ativo."
        )

    return coord[0] - int(window.left), coord[1] - int(window.top)


def update_env_file(env_path: str, values: dict[str, str]):
    path = Path(env_path)
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    lines = text.splitlines()
    found = set()
    next_lines = []

    for line in lines:
        stripped = line.strip()
        key = stripped.split("=", 1)[0] if "=" in stripped else ""
        if key in values and not stripped.startswith("#"):
            next_lines.append(f"{key}={values[key]}")
            found.add(key)
        else:
            next_lines.append(line)

    missing = [key for key in values if key not in found]
    if missing and next_lines and next_lines[-1].strip():
        next_lines.append("")
    for key in missing:
        next_lines.append(f"{key}={values[key]}")

    path.write_text("\n".join(next_lines) + "\n", encoding="utf-8")


def capture_config(pyautogui, env_path: str, coord_mode: Optional[str]):
    mode = coord_mode or get_coord_mode()
    values = {
        "ERP_COORD_MODE": mode,
    }

    emit_log("Assistente de coordenadas do ERP.")
    emit_log("Deixe o ERP aberto na tela correta quando cada ponto for solicitado.")
    emit_log("Para pular um ponto opcional, pressione Enter sem mover/confirmar e digite P.")

    if mode == "window":
        window = get_erp_window(pyautogui)
        if not window:
            raise RuntimeError(
                "Nao encontrei a janela do ERP. Clique na janela do ERP e execute novamente, ou configure ERP_WINDOW_TITLE."
            )
        emit_log(
            f"Usando coordenadas relativas a janela ativa: {getattr(window, 'title', '')} "
            f"({window.left},{window.top})"
        )

    for key, label in COORD_CONFIG_STEPS:
        answer = input(f"\nPosicione o mouse em: {label}. Enter para salvar, P para pular: ")
        if answer.strip().lower() == "p":
            continue

        x, y = pyautogui.position()
        coord = from_screen_coord(pyautogui, (x, y), mode)
        values[key] = f"{coord[0]},{coord[1]}"
        emit_log(f"{key}={values[key]}")

    update_env_file(env_path, values)
    emit_log(f"Coordenadas salvas em {env_path}.")


def inspect_erp_ui(output_path: str):
    Desktop = load_pywinauto()
    title_hint = env_str("ERP_WINDOW_TITLE", "Santri ADM")
    backends = ["uia", "win32"]
    errors = []

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    for backend in backends:
        try:
            desktop = Desktop(backend=backend)
            window_spec = desktop.window(title_re=f".*{re.escape(title_hint)}.*")

            if not window_spec.exists(timeout=2):
                errors.append(f"{backend}: nenhuma janela encontrada com titulo contendo {title_hint!r}.")
                continue

            try:
                window_spec.set_focus()
            except Exception:
                pass

            buffer = io.StringIO()
            with contextlib.redirect_stdout(buffer):
                window_spec.print_control_identifiers()

            Path(output_path).write_text(
                f"Backend: {backend}\n"
                f"Title hint: {title_hint}\n"
                f"Window: {window_spec.window_text()}\n\n"
                f"{buffer.getvalue()}",
                encoding="utf-8",
            )

            emit_log(f"Inspecao salva em {output_path} usando backend {backend}.")
            return
        except Exception as exc:
            errors.append(f"{backend}: {exc}")

    raise RuntimeError("Nao foi possivel inspecionar a UI do ERP. " + " | ".join(errors))


def normalize_pedidos(raw_value: str):
    values = json.loads(raw_value)
    if not isinstance(values, list):
        raise ValueError("pedidos-json precisa ser um array.")

    pedidos = []
    for value in values:
        pedido = "".join(ch for ch in str(value).strip() if ch.isdigit())
        if pedido:
            pedidos.append(pedido)

    if not pedidos:
        raise ValueError("Nenhum pedido valido informado.")

    return pedidos


def ensure_erp_configuration():
    required = {
        "ERP_EXECUTABLE_PATH": env_str("ERP_EXECUTABLE_PATH"),
        "ERP_CODIGO": env_str("ERP_CODIGO", env_str("ERP_USUARIO")),
        "ERP_SENHA": env_str("ERP_SENHA"),
        "ERP_COORD_BOTAO_PROCESSAR": env_str("ERP_COORD_BOTAO_PROCESSAR"),
        "ERP_COORD_GRADE_PEDIDOS": env_str("ERP_COORD_GRADE_PEDIDOS"),
        "ERP_COORD_BOTAO_MARCAR_SIM": env_str("ERP_COORD_BOTAO_MARCAR_SIM"),
        "ERP_COORD_BOTAO_SEPARAR": env_str("ERP_COORD_BOTAO_SEPARAR"),
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        raise RuntimeError(
            "Configure as variaveis do ERP antes de usar a automacao: "
            + ", ".join(missing)
        )


def click_coord(pyautogui, coord: Coord, label: str, clicks: int = 1, interval: float = 0.15):
    screen_coord = to_screen_coord(pyautogui, coord)
    emit_log(f"Clicando em {label}: {screen_coord[0]},{screen_coord[1]}")
    pyautogui.click(screen_coord[0], screen_coord[1], clicks=clicks, interval=interval)


def select_all_and_type(pyautogui, text: str):
    pyautogui.hotkey("ctrl", "a")
    pyautogui.press("backspace")
    if text:
        pyautogui.write(text)


def fill_field(pyautogui, coord: Coord, label: str, text: str, press_enter: bool = False):
    click_coord(pyautogui, coord, label, clicks=2)
    time.sleep(0.2)
    select_all_and_type(pyautogui, text)
    if press_enter:
        pyautogui.press("enter")


def wait_seconds(label: str, seconds: float):
    emit_log(f"Aguardando {seconds:.1f}s: {label}")
    time.sleep(seconds)


def start_erp():
    executable_path = env_str("ERP_EXECUTABLE_PATH")
    executable_args = env_list("ERP_EXECUTABLE_ARGS")
    working_directory = env_str("ERP_WORKING_DIRECTORY")
    command = [executable_path, *executable_args]

    emit_log(f"Abrindo ERP: {' '.join(command)}")
    subprocess.Popen(
        command,
        shell=False,
        cwd=working_directory or None,
    )


def focus_erp_window(pyautogui):
    global ACTIVE_ERP_WINDOW
    gw = load_window_tools()
    title_hint = env_str("ERP_WINDOW_TITLE")
    wait_seconds("janela do ERP abrir", env_float("ERP_STARTUP_WAIT_SECONDS", 8.0))

    if gw and title_hint:
        windows = gw.getWindowsWithTitle(title_hint)
        if windows:
            window = windows[0]
            try:
                window.restore()
            except Exception:
                pass
            try:
                window.activate()
                ACTIVE_ERP_WINDOW = window
                wait_seconds("foco da janela", 1.0)
                return
            except Exception:
                pass

    activate_coord = parse_coord("ERP_COORD_JANELA_PRINCIPAL")
    if activate_coord:
        click_coord(pyautogui, activate_coord, "janela principal ERP")
        wait_seconds("foco manual da janela", 0.8)


def fazer_login_no_erp(pyautogui):
    codigo = env_str("ERP_CODIGO", env_str("ERP_USUARIO"))
    senha = env_str("ERP_SENHA")
    empresa_nome = env_str("ERP_EMPRESA_NOME", "1 ESPLENDOR ATACADISTA")

    emit_log("Executando login no ERP...")

    codigo_coord = parse_coord("ERP_COORD_CAMPO_CODIGO")
    senha_coord = parse_coord("ERP_COORD_CAMPO_SENHA")
    empresa_coord = parse_coord("ERP_COORD_CAMPO_EMPRESA")

    if codigo_coord:
        fill_field(pyautogui, codigo_coord, "campo codigo", codigo)
    else:
        pyautogui.write(codigo)

    if senha_coord:
        fill_field(pyautogui, senha_coord, "campo senha", senha)
    else:
        pyautogui.press("tab")
        pyautogui.write(senha)

    pyautogui.press("enter")
    wait_seconds("pos-login", env_float("ERP_LOGIN_WAIT_SECONDS", 5.0))

    if empresa_coord:
        fill_field(pyautogui, empresa_coord, "campo empresa", empresa_nome, press_enter=True)
    else:
        pyautogui.write(empresa_nome)
        pyautogui.press("enter")

    wait_seconds("entrada na empresa", env_float("ERP_EMPRESA_WAIT_SECONDS", 5.0))


def abrir_tela_controle_separacao(pyautogui):
    emit_log("Abrindo Estoque > Controle de Separacao...")
    if not (use_hybrid_driver() and ui_click_named("Estoque", "MenuItem", "menu Estoque")):
        click_coord(pyautogui, require_coord("ERP_COORD_MENU_ESTOQUE"), "menu Estoque")
    wait_seconds("abertura do menu Estoque", 0.8)
    if not (use_hybrid_driver() and ui_click_named("Controle de Separação", "MenuItem", "menu Controle de Separacao")):
        click_coord(
            pyautogui,
            require_coord("ERP_COORD_MENU_CONTROLE_SEPARACAO"),
            "menu Controle de Separacao",
        )
    wait_seconds(
        "carregamento da tela Controle de Separacao",
        env_float("ERP_SEPARACAO_SCREEN_WAIT_SECONDS", 4.0),
    )


def preparar_filtros(pyautogui):
    hoje = datetime.now()
    ano_erp = hoje.year + int(env_str("ERP_ANO_OFFSET", "1"))
    data_inicio = hoje.replace(year=ano_erp, day=1).strftime("%d/%m/%Y")
    data_final = hoje.replace(year=ano_erp).strftime("%d/%m/%Y")
    local_produto = env_str("ERP_LOCAL_PRODUTO", "1,2,3,5")
    retirada_lojas_rede = env_str("ERP_RETIRADA_LOJAS_REDE", "NAO")

    emit_log("Preenchendo filtros da tela de separacao...")
    if use_hybrid_driver() and ui_click_named("Filtros", "TabItem", "aba Filtros"):
        local_done = ui_set_filter_by_class("Edit", "TEdit", int(env_str("ERP_UI_LOCAL_INDEX", "0")), local_produto, "Local de Produto")
        initial_done = ui_set_filter_by_class("Edit", "TEditData", int(env_str("ERP_UI_DATA_INICIAL_INDEX", "0")), data_inicio, "Previsao Inicial")
        final_done = ui_set_filter_by_class("Edit", "TEditData", int(env_str("ERP_UI_DATA_FINAL_INDEX", "1")), data_final, "Previsao Final")
        retirada_done = ui_set_filter_by_class("ComboBox", "TXComboBox", int(env_str("ERP_UI_RETIRADA_INDEX", "0")), retirada_lojas_rede, "Retirada lojas Rede")
        ordenacao_done = ui_set_filter_by_class("ComboBox", "TXComboBox", int(env_str("ERP_UI_ORDENACAO_INDEX", "1")), env_str("ERP_ORDENACAO", "PEDIDO"), "Ordenacao")
    else:
        local_done = initial_done = final_done = retirada_done = ordenacao_done = False

    if not local_done:
        fill_field(pyautogui, require_coord("ERP_COORD_CAMPO_LOCAL_PRODUTO"), "campo Local de Produto", local_produto)
    if not retirada_done:
        fill_field(pyautogui, require_coord("ERP_COORD_RETIRADA_LOJAS_REDE"), "filtro Retirada lojas Rede", retirada_lojas_rede, press_enter=True)
    if not initial_done:
        fill_field(pyautogui, require_coord("ERP_COORD_CAMPO_PREVISAO_INICIAL"), "campo Previsao Inicial", data_inicio)
    if not final_done:
        fill_field(pyautogui, require_coord("ERP_COORD_CAMPO_PREVISAO_FINAL"), "campo Previsao Final", data_final)
    if not ordenacao_done:
        fill_field(pyautogui, require_coord("ERP_COORD_CAMPO_ORDENACAO"), "campo Ordenacao", env_str("ERP_ORDENACAO", "PEDIDO"), press_enter=True)
    click_coord(pyautogui, require_coord("ERP_COORD_BOTAO_PROCESSAR"), "botao Processar")
    wait_seconds("processamento dos filtros", env_float("ERP_PROCESSAR_WAIT_SECONDS", 6.0))
    if not (use_hybrid_driver() and ui_click_named("Aguardando separação", "TabItem", "aba Aguardando Separacao")):
        click_coord(pyautogui, require_coord("ERP_COORD_ABA_AGUARDANDO_SEPARACAO"), "aba Aguardando Separacao")
    wait_seconds("carregamento da aba Aguardando Separacao", 2.0)


def procurar_e_selecionar_pedido(pyautogui, pedido: str):
    emit_log(f"Selecionando pedido {pedido} no ERP...")
    search_coord = parse_coord("ERP_COORD_CAMPO_PESQUISA_PEDIDO")
    grade_coord = require_coord("ERP_COORD_GRADE_PEDIDOS")

    if search_coord:
        fill_field(pyautogui, search_coord, "campo de pesquisa do pedido", pedido, press_enter=True)
        wait_seconds("busca do pedido", env_float("ERP_SEARCH_WAIT_SECONDS", 1.5))
    else:
        click_coord(pyautogui, grade_coord, "grade de pedidos")
        pyautogui.hotkey("ctrl", "f")
        wait_seconds("abertura da busca na grade", 0.5)
        pyautogui.write(pedido)
        pyautogui.press("enter")
        wait_seconds("localizacao do pedido", env_float("ERP_SEARCH_WAIT_SECONDS", 1.5))
        if env_bool("ERP_FECHAR_BUSCA_COM_ESC", True):
            pyautogui.press("esc")

    click_coord(pyautogui, grade_coord, f"linha do pedido {pedido}", clicks=2)
    wait_seconds("selecao do pedido", 0.7)
    click_coord(pyautogui, require_coord("ERP_COORD_BOTAO_MARCAR_SIM"), "botao Marcar como Sim")
    wait_seconds("marcacao do pedido", 0.5)


def emitir_lista_para_pedidos(pyautogui, pedidos):
    for pedido in pedidos:
        procurar_e_selecionar_pedido(pyautogui, pedido)

    click_coord(pyautogui, require_coord("ERP_COORD_BOTAO_SEPARAR"), "botao Separar")
    wait_seconds("execucao da separacao", env_float("ERP_SEPARAR_WAIT_SECONDS", 3.0))


def main():
    args = parse_args()
    load_env_file(args.env_path)

    if args.inspect_ui:
        inspect_erp_ui(args.inspect_output)
        return

    pyautogui = load_pyautogui()

    if args.capture_mouse:
        capture_mouse_position(pyautogui)
        return

    if args.capture_config:
        capture_config(pyautogui, args.env_path, args.coord_mode)
        return

    if not args.pedidos_json:
        raise RuntimeError("Informe --pedidos-json ou use --capture-mouse.")

    pedidos = normalize_pedidos(args.pedidos_json)
    ensure_erp_configuration()

    start_erp()
    focus_erp_window(pyautogui)
    fazer_login_no_erp(pyautogui)
    abrir_tela_controle_separacao(pyautogui)
    preparar_filtros(pyautogui)
    emitir_lista_para_pedidos(pyautogui, pedidos)

    print(
        json.dumps(
            {
                "ok": True,
                "pedidos": pedidos,
                "message": f"{len(pedidos)} pedido(s) enviados para a rotina do ERP.",
            },
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        emit_log(f"ERRO: {exc}")
        print(
            json.dumps(
                {
                    "ok": False,
                    "message": str(exc),
                },
                ensure_ascii=True,
            )
        )
        sys.exit(1)
