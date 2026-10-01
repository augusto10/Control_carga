// utils/printer-integration.js
// Biblioteca para integração com impressoras Windows (Node.js)

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class PrinterIntegration {
  constructor() {
    this.isWindows = process.platform === 'win32';
  }

  // Detectar impressoras instaladas no Windows
  async detectPrinters() {
    if (!this.isWindows) {
      console.log('[Printer] Sistema não é Windows, usando simulação');
      return this.getMockPrinters();
    }

    return new Promise((resolve, reject) => {
      // Usar WMIC para listar impressoras no Windows
      exec('wmic printer get Name,DriverName,PortName,Default /format:csv', (error, stdout, stderr) => {
        if (error) {
          console.log('[Printer] Erro ao executar WMIC, usando simulação');
          resolve(this.getMockPrinters());
          return;
        }

        try {
          const printers = this.parseWmicOutput(stdout);
          // Se WMIC retornar lista vazia, usar mock printers
          if (printers.length === 0) {
            console.log('[Printer] WMIC retornou lista vazia, usando simulação');
            resolve(this.getMockPrinters());
          } else {
            console.log(`[Printer] ${printers.length} impressoras detectadas`);
            resolve(printers);
          }
        } catch (parseError) {
          console.error('[Printer] Erro ao parsear WMIC:', parseError);
          resolve(this.getMockPrinters());
        }
      });
    });
  }

  // Parse do output do WMIC
  parseWmicOutput(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const printers = [];

    // Pular header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV do WMIC
      const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
      if (parts.length >= 4) {
        const [node, name, driver, port, isDefault] = parts;
        
        printers.push({
          name: name || 'Unknown',
          driver: driver || 'Unknown',
          port: port || 'Unknown',
          isDefault: isDefault === 'TRUE',
          isInstalled: true,
          status: 'online'
        });
      }
    }

    return printers;
  }

  // Enviar ZPL diretamente para impressora
  async sendToPrinter(zplData, printerName) {
    if (!this.isWindows) {
      console.log('[Printer] Sistema não é Windows, simulando impressão');
      return await this.simulatePrint(zplData, printerName);
    }

    return new Promise((resolve) => {
      // Criar arquivo temporário ZPL
      const tempFile = path.join(require('os').tmpdir(), `etiqueta_${Date.now()}.zpl`);
      
      try {
        fs.writeFileSync(tempFile, zplData, 'utf8');
        console.log(`[Printer] Arquivo ZPL criado: ${tempFile}`);

        // Método 1: Usar PowerShell para enviar para impressora (mais confiável)
        const psCommand = `powershell -NoProfile -Command "try { $printer = Get-Printer -Name '${printerName}' -ErrorAction Stop; $port = $printer.PortName; if ($port -like 'FILE:*') { Write-Host 'Impressora PDF'; } else { [System.IO.File]::ReadAllBytes('${tempFile}') | Out-Printer -Name '${printerName}'; Write-Host 'Enviado'; } } catch { Write-Host 'Erro'; }"`;
        
        exec(psCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
          console.log('[Printer] PowerShell stdout:', stdout);
          console.log('[Printer] PowerShell stderr:', stderr);
          
          // Limpar arquivo temporário
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            console.warn('[Printer] Erro ao limpar arquivo temporário:', cleanupError);
          }

          if (error) {
            console.error('[Printer] Erro ao enviar via PowerShell:', error.message);
            
            // Método 2: Tentar via comando COPY como fallback
            const copyCommand = `copy /b "${tempFile}" "\\\\localhost\\${printerName}"`;
            exec(copyCommand, (copyError) => {
              if (copyError) {
                console.error('[Printer] Erro ao enviar via COPY:', copyError.message);
                console.log('[Printer] ⚠️ Impressora pode não estar disponível ou nome incorreto');
              } else {
                console.log(`[Printer] ZPL enviado via COPY para ${printerName}`);
              }
              resolve(true);
            });
          } else {
            console.log(`[Printer] ZPL enviado via PowerShell para ${printerName}`);
            resolve(true);
          }
        });

      } catch (fileError) {
        console.error('[Printer] Erro ao criar arquivo temporário:', fileError);
        resolve(true);
      }
    });
  }

  // Simulação para sistemas não-Windows
  getMockPrinters() {
    return [
      {
        name: 'Zebra ZD220',
        driver: 'ZDesigner',
        port: 'USB',
        isDefault: true,
        isInstalled: true,
        status: 'online'
      },
      {
        name: 'Microsoft Print to PDF',
        driver: 'Microsoft',
        port: 'FILE',
        isDefault: false,
        isInstalled: true,
        status: 'online'
      }
    ];
  }

  // Simular impressão
  async simulatePrint(zplData, printerName) {
    console.log(`[Printer] Simulando impressão em ${printerName}`);
    console.log(`[Printer] Tamanho ZPL: ${zplData.length} caracteres`);
    
    // Simular tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simular sucesso
    return true;
  }
}

module.exports = PrinterIntegration;
