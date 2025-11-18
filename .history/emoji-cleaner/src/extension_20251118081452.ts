import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Emoji}\u200d]+/gu;

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

    // Read settings
    const cfg = vscode.workspace.getConfiguration('emojiCleaner');
    const ignoreGlobs: string[] = cfg.get('ignore', ['**/node_modules/**', '**/.git/**', '**/dist/**']);
    const fileExts: string[] = cfg.get('fileExtensions', ['.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.md', '.txt', '.yml', '.yaml']);
    const dryRun: boolean = cfg.get('dryRun', false);

    // Build include glob for findFiles: e.g. **/*.{js,ts,md}
    const extPattern = fileExts.map(e => e.replace(/^\./, '')).join(',');
    const includeGlob = `**/*.{${extPattern}}`;
    const excludeGlob = `{${ignoreGlobs.join(',')}}`;

    output.appendLine(`Include glob: ${includeGlob}`);
    output.appendLine(`Exclude glob: ${excludeGlob}`);
    output.appendLine(`Dry run: ${dryRun ? 'ON' : 'OFF'}`);

    // Use VS Code file search (handles workspace multi-root and excludes)
    const uris = await vscode.workspace.findFiles(includeGlob, excludeGlob);

    output.appendLine(`Found ${uris.length} files to check.`);

    let totalFilesChanged = 0;
    for (const uri of uris) {
      try {
        const filePath = uri.fsPath;
        const ext = path.extname(filePath).toLowerCase();

        // Read file text
        const raw = await fs.readFile(filePath, { encoding: 'utf8' });

        let cleaned = raw;
        if (ext === '.json') {
          // Safe JSON sanitize: parse and only mutate string values
          try {
            const parsed = JSON.parse(raw);
            const mutated = sanitizeJsonStrings(parsed, s => s.replace(EMOJI_REGEX, ''));

            // If changed, stringify with two-space indent to be friendly
            cleaned = JSON.stringify(mutated, null, 2) + '\n';
          } catch (jsonErr) {
            // If JSON parse fails, fallback to text replace but log a warning
            output.appendLine(`Warning: failed to parse JSON ${filePath}. Falling back to text replace.`);
            cleaned = raw.replace(EMOJI_REGEX, '');
          }
        } else {
          // For normal text files, simple replace
          cleaned = raw.replace(EMOJI_REGEX, '');
        }

        if (cleaned !== raw) {
          totalFilesChanged++;
          if (dryRun) {
            output.appendLine(`[DRY RUN] Would change: ${filePath}`);
          } else {
            await fs.writeFile(filePath, cleaned, { encoding: 'utf8' });
            output.appendLine(`Updated: ${filePath}`);
          }
        }
      } catch (err) {
        output.appendLine(`Error processing ${uri.fsPath}: ${String(err)}`);
      }
    }

    output.appendLine(`Done. Files changed: ${totalFilesChanged}`);
    output.show(true);

    vscode.window.showInformationMessage(`Emoji Cleaner done — ${totalFilesChanged} files changed${dryRun ? ' (dry run)' : ''}.`);
  });

  context.subscriptions.push(disposable);
}

/**
 * Recursively sanitize only string values inside JSON-like objects/arrays.
 * The callback receives the string and should return the sanitized string.
 */
function sanitizeJsonStrings(obj: any, sanitizeFn: (s: string) => string): any {
  if (typeof obj === 'string') {
    return sanitizeFn(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeJsonStrings(item, sanitizeFn));
  }
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const key of Object.keys(obj)) {
      out[key] = sanitizeJsonStrings(obj[key], sanitizeFn);
    }
    return out;
  }
  // numbers, booleans, null remain unchanged
  return obj;
}

export function deactivate() {}
