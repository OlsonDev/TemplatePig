import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "template-pig" is now active!');
	let disposable = vscode.commands.registerCommand('template-pig.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from TemplatePig!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}