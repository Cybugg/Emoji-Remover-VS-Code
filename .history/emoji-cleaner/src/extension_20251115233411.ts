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
	)

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "emoji-cleaner" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('emoji-cleaner.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from emoji-cleaner!');
	});

	context.subscriptions.push(disposable);
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
