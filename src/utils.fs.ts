import { existsSync, lstatSync, readFileSync } from 'node:fs'
import { normalize } from 'node:path'
import { opendir } from 'node:fs/promises'
import * as _ from 'lodash'
import * as vscode from 'vscode'

export const toFileUri = (path: string) =>
  vscode.Uri.file(normalize(path))

export const getFileContent = (uri: vscode.Uri) => {
  try {
    return readFileSync(uri.fsPath, { encoding: 'utf8' })
  } catch (ex) {
    return null
  }
}

export const isExistingDirectory = (path: string | vscode.Uri | null) => {
  if (path === null) return false
  path = typeof path === 'string' ? path : path.fsPath
  return existsSync(path) && lstatSync(path).isDirectory()
}

export async function* getFolderContents(directoryUri: vscode.Uri) {
  for await (const dirent of await opendir(directoryUri.fsPath)) {
    const uri = vscode.Uri.joinPath(directoryUri, dirent.name)
    // If a directory has yieldable items, don't bother yielding the directory itself.
    // yieldable items are subdirectories and files, excluding .pig.js, .pignore, and .pigignore files.
    if (dirent.isDirectory()) {
      let yielded = false
      const items = getFolderContents(uri)
      for await (const content of items) {
        yield content
        yielded = true
      }
      if (!yielded) yield { uri, dirent, content: null }
    } else if (dirent.isFile() && !['.pig.js', '.pignore', '.pigignore'].includes(dirent.name.toLowerCase())) {
      yield {
        uri,
        dirent,
        get content() { return getFileContent(uri) }
      }
    }
  }
}

export const getRelativePath = (ancestorUri: vscode.Uri, descendantUri: vscode.Uri) => {
  const afsPath = ancestorUri.fsPath
  const dfsPath = descendantUri.fsPath
  const regex = new RegExp(`^${_.escapeRegExp(afsPath)}[/\\\\]`)
  return dfsPath.replace(regex, '')
}