import * as vscode from 'vscode'
import cmdNewTemplate from './cmd.newTemplate'
import cmdUseTemplate from './cmd.useTemplate'

export function activate(context: vscode.ExtensionContext) {
  console.log('Template Pig: Activated.')
  const newTemplate = vscode.commands.registerCommand('template-pig.newTemplate', cmdNewTemplate)
  const useTemplate = vscode.commands.registerCommand('template-pig.useTemplate', cmdUseTemplate)

  context.subscriptions.push(newTemplate)
  context.subscriptions.push(useTemplate)
}

export function deactivate() { }