import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

// *** SAFE EMOJI-ONLY REGEX || Can use emoji-regex library in the future tho ***
const EMOJI_REGEX =
  /(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u{1F1E6}-\u{1F1FF}])+/gu;

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Emoji Cleaner');
  context.subscriptions.push(output);

  const disposable = vscode.commands.registerCommand('emoji-cleaner.removeEmojis', async () => {
    output.clear();
    output.appendLine('Emoji Cleaner: starting...');

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder open.');
      return;
    }

    const cfg = vscode.workspace.getConfiguration('emojiCleaner');

    const ignoreGlobs: string[] = cfg.get('ignore', [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.next/**'
    ]);

    const fileExts: string[] = cfg.get('fileExtensions', [
      '.js',
      '.ts',
      '.tsx',
      '.jsx',
      '.json',
      '.html',
      '.css',
      '.md',
      '.txt',
      '.yml',
      '.yaml'
    ]);

    const dryRun: boolean = cfg.get('dryRun', false);

    const extPattern = fileExts.map(e => e.replace(/^\./, '')).join(',');
    const includeGlob = `**/*.{${extPattern}}`;

    output.appendLine(`Include: ${includeGlob}`);
    output.appendLine(`Excluding: ${ignoreGlobs.join(', ')}`);

    // FIX: findFiles accepts array of globs in "exclude"
    const uris = await vscode.workspace.findFiles(includeGlob, `{${ignoreGlobs.join(',')}}`);

    output.appendLine(`Found ${uris.length} files.`);

    let totalFilesChanged = 0;

    for (const uri of uris) {
      try {
        const filePath = uri.fsPath;
        const ext = path.extname(filePath).toLowerCase();

        const raw = await fs.readFile(filePath, 'utf8');
        let cleaned = raw;

        if (ext === '.json') {
          try {
            const parsed = JSON.parse(raw);
            const mutated = sanitizeJson(parsed, s => s.replace(EMOJI_REGEX, ''));
            cleaned = JSON.stringify(mutated, null, 2) + '\n';
          } catch {
            output.appendLine(`JSON parse failed, falling back to text replace: ${filePath}`);
            cleaned = raw.replace(EMOJI_REGEX, '');
          }
        } else {
          cleaned = raw.replace(EMOJI_REGEX, '');
        }

        if (cleaned !== raw) {
          totalFilesChanged++;
          if (!dryRun) {
            await fs.writeFile(filePath, cleaned, 'utf8');
          }
          output.appendLine(`${dryRun ? '[DRY RUN] Would update' : 'Updated'}: ${filePath}`);
        }
      } catch (err) {
        output.appendLine(`Error: ${uri.fsPath} → ${String(err)}`);
      }
    }

    output.appendLine(`Done. ${totalFilesChanged} files changed.`);
    vscode.window.showInformationMessage(
      `Emoji Cleaner finished — ${totalFilesChanged} files cleaned${dryRun ? ' (dry run)' : ''}.`
    );
    output.show(true);
  });

  context.subscriptions.push(disposable);
}

/** FIX: sanitize keys + values */
function sanitizeJson(obj: any, fn: (s: string) => string): any {
  if (typeof obj === 'string') return fn(obj);
  if (Array.isArray(obj)) return obj.map(i => sanitizeJson(i, fn));

  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const key of Object.keys(obj)) {
      const cleanKey = fn(key); // sanitize key
      out[cleanKey] = sanitizeJson(obj[key], fn); // sanitize value
    }
    return out;
  }

  return obj; // numbers, null, booleans untouched
}

export function deactivate() {}
