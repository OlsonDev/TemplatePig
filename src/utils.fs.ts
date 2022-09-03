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

// Folders are considered empty if they only contain files that would otherwise
// be excluded via `excludeFiles`, which defaults to Template Pig files (.pig.js, .pignore, .pigignore)
// By default, only empty folders are yielded. If you set `yieldNonEmptyFolders` to true, then
// all folders will be yielded.
export const getFolderContents = (
  directoryUri: vscode.Uri,
  {
    yieldNonEmptyFolders = false,
    excludeFiles = ['.pig.js', '.pignore', '.pigignore'],
  } = {}
) => getFolderContentsImpl(directoryUri, { yieldNonEmptyFolders, excludeFiles })

async function* getFolderContentsImpl(directoryUri: vscode.Uri, options) {
  for await (const dirent of await opendir(directoryUri.fsPath)) {
    const uri = vscode.Uri.joinPath(directoryUri, dirent.name)
    if (dirent.isDirectory()) {
      let yielded = false
      const items = getFolderContentsImpl(uri, options)
      for await (const item of items) {
        if (!yielded && options.yieldNonEmptyFolders) yield { uri, dirent, content: null }
        yielded = true
        yield item
      }
      if (!yielded) yield { uri, dirent, content: null }
    } else if (dirent.isFile() && !options.excludeFiles.includes(dirent.name.toLowerCase())) {
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