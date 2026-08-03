import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

@Controller('disk-usage')
@UseGuards(AuthGuard('jwt'))
export class DiskController {
  private readonly logger = new Logger(DiskController.name);

  @Get()
  async getDiskUsage() {
    try {
      const { stdout } = await execFileAsync('df', ['-k', '/data']);
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const parts = lastLine.split(/\s+/);
      const totalKb = parseInt(parts[1], 10);
      const usedKb = parseInt(parts[2], 10);
      const availKb = parseInt(parts[3], 10);
      const percent = parseFloat(parts[4].replace('%', ''));
      return {
        total: totalKb * 1024,
        used: usedKb * 1024,
        available: availKb * 1024,
        percent,
        label: `${percent.toFixed(1)}% usado (${(usedKb / 1024 / 1024).toFixed(1)} GB / ${(totalKb / 1024 / 1024).toFixed(1)} GB)`,
      };
    } catch (err: any) {
      this.logger.warn(`df failed, trying os.totalmem fallback: ${err.message}`);
      const mem = process.memoryUsage();
      return {
        total: 0,
        used: 0,
        available: 0,
        percent: 0,
        label: 'Indisponível',
      };
    }
  }
}
