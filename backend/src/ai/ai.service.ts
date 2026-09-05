import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

@Injectable()
export class AiService {
  generatePools(players: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonPath = 'python'; // or 'python3' if needed

      const scriptPath = path.join(
        process.cwd(),
        'ai-engine',
        'karate_pooling.py',
      );

      const processPy = spawn(pythonPath, [scriptPath]);

      let output = '';
      let errorOutput = '';

      // Send input to Python
      processPy.stdin.write(JSON.stringify(players));
      processPy.stdin.end();

      processPy.stdout.on('data', (data) => {
        output += data.toString();
      });

      processPy.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      processPy.on('close', (code) => {
        if (code !== 0) {
          return reject(errorOutput);
        }

        try {
          const parsed = JSON.parse(output);
          resolve(parsed);
        } catch (e) {
          reject('Invalid JSON from AI engine');
        }
      });
    });
  }
}
