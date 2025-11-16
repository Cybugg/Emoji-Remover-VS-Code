// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path from 'path';
import fs from 'fs';
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const command = vscode.commands.registerCommand(
        'emoji-cleaner.removeEmojis',
        async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;

            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace is open.');
                return;
            }

            const rootPath = workspaceFolders[0].uri.fsPath;

            vscode.window.showInformationMessage('Removing emojis from project...');

            const files = getAllFiles(rootPath);
            const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\u200d]+/gu;

            for (const file of files) {
                if (!isTextFile(file)){ continue};

                try {
                    const content = fs.readFileSync(file, 'utf8');
                    const cleaned = content.replace(emojiRegex, '');

                    if (cleaned !== content) {
                        fs.writeFileSync(file, cleaned, 'utf8');
                    }
                } catch (err) {
                    console.error('Error processing file:', file, err);
                }
            }

            vscode.window.showInformationMessage('All emojis removed successfully.');
        }
    );

    context.subscriptions.push(command);
}





/**
 * Recursively retrieves all files in the workspace directory.
 */
function getAllFiles(dir: string): string[] {
    let results: string[] = [];

    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            results = results.concat(getAllFiles(fullPath));
        } else {
            results.push(fullPath);
        }
    }

    return results;
}
/**
 * Determines if a file is a supported text file.
 */
function isTextFile(filePath: string): boolean {
    const exts = ['.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.md', '.txt', '.yml', '.yaml'];
    return exts.includes(path.extname(filePath).toLowerCase());
}


// This method is called when your extension is deactivated
export function deactivate() {}
