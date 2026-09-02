import { spawn } from 'child_process';
import path from 'path';

export type EmitirListaSeparacaoInput = {
  pedidoIds: Array<string | number>;
};

export type EmitirListaSeparacaoResult = {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  pedidos: string[];
  parsedOutput?: Record<string, unknown> | null;
};

function parseBooleanEnv(value: string | undefined, fallback = false) {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function sanitizePedidoIds(pedidoIds: Array<string | number>) {
  return pedidoIds
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .map((value) => value.replace(/\D/g, ''))
    .filter(Boolean);
}

function getProjectRoot() {
  return process.cwd();
}

function getPythonCommand() {
  return process.env.ERP_AUTOMATION_PYTHON?.trim() || 'python';
}

function getScriptPath() {
  const customPath = process.env.ERP_AUTOMATION_SCRIPT?.trim();
  return customPath
    ? path.resolve(customPath)
    : path.join(getProjectRoot(), 'scripts', 'erp_emitir_lista_separacao.py');
}

function parseJsonFromStdout(stdout: string) {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]) as Record<string, unknown>;
    } catch {
      continue;
    }
  }

  return null;
}

export async function emitirListaSeparacaoNoErp(
  input: EmitirListaSeparacaoInput
): Promise<EmitirListaSeparacaoResult> {
  const pedidos = sanitizePedidoIds(input.pedidoIds);

  if (pedidos.length === 0) {
    throw new Error('Informe ao menos um pedido para emitir a lista de separacao.');
  }

  if (!parseBooleanEnv(process.env.ERP_AUTOMATION_ENABLED)) {
    throw new Error(
      'Automacao ERP desativada. Configure ERP_AUTOMATION_ENABLED=1 no ambiente local do servidor.'
    );
  }

  const pythonCommand = getPythonCommand();
  const scriptPath = getScriptPath();
  const timeoutMs = Math.max(
    10_000,
    Number(process.env.ERP_AUTOMATION_TIMEOUT_MS || 180_000) || 180_000
  );
  const args = [scriptPath, '--pedidos-json', JSON.stringify(pedidos)];
  const env = {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
  };

  return new Promise<EmitirListaSeparacaoResult>((resolve, reject) => {
    const child = spawn(pythonCommand, args, {
      cwd: getProjectRoot(),
      env,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(
        new Error(
          `A automacao do ERP excedeu o tempo limite de ${Math.round(timeoutMs / 1000)}s.`
        )
      );
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `Falha ao iniciar o Python para automacao do ERP: ${error.message}`
        )
      );
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const parsedOutput = parseJsonFromStdout(stdout);
      resolve({
        ok: code === 0,
        code,
        stdout,
        stderr,
        pedidos,
        parsedOutput,
      });
    });
  });
}
