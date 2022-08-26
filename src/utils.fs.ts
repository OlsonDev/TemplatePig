import _ from './utils.lodash'
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import { normalize } from 'node:path'
import * as vscode from 'vscode'

export const toFileUri = (path: string) =>
  vscode.Uri.file(normalize(path))

export const getFileContent = (path: vscode.Uri) => {
  try {
    return readFileSync(path.fsPath, { encoding: 'utf8' })
  } catch (ex) {
    return null
  }
}

export const isExistingDirectory = (path: string | vscode.Uri | null) => {
  if (path === null) return false
  path = typeof path === 'string' ? path : path.fsPath
  return existsSync(path) && lstatSync(path).isDirectory()
}

export const getFolderContents = (uri: vscode.Uri) => {
  const dirents = readdirSync(uri.fsPath, { withFileTypes: true })
  const allPaths = dirents.map((dirent) => dirent.isDirectory()
    ? getFolderContents(vscode.Uri.joinPath(uri, dirent.name))
    : [{
      type: 'file',
      uri: vscode.Uri.joinPath(uri, dirent.name),
      content: getFileContent(vscode.Uri.joinPath(uri, dirent.name)),
    }]
  )

  return allPaths.length
    ? allPaths.flat(Infinity)
    : [{ type: 'dir', uri, content: null }]
}

export const getRelativePath = (ancestor: vscode.Uri, descendant: vscode.Uri) => {
  const afsPath = ancestor.fsPath
  const dfsPath = descendant.fsPath
  const regex = new RegExp(`^${_.escapeRegExp(afsPath)}[/\\\\]`)
  return dfsPath.replace(regex, '')
}