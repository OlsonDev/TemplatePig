import { existsSync, mkdirSync } from 'node:fs'
import { isExistingDirectory, toFileUri } from './utils.fs'
import * as vscode from 'vscode'

export const readConfig = (key: string): any => vscode.workspace.getConfiguration('templatePig').get(key)
export const showInfo = (message: string, options = {}, ...items) => vscode.window.showInformationMessage(`Template Pig » ${message}`, options, ...items)
export const showError = (message: string, options = {}, ...items) => vscode.window.showErrorMessage(`Template Pig » ${message}`, options, ...items)
export const showException = (ex, templateName, whileDoing, badUri) => {
  const lines = [`${templateName} » Uncaught exception while ${whileDoing}:`]
  if (ex.message) lines.push(ex.message)
  if (ex.stack) lines.push(ex.stack)
  if (!ex.message && !ex.stack) lines.push(ex.toString())
  const openFile = `Open file ${badUri.fsPath.replace(/.*?([^\\]*)$/, '$1')}`
  const copyStack = 'Copy stack trace'
  const btns = []
  btns.push(openFile)
  if (ex.stack) btns.push(copyStack)
  showError(lines.join('\n'), null, ...btns).then(selection => {
    switch (selection) {
      case openFile:
        vscode.window.showTextDocument(badUri, { preview: false })
        break
      case copyStack:
        vscode.env.clipboard.writeText(ex.stack)
        break
    }
    return false
  })
}

const parentFolderOfActiveFile = () => {
  const currentFolderUri = vscode.window.activeTextEditor?.document?.uri
    ?.toString()
    ?.replace(/\/([^/]+)$/, '')
  return currentFolderUri ? vscode.Uri.parse(currentFolderUri, true) : null
}

export const getWorkspaceUriAsync = async () => {
  const folders = vscode.workspace.workspaceFolders ?? []
  if (folders.length > 1) {
    const workspace = await vscode.window.showWorkspaceFolderPick({ placeHolder: 'Which workspace would you like to use a template in?' })
    return workspace?.uri
  }
  return folders[0]?.uri
}

export const getTargetUriAsync = async (resource: vscode.Uri | string | undefined, workspaceUri: vscode.Uri | undefined) => {
  if (typeof resource === 'string') {
    if (resource === '__current') return parentFolderOfActiveFile()
    if (!workspaceUri) {
      vscode.window.showErrorMessage(`Couldn’t find workspace.`)
      return
    }
    return vscode.Uri.parse(`${workspaceUri}/${resource}`)
  }
  if (!resource && vscode.workspace.workspaceFolders) {
    // if command is triggered via command box and not via context menu let user enter path where component should be created
    const filePath = await vscode.window.showInputBox({ placeHolder: 'Enter a path relative to project root where your template should be created' })
    return vscode.Uri.parse(`${workspaceUri}/${filePath}`, true)
  }

  return resource as vscode.Uri | undefined
}

export const openAndSaveFileAsync = async (uri: vscode.Uri | null) => {
  if (!uri) return
  const document = await vscode.workspace.openTextDocument(uri)
  await document.save()
}

export const openFile = async (filePath: string) => {
  if (existsSync(filePath)) await vscode.window.showTextDocument(vscode.Uri.file(filePath), { preview: false })
}

export const getLocalTemplatePathAsync = async (resourceUri: vscode.Uri | undefined) => {
  const configTemplatesPath = readConfig('templatesPath') || '.templates'
  const workspace = resourceUri
    ? vscode.workspace.getWorkspaceFolder(resourceUri)
    : await vscode.window.showWorkspaceFolderPick({ placeHolder: 'Pick the workspace in which you would like to create the template' })
  if (!workspace) return null
  const templatesPath = vscode.Uri.joinPath(workspace.uri, configTemplatesPath)
  return isExistingDirectory(templatesPath) ? templatesPath : null
}

export const getGlobalTemplatePath = () => {
  const configuredPath = readConfig('globalTemplatesPath')
  return configuredPath ? toFileUri(configuredPath) : null
}

const start = new vscode.Position(0, 0)
const end = new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
const range = new vscode.Range(start, end)
const createFileOrDirectoryAsync = async (item, context, paths) => {
  if (item.dirent.isDirectory()) {
    mkdirSync(item.absoluteDestinationFilePath.fsPath, { recursive: true })
    return
  }

  const wsEdit = new vscode.WorkspaceEdit()
  // VS Code will automatically make the necessary folders.
  const newPath = item.absoluteDestinationFilePath
  if (existsSync(newPath.fsPath)) {
    wsEdit.replace(newPath, range, item.renderedContent)
  } else {
    wsEdit.createFile(newPath)
    wsEdit.insert(newPath, start, item.renderedContent)
  }
  
  await vscode.workspace.applyEdit(wsEdit)
  await openAndSaveFileAsync(item.absoluteDestinationFilePath)
  if (context.pig.shouldOpenDocument(item.slimItem, context, paths)) {
    await openDocumentAsync(item.absoluteDestinationFilePath)
  } else {
    // If saving the document takes > 50ms, it'll be opened automatically.
    // This is a decent attempt to close it. If it's already closed, this will do nothing.
    await closeDocumentAsync(item.absoluteDestinationFilePath)
  }
}

const openDocumentAsync = async (uri: vscode.Uri) => {
  const document = await vscode.workspace.openTextDocument(uri)
  await vscode.window.showTextDocument(document, { preview: false, preserveFocus: true })
}

const closeDocumentAsync = async (uri: vscode.Uri) => {
  const document = await vscode.workspace.openTextDocument(uri)
  if (document.isClosed) return
  await vscode.window.showTextDocument(document, { preview: true, preserveFocus: false })
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
}

export const createTemplateContentsAsync = async (templateContents: any[], template, paths) => {
  if (!templateContents) return
  for (const item of templateContents) {
    await createFileOrDirectoryAsync(item, template.context, paths)
  }
}